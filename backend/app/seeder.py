"""Production-ready demo and testing data seeder and cleaner for EventXTracker.

Allows realistic testing data (events, forms, teams, attendees, winners, and test accounts)
to be visible in production during evaluation, and provides a clean one-click purge mechanism
to remove all seeded data when transitioning to real institutional operation.
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from .models import (
    User, StudentProfile, FacultyProfile, Department, AccountType, AccountStatus,
    HODAssignment, ClassTeacherAssignment, Event, EventStatus, EventCoordinator,
    EventLeadership, EventForm, FormVersion, Registration, Team, TeamStatus,
    TeamInvitation, VolunteerApplication, VolunteerAssignment, Attendance, Winner,
    AuditLog, BRANCHES, utcnow
)
from .security import hash_password

logger = logging.getLogger("eventxtracker.seeder")

BATCH_NAME = "demo-test-batch"

# Standard test credentials (easy to test and demo)
DEMO_PASSWORDS = {
    "AUTHORITY": "authority123",
    "FACULTY": "faculty123",
    "STUDENT": "student123",
}

DEPARTMENT_NAMES = {
    "CSE": "Computer Science & Engineering",
    "ISE": "Information Science & Engineering",
    "AIML": "AI & Machine Learning",
    "EC": "Electronics & Communication",
    "EEE": "Electrical & Electronics",
    "ME": "Mechanical Engineering",
    "CV": "Civil Engineering",
}


def ensure_departments(db: Session):
    for code, name in DEPARTMENT_NAMES.items():
        if not db.query(Department).filter_by(code=code).first():
            db.add(Department(code=code, name=name))
    db.commit()


def seed_demo_dataset(db: Session, force: bool = False) -> dict:
    """Seeds realistic VVCE campus data for production preview and evaluation."""
    ensure_departments(db)
    depts = {d.code: d for d in db.query(Department).all()}

    # Check if already seeded and not force
    existing_events = db.query(Event).filter_by(is_seeded=True).count()
    if existing_events > 0 and not force:
        return {
            "status": "already_seeded",
            "message": "Demo dataset is already active in database.",
            "seeded_events": existing_events,
            "seeded_users": db.query(User).filter_by(is_seeded=True).count(),
        }

    now = datetime.now(timezone.utc)

    # 1. Authority Account (if none exists)
    auth_user = db.query(User).filter_by(account_type=AccountType.AUTHORITY).first()
    if not auth_user:
        auth_user = User(
            email="authority@vvce.ac.in",
            password_hash=hash_password(DEMO_PASSWORDS["AUTHORITY"]),
            account_type=AccountType.AUTHORITY,
            status=AccountStatus.ACTIVE,
            must_change_password=False,
            is_seeded=True,
            seed_batch=BATCH_NAME,
        )
        db.add(auth_user)
        db.flush()
    elif force and auth_user.email == "authority@vvce.ac.in":
        auth_user.password_hash = hash_password(DEMO_PASSWORDS["AUTHORITY"])
        auth_user.status = AccountStatus.ACTIVE
        auth_user.must_change_password = False

    # 2. Key Faculty Accounts
    faculty_definitions = [
        ("faccse01@vvce.ac.in", "Dr. Rajesh Sharma", "CSE", "Professor & HOD", True),
        ("faccse02@vvce.ac.in", "Prof. Priya Kulkarni", "CSE", "Assistant Professor", False),
        ("facaiml01@vvce.ac.in", "Dr. Suresh Hegde", "AIML", "Professor & HOD", True),
        ("facaiml02@vvce.ac.in", "Prof. Kiran Bhat", "AIML", "Assistant Professor", False),
        ("facise01@vvce.ac.in", "Dr. Ananya Rao", "ISE", "Professor & HOD", True),
        ("facec01@vvce.ac.in", "Dr. Vikram Shetty", "EC", "Professor & HOD", True),
        ("faceee01@vvce.ac.in", "Dr. Ramesh Bhat", "EEE", "Professor & HOD", True),
        ("facme01@vvce.ac.in", "Dr. Mohan Kumar", "ME", "Professor & HOD", True),
        ("faccv01@vvce.ac.in", "Dr. Srinivas Joshi", "CV", "Professor & HOD", True),
    ]

    faculty_users = {}
    for email, name, dept_code, desig, is_hod in faculty_definitions:
        u = db.query(User).filter_by(email=email).first()
        if not u:
            u = User(
                email=email,
                password_hash=hash_password(DEMO_PASSWORDS["FACULTY"]),
                account_type=AccountType.FACULTY,
                status=AccountStatus.ACTIVE,
                must_change_password=False,
                is_seeded=True,
                seed_batch=BATCH_NAME,
            )
            db.add(u)
            db.flush()
            prof = FacultyProfile(
                user_id=u.id,
                full_name=name,
                department_id=depts[dept_code].id,
                designation=desig,
            )
            db.add(prof)
            if is_hod:
                # Remove any existing active HOD for this department to avoid duplicate
                db.query(HODAssignment).filter_by(department_id=depts[dept_code].id, active=True).update({"active": False})
                db.add(HODAssignment(department_id=depts[dept_code].id, faculty_user_id=u.id, assigned_by=auth_user.id or u.id, active=True))
        faculty_users[email] = u

    # 3. Key Student Accounts
    student_definitions = [
        ("vvcecse0001@vvce.ac.in", "Sara Sharma", "1VV236CSE001", "CSE", 5, "A"),
        ("vvcecse0002@vvce.ac.in", "Diya Patel", "1VV236CSE002", "CSE", 5, "A"),
        ("vvcecse0003@vvce.ac.in", "Vihaan Reddy", "1VV236CSE003", "CSE", 5, "A"),
        ("vvcecse0004@vvce.ac.in", "Ananya Nair", "1VV236CSE004", "CSE", 5, "A"),
        ("vvcecse0005@vvce.ac.in", "Arjun Shetty", "1VV236CSE005", "CSE", 5, "A"),
        ("vvce23cse0001@vvce.ac.in", "Sara Sharma (2023)", "1VV236CSE011", "CSE", 5, "A"),
        ("vvce23cse0002@vvce.ac.in", "Diya Patel (2023)", "1VV236CSE012", "CSE", 5, "A"),
        ("vvce23cse0003@vvce.ac.in", "Vihaan Reddy (2023)", "1VV236CSE013", "CSE", 5, "A"),
        ("vvce23cse0004@vvce.ac.in", "Ananya Nair (2023)", "1VV236CSE014", "CSE", 5, "A"),
        ("vvce23cse0005@vvce.ac.in", "Arjun Shetty (2023)", "1VV236CSE015", "CSE", 5, "A"),
        ("vvce23aiml0001@vvce.ac.in", "Meera Joshi", "1VV236AIML001", "AIML", 5, "A"),
        ("vvce23aiml0002@vvce.ac.in", "Rahul Rao", "1VV236AIML002", "AIML", 5, "A"),
        ("vvce23ise0001@vvce.ac.in", "Kiran Bhat", "1VV236ISE001", "ISE", 5, "A"),
        ("vvce23ec0001@vvce.ac.in", "Priya Reddy", "1VV236EC001", "EC", 5, "A"),
        ("vvce23eee0001@vvce.ac.in", "Aditya Hegde", "1VV236EEE001", "EEE", 5, "A"),
        ("vvce23me0001@vvce.ac.in", "Tanvi Deshmukh", "1VV236ME001", "ME", 5, "A"),
        ("vvce23cv0001@vvce.ac.in", "Rohan Patil", "1VV236CV001", "CV", 5, "A"),
    ]

    student_users = {}
    for email, name, usn, dept_code, sem, sec in student_definitions:
        u = db.query(User).filter_by(email=email).first()
        if not u:
            u = User(
                email=email,
                password_hash=hash_password(DEMO_PASSWORDS["STUDENT"]),
                account_type=AccountType.STUDENT,
                status=AccountStatus.ACTIVE,
                must_change_password=False,
                is_seeded=True,
                seed_batch=BATCH_NAME,
            )
            db.add(u)
            db.flush()
            prof = StudentProfile(
                user_id=u.id,
                full_name=name,
                usn=usn,
                department_id=depts[dept_code].id,
                joining_year=2023,
                current_semester=sem,
                section=sec,
            )
            db.add(prof)
        student_users[email] = u

    # Class Teacher Assignments
    for dept_code in BRANCHES:
        fac = db.query(FacultyProfile).filter_by(department_id=depts[dept_code].id).first()
        if fac:
            for sem in [1, 3, 5, 7]:
                if not db.query(ClassTeacherAssignment).filter_by(department_id=depts[dept_code].id, semester=sem, section="A", active=True).first():
                    db.add(ClassTeacherAssignment(
                        department_id=depts[dept_code].id,
                        semester=sem,
                        section="A",
                        academic_year="2025-26",
                        faculty_user_id=fac.user_id,
                        assigned_by=fac.user_id,
                        active=True
                    ))
    db.commit()

    # Convenience shortcuts
    cse_hod = faculty_users.get("faccse01@vvce.ac.in")
    aiml_hod = faculty_users.get("facaiml01@vvce.ac.in")
    ise_hod = faculty_users.get("facise01@vvce.ac.in")
    ec_hod = faculty_users.get("facec01@vvce.ac.in")

    s_pres = student_users.get("vvcecse0001@vvce.ac.in") or student_users.get("vvce23cse0001@vvce.ac.in")
    s_vp = student_users.get("vvcecse0002@vvce.ac.in") or student_users.get("vvce23cse0002@vvce.ac.in")
    s_vol = student_users.get("vvcecse0003@vvce.ac.in") or student_users.get("vvce23cse0003@vvce.ac.in")
    s_part = student_users.get("vvcecse0004@vvce.ac.in") or student_users.get("vvce23cse0004@vvce.ac.in")
    s_app = student_users.get("vvcecse0005@vvce.ac.in") or student_users.get("vvce23cse0005@vvce.ac.in")

    # 4. Realistic Campus Events

    # EVENT 1: VVCE National TechFest 2026 - HackSphere 36hr Hackathon
    ev1 = db.query(Event).filter_by(name="VVCE National TechFest 2026 - HackSphere 36hr Hackathon").first()
    if not ev1:
        ev1 = Event(
            name="VVCE National TechFest 2026 - HackSphere 36hr Hackathon",
            description="The flagship national hackathon of Vidyavardhaka College of Engineering. 36 hours of non-stop coding, hardware prototyping, and innovation across AI/ML, Web3, IoT, and Healthcare tracks with ₹1,50,000 in total prizes.",
            category="Hackathon",
            event_type="Technical Fest",
            start_at=now + timedelta(days=14),
            end_at=now + timedelta(days=16),
            timezone="Asia/Kolkata",
            venue="Dr. APJ Abdul Kalam Auditorium & CSE Computing Complex, VVCE",
            reg_open_at=now - timedelta(days=5),
            reg_close_at=now + timedelta(days=10),
            individual_enabled=True,
            team_enabled=True,
            volunteer_enabled=True,
            min_team_size=2,
            max_team_size=4,
            eligible_departments="CSE,ISE,AIML,EC,EEE",
            eligible_semesters="3,5,7",
            require_same_department=False,
            registration_fee=250.0,
            upi_id="vvce.techfest@upi",
            whatsapp_group_url="https://chat.whatsapp.com/invite/VVCETechFest2026",
            payment_instructions="Scan official VVCE QR code or transfer to vvce.techfest@upi. Mention your USN and Team Name in description.",
            require_id_proof=True,
            idea_ppt_required=True,
            ppt_template_url="https://vvce.ac.in/downloads/techfest2026_ppt_template.pptx",
            selection_mode="MANUAL",
            status=EventStatus.UPCOMING,
            is_seeded=True,
            created_by=cse_hod.id,
            created_at=now - timedelta(days=5),
            updated_at=now,
        )
        db.add(ev1)
        db.flush()

        # Coordinator
        db.add(EventCoordinator(event_id=ev1.id, faculty_user_id=cse_hod.id, assigned_by=cse_hod.id))

        # Leadership: President, VP, Shortlisting Volunteer
        if s_pres:
            db.add(EventLeadership(event_id=ev1.id, student_user_id=s_pres.id, role="PRESIDENT", appointed_by=cse_hod.id, appointed_at=now - timedelta(days=4)))
        if s_vp:
            db.add(EventLeadership(event_id=ev1.id, student_user_id=s_vp.id, role="VICE_PRESIDENT", appointed_by=cse_hod.id, appointed_at=now - timedelta(days=4)))
        if s_vol:
            db.add(EventLeadership(event_id=ev1.id, student_user_id=s_vol.id, role="SHORTLISTER_VOLUNTEER", appointed_by=cse_hod.id, appointed_at=now - timedelta(days=3)))

        # Dynamic Form
        form_schema_1 = {
            "title": "HackSphere 2026 Official Registration Form",
            "description": "Please complete all mandatory questions. For team participation, only the team leader needs to submit the idea PPT.",
            "questions": [
                {
                    "id": "q1",
                    "label": "Primary Technology Track",
                    "type": "select",
                    "required": True,
                    "options": ["AI / Machine Learning", "Web3 & Decentralized Apps", "IoT & Smart Cities", "Healthcare & Assistive Tech", "Open Innovation"],
                },
                {
                    "id": "q2",
                    "label": "Project Title & Summary",
                    "type": "textarea",
                    "required": True,
                    "placeholder": "Briefly describe the problem you are solving and your proposed architectural approach...",
                },
                {
                    "id": "q3",
                    "label": "GitHub Repository / Prior Portfolio URL",
                    "type": "text",
                    "required": False,
                    "placeholder": "https://github.com/...",
                },
                {
                    "id": "q4",
                    "label": "Official College ID Card Photo",
                    "type": "file",
                    "required": True,
                    "file_types": ["image/jpeg", "image/png", "application/pdf"],
                },
            ],
        }
        ef1 = EventForm(
            event_id=ev1.id,
            title="HackSphere 2026 Application Form",
            description="Standard technical vetting form approved by CSE Department.",
            published_version=1,
            created_by=cse_hod.id,
        )
        db.add(ef1)
        db.flush()
        db.add(FormVersion(
            form_id=ef1.id,
            version=1,
            title=ef1.title,
            description=ef1.description,
            schema_json=json.dumps(form_schema_1),
        ))

        # Sample Candidate Registration
        if s_part:
            db.add(Registration(
                event_id=ev1.id,
                student_user_id=s_part.id,
                form_version=1,
                registration_id="REG-2026-0001",
                answers_json=json.dumps({"q1": "AI / Machine Learning", "q2": "Autonomous Campus Navigation system using LiDAR and ROS2", "q3": "https://github.com/vvce-student/nav"}),
                status="REGISTERED",
                phone="9876543210",
                payment_status="PENDING_PAYMENT",
                created_at=now - timedelta(days=2),
            ))

        # Sample Volunteer Application
        if s_app:
            db.add(VolunteerApplication(
                event_id=ev1.id,
                student_user_id=s_app.id,
                experience="Volunteered at VVCE TechX 2025 in logistics and student registration desks.",
                skills="Public Speaking, Desk Management, Logistics",
                preferred_area="Stage & Hospitality",
                answers_json=json.dumps({"experience": "Volunteered at VVCE TechX 2025 in logistics and student registration desks.", "tshirt": "L"}),
                status="PENDING",
            ))

    # EVENT 2: AI & Robotics Innovation Summit 2026
    ev2 = db.query(Event).filter_by(name="AI & Robotics Innovation Summit 2026").first()
    if not ev2:
        ev2 = Event(
            name="AI & Robotics Innovation Summit 2026",
            description="A premier technical symposium featuring keynote lectures from Indian Institute of Science (IISc) researchers, live humanoid robotics demonstrations, and an interactive generative AI workshop.",
            category="Conference",
            event_type="Technical Symposium",
            start_at=now + timedelta(days=25),
            end_at=now + timedelta(days=26),
            timezone="Asia/Kolkata",
            venue="Auditorium 2 & Mechanical CAD Center, VVCE",
            reg_open_at=now - timedelta(days=3),
            reg_close_at=now + timedelta(days=20),
            individual_enabled=True,
            team_enabled=False,
            volunteer_enabled=True,
            eligible_departments="AIML,CSE,ISE,EC,ME",
            eligible_semesters="1,3,5,7",
            registration_fee=0.0,
            whatsapp_group_url="https://chat.whatsapp.com/invite/AIRoboticsSummit2026",
            selection_mode="ALLOW_ALL_ELIGIBLE_REGISTRATIONS",
            status=EventStatus.UPCOMING,
            is_seeded=True,
            created_by=aiml_hod.id,
            created_at=now - timedelta(days=3),
            updated_at=now,
        )
        db.add(ev2)
        db.flush()
        db.add(EventCoordinator(event_id=ev2.id, faculty_user_id=aiml_hod.id, assigned_by=aiml_hod.id))

    # EVENT 3: Sambhrama 2026 — Annual Cultural Carnival
    ev3 = db.query(Event).filter_by(name="Sambhrama 2026 — Annual Inter-Collegiate Cultural Carnival").first()
    if not ev3:
        ev3 = Event(
            name="Sambhrama 2026 — Annual Inter-Collegiate Cultural Carnival",
            description="The grand cultural festival of Vidyavardhaka College of Engineering celebrating music, dance, theatre, classical arts, and fashion. Attracting participants across universities in Karnataka.",
            category="Cultural",
            event_type="Cultural Fest",
            start_at=now + timedelta(days=40),
            end_at=now + timedelta(days=42),
            timezone="Asia/Kolkata",
            venue="VVCE Open Air Theatre & Main Campus Lawn",
            reg_open_at=now - timedelta(days=2),
            reg_close_at=now + timedelta(days=35),
            individual_enabled=True,
            team_enabled=True,
            volunteer_enabled=True,
            min_team_size=3,
            max_team_size=8,
            eligible_departments=None,  # Open to all
            eligible_semesters=None,    # Open to all
            registration_fee=150.0,
            upi_id="vvce.sambhrama@upi",
            status=EventStatus.UPCOMING,
            is_seeded=True,
            created_by=ise_hod.id,
            created_at=now - timedelta(days=2),
            updated_at=now,
        )
        db.add(ev3)
        db.flush()
        db.add(EventCoordinator(event_id=ev3.id, faculty_user_id=ise_hod.id, assigned_by=ise_hod.id))

    # EVENT 4: VVCE Annual Inter-Departmental Sports Olympiad 2026
    ev4 = db.query(Event).filter_by(name="VVCE Annual Inter-Departmental Sports Olympiad 2026").first()
    if not ev4:
        ev4 = Event(
            name="VVCE Annual Inter-Departmental Sports Olympiad 2026",
            description="Inter-departmental championship tournament spanning Cricket, Football, Basketball, Badminton, Table Tennis, and Athletics. Represent your department to win the VVCE Chancellor's Rolling Trophy.",
            category="Sports",
            event_type="Sports Championship",
            start_at=now + timedelta(days=55),
            end_at=now + timedelta(days=58),
            timezone="Asia/Kolkata",
            venue="VVCE Sports Pavilion & Athletic Grounds",
            reg_open_at=now - timedelta(days=1),
            reg_close_at=now + timedelta(days=50),
            individual_enabled=True,
            team_enabled=True,
            volunteer_enabled=True,
            min_team_size=5,
            max_team_size=11,
            eligible_departments=None,
            eligible_semesters=None,
            require_same_department=True,
            registration_fee=0.0,
            status=EventStatus.UPCOMING,
            is_seeded=True,
            created_by=ec_hod.id,
            created_at=now - timedelta(days=1),
            updated_at=now,
        )
        db.add(ev4)
        db.flush()
        db.add(EventCoordinator(event_id=ev4.id, faculty_user_id=ec_hod.id, assigned_by=ec_hod.id))

    # EVENT 5: Cloud DevOps & AWS Hands-on Engineering Masterclass (COMPLETED)
    ev5 = db.query(Event).filter_by(name="Cloud DevOps & AWS Hands-on Engineering Masterclass").first()
    if not ev5:
        ev5 = Event(
            name="Cloud DevOps & AWS Hands-on Engineering Masterclass",
            description="Intensive 3-day hands-on workshop covering Docker containerization, Kubernetes orchestration, CI/CD pipelines with GitHub Actions, and AWS Cloud Architecture.",
            category="Workshop",
            event_type="Technical Workshop",
            start_at=now - timedelta(days=10),
            end_at=now - timedelta(days=7),
            timezone="Asia/Kolkata",
            venue="Computer Center 3 & Virtual Cloud Lab, VVCE",
            reg_open_at=now - timedelta(days=25),
            reg_close_at=now - timedelta(days=11),
            individual_enabled=True,
            team_enabled=False,
            volunteer_enabled=True,
            eligible_departments="CSE,ISE,AIML",
            eligible_semesters="5,7",
            registration_fee=100.0,
            status=EventStatus.COMPLETED,
            is_seeded=True,
            created_by=cse_hod.id,
            created_at=now - timedelta(days=25),
            updated_at=now - timedelta(days=7),
        )
        db.add(ev5)
        db.flush()
        db.add(EventCoordinator(event_id=ev5.id, faculty_user_id=cse_hod.id, assigned_by=cse_hod.id))

        # Verified Attendance & Winners for Completed Event
        if s_pres:
            db.add(Attendance(event_id=ev5.id, student_user_id=s_pres.id, status="PRESENT", marked_by=cse_hod.id, marked_at=now - timedelta(days=8)))
            db.add(Winner(event_id=ev5.id, position=1, student_user_id=s_pres.id, achievement="1st Place (Gold Medal) - Best AWS Architected Solution", updated_by=cse_hod.id))
        if s_vp:
            db.add(Attendance(event_id=ev5.id, student_user_id=s_vp.id, status="PRESENT", marked_by=cse_hod.id, marked_at=now - timedelta(days=8)))
            db.add(Winner(event_id=ev5.id, position=2, student_user_id=s_vp.id, achievement="2nd Place (Silver Medal) - Outstanding Container Performance", updated_by=cse_hod.id))
        if s_vol:
            db.add(Attendance(event_id=ev5.id, student_user_id=s_vol.id, status="PRESENT", marked_by=cse_hod.id, marked_at=now - timedelta(days=8)))
            db.add(Winner(event_id=ev5.id, position=3, student_user_id=s_vol.id, achievement="3rd Place (Bronze Medal) - Most Innovative CI/CD Automation", updated_by=cse_hod.id))

    db.add(AuditLog(actor_id=auth_user.id if auth_user else None, action="DEMO_DATA_SEEDED", entity="system", detail="Seeded 5 demo events and testing accounts"))
    db.commit()

    return {
        "status": "success",
        "message": "Demo dataset seeded successfully with 5 events, realistic leadership, forms, and test accounts.",
        "seeded_events": db.query(Event).filter_by(is_seeded=True).count(),
        "seeded_users": db.query(User).filter_by(is_seeded=True).count(),
        "accounts": {
            "authority": {"email": "authority@vvce.ac.in", "password": DEMO_PASSWORDS["AUTHORITY"]},
            "faculty": {"email": "faccse01@vvce.ac.in", "password": DEMO_PASSWORDS["FACULTY"]},
            "student_president": {"email": "vvce23cse0001@vvce.ac.in", "password": DEMO_PASSWORDS["STUDENT"]},
            "student_vp": {"email": "vvce23cse0002@vvce.ac.in", "password": DEMO_PASSWORDS["STUDENT"]},
            "student_volunteer": {"email": "vvce23cse0003@vvce.ac.in", "password": DEMO_PASSWORDS["STUDENT"]},
        }
    }


def purge_demo_dataset(db: Session, actor_id: int = None) -> dict:
    """Safely purges all demo and testing records while leaving real institutional data untouched."""
    # Find all seeded events
    seeded_event_ids = [e.id for e in db.query(Event.id).filter_by(is_seeded=True).all()]
    # Find all seeded users
    seeded_user_ids = [u.id for u in db.query(User.id).filter_by(is_seeded=True).all()]

    events_count = len(seeded_event_ids)
    users_count = len(seeded_user_ids)

    # 1. Clear records linked to seeded events or seeded users
    if seeded_event_ids:
        db.query(Winner).filter(Winner.event_id.in_(seeded_event_ids)).delete(synchronize_session=False)
        db.query(Attendance).filter(Attendance.event_id.in_(seeded_event_ids)).delete(synchronize_session=False)

        # Volunteer assignments & applications
        app_ids = [a.id for a in db.query(VolunteerApplication.id).filter(VolunteerApplication.event_id.in_(seeded_event_ids)).all()]
        if app_ids:
            db.query(VolunteerAssignment).filter(VolunteerAssignment.application_id.in_(app_ids)).delete(synchronize_session=False)
        db.query(VolunteerApplication).filter(VolunteerApplication.event_id.in_(seeded_event_ids)).delete(synchronize_session=False)

        # Teams & invitations
        team_ids = [t.id for t in db.query(Team.id).filter(Team.event_id.in_(seeded_event_ids)).all()]
        if team_ids:
            db.query(TeamInvitation).filter(TeamInvitation.team_id.in_(team_ids)).delete(synchronize_session=False)
            db.query(Team).filter(Team.id.in_(team_ids)).delete(synchronize_session=False)

        db.query(Registration).filter(Registration.event_id.in_(seeded_event_ids)).delete(synchronize_session=False)

        # Forms & Versions
        form_ids = [f.id for f in db.query(EventForm.id).filter(EventForm.event_id.in_(seeded_event_ids)).all()]
        if form_ids:
            db.query(FormVersion).filter(FormVersion.form_id.in_(form_ids)).delete(synchronize_session=False)
            db.query(EventForm).filter(EventForm.id.in_(form_ids)).delete(synchronize_session=False)

        db.query(EventLeadership).filter(EventLeadership.event_id.in_(seeded_event_ids)).delete(synchronize_session=False)
        db.query(EventCoordinator).filter(EventCoordinator.event_id.in_(seeded_event_ids)).delete(synchronize_session=False)
        db.query(Event).filter(Event.id.in_(seeded_event_ids)).delete(synchronize_session=False)

    # 2. Clear seeded users (if any)
    # Note: Keep the active calling Authority account so administrator doesn't get locked out!
    if seeded_user_ids:
        purge_user_ids = [uid for uid in seeded_user_ids if uid != actor_id]
        if purge_user_ids:
            db.query(ClassTeacherAssignment).filter(ClassTeacherAssignment.faculty_user_id.in_(purge_user_ids)).delete(synchronize_session=False)
            db.query(HODAssignment).filter(HODAssignment.faculty_user_id.in_(purge_user_ids)).delete(synchronize_session=False)
            db.query(StudentProfile).filter(StudentProfile.user_id.in_(purge_user_ids)).delete(synchronize_session=False)
            db.query(FacultyProfile).filter(FacultyProfile.user_id.in_(purge_user_ids)).delete(synchronize_session=False)
            db.query(User).filter(User.id.in_(purge_user_ids)).delete(synchronize_session=False)
        # If the authority itself was seeded, convert it to a permanent non-seeded admin account
        if actor_id:
            calling_user = db.query(User).filter_by(id=actor_id).first()
            if calling_user and calling_user.is_seeded:
                calling_user.is_seeded = False

    db.add(AuditLog(
        actor_id=actor_id,
        action="DEMO_DATA_PURGED",
        entity="system",
        detail=f"Purged {events_count} seeded events and {users_count} seeded testing users."
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"Purged {events_count} demo events and {users_count} testing accounts successfully.",
        "purged_events": events_count,
        "purged_users": users_count,
    }


def get_demo_status(db: Session) -> dict:
    """Returns the current demo data status."""
    seeded_events = db.query(Event).filter_by(is_seeded=True).count()
    seeded_users = db.query(User).filter_by(is_seeded=True).count()
    return {
        "is_demo_active": seeded_events > 0 or seeded_users > 0,
        "seeded_events_count": seeded_events,
        "seeded_users_count": seeded_users,
        "seed_batch": BATCH_NAME,
        "demo_accounts": [
            {"role": "Authority", "email": "authority@vvce.ac.in", "default_password": DEMO_PASSWORDS["AUTHORITY"]},
            {"role": "Faculty Coordinator / HOD", "email": "faccse01@vvce.ac.in", "default_password": DEMO_PASSWORDS["FACULTY"]},
            {"role": "Student President (TechFest)", "email": "vvce23cse0001@vvce.ac.in", "default_password": DEMO_PASSWORDS["STUDENT"]},
            {"role": "Student Vice President", "email": "vvce23cse0002@vvce.ac.in", "default_password": DEMO_PASSWORDS["STUDENT"]},
            {"role": "Student Shortlisting Volunteer", "email": "vvce23cse0003@vvce.ac.in", "default_password": DEMO_PASSWORDS["STUDENT"]},
            {"role": "Student Participant", "email": "vvce23cse0004@vvce.ac.in", "default_password": DEMO_PASSWORDS["STUDENT"]},
        ]
    }
