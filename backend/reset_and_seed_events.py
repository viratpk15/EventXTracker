"""Reset all events and seed fresh, realistic, production-quality VVCE campus events."""
import os
import sys
import json
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))

from app.db import SessionLocal, engine, Base
from app.models import (
    User, Event, EventStatus, EventCoordinator, EventLeadership, EventForm, FormVersion,
    Registration, Team, TeamStatus, TeamInvitation, VolunteerApplication, VolunteerAssignment,
    Attendance, Winner, StudentProfile, FacultyProfile
)

def run_reset_and_seed(db_path=None):
    if db_path:
        os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        eng = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(bind=eng)
        db = Session()
    else:
        db = SessionLocal()

    print(f"Resetting events in database session...")

    # 1. Clear all old event-related data
    db.query(Winner).delete()
    db.query(Attendance).delete()
    db.query(VolunteerAssignment).delete()
    db.query(VolunteerApplication).delete()
    db.query(TeamInvitation).delete()
    db.query(Team).delete()
    db.query(Registration).delete()
    db.query(FormVersion).delete()
    db.query(EventForm).delete()
    db.query(EventLeadership).delete()
    db.query(EventCoordinator).delete()
    db.query(Event).delete()
    db.commit()
    print("Cleared all legacy event tables successfully.")

    # Find faculty and students
    cse_faculty = db.query(User).filter_by(email="faccse01@vvce.ac.in").first() or db.query(User).filter_by(account_type="FACULTY").first()
    aiml_faculty = db.query(User).filter_by(email="facaiml01@vvce.ac.in").first() or cse_faculty
    ise_faculty = db.query(User).filter_by(email="facise01@vvce.ac.in").first() or cse_faculty
    ec_faculty = db.query(User).filter_by(email="facec01@vvce.ac.in").first() or cse_faculty

    students = db.query(User).filter_by(account_type="STUDENT").order_by(User.id).limit(15).all()
    if len(students) < 4:
        print("Warning: less than 4 students found.")

    now = datetime.now(timezone.utc)

    # -------------------------------------------------------------
    # EVENT 1: VVCE National TechFest 2026 - HackSphere 36hr Hackathon
    # -------------------------------------------------------------
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
        payment_instructions="Scan the official VVCE QR code or use UPI ID vvce.techfest@upi. Mention your USN and Team Name in the remarks.",
        require_id_proof=True,
        idea_ppt_required=True,
        ppt_template_url="https://vvce.ac.in/downloads/techfest2026_ppt_template.pptx",
        selection_mode="MANUAL",
        status=EventStatus.UPCOMING,
        created_by=cse_faculty.id,
        created_at=now - timedelta(days=5),
        updated_at=now,
    )
    db.add(ev1)
    db.flush()

    # Coordinators
    db.add(EventCoordinator(event_id=ev1.id, faculty_user_id=cse_faculty.id, assigned_by=cse_faculty.id))

    # Leadership: President, VP, and Shortlisting Volunteer
    if len(students) >= 3:
        # Appoint President (Student 0)
        lead_pres = EventLeadership(
            event_id=ev1.id,
            student_user_id=students[0].id,
            role="PRESIDENT",
            appointed_by=cse_faculty.id,
            appointed_at=now - timedelta(days=4),
        )
        # Appoint Vice President (Student 1)
        lead_vp = EventLeadership(
            event_id=ev1.id,
            student_user_id=students[1].id,
            role="VICE_PRESIDENT",
            appointed_by=cse_faculty.id,
            appointed_at=now - timedelta(days=4),
        )
        # Appoint Shortlisting Volunteer (Student 2)
        lead_vol = EventLeadership(
            event_id=ev1.id,
            student_user_id=students[2].id,
            role="SHORTLISTER_VOLUNTEER",
            appointed_by=cse_faculty.id,
            appointed_at=now - timedelta(days=3),
        )
        db.add_all([lead_pres, lead_vp, lead_vol])

    # Dynamic Registration Form
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
        created_by=cse_faculty.id,
    )
    db.add(ef1)
    db.flush()
    fv1 = FormVersion(
        form_id=ef1.id,
        version=1,
        title=ef1.title,
        description=ef1.description,
        schema_json=json.dumps(form_schema_1),
    )
    db.add(fv1)

    # Add sample participant registration (Student 3)
    if len(students) >= 4:
        reg1 = Registration(
            event_id=ev1.id,
            student_user_id=students[3].id,
            form_version=1,
            registration_id="REG-2026-0001",
            answers_json=json.dumps({"q1": "AI / Machine Learning", "q2": "Autonomous Campus Navigation system using LiDAR and ROS2", "q3": "https://github.com/vvce-student/nav"}),
            status="REGISTERED",
            phone="9876543210",
            payment_status="PENDING_PAYMENT",
            created_at=now - timedelta(days=2),
        )
        db.add(reg1)

    # Add sample volunteer application (Student 4)
    if len(students) >= 5:
        vol_app = VolunteerApplication(
            event_id=ev1.id,
            student_user_id=students[4].id,
            experience="Volunteered at VVCE TechX 2025 in logistics and student registration desks.",
            skills="Public Speaking, Desk Management, Logistics",
            preferred_area="Stage & Hospitality",
            answers_json=json.dumps({"experience": "Volunteered at VVCE TechX 2025 in logistics and student registration desks.", "tshirt": "L"}),
            status="PENDING",
        )
        db.add(vol_app)

    # -------------------------------------------------------------
    # EVENT 2: AI & Robotics Innovation Summit 2026
    # -------------------------------------------------------------
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
        created_by=aiml_faculty.id,
        created_at=now - timedelta(days=3),
        updated_at=now,
    )
    db.add(ev2)
    db.flush()
    db.add(EventCoordinator(event_id=ev2.id, faculty_user_id=aiml_faculty.id, assigned_by=aiml_faculty.id))

    # -------------------------------------------------------------
    # EVENT 3: Sambhrama 2026 — Annual Cultural Carnival
    # -------------------------------------------------------------
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
        created_by=ise_faculty.id,
        created_at=now - timedelta(days=2),
        updated_at=now,
    )
    db.add(ev3)
    db.flush()
    db.add(EventCoordinator(event_id=ev3.id, faculty_user_id=ise_faculty.id, assigned_by=ise_faculty.id))

    # -------------------------------------------------------------
    # EVENT 4: VVCE Annual Inter-Departmental Sports Olympiad 2026
    # -------------------------------------------------------------
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
        created_by=ec_faculty.id,
        created_at=now - timedelta(days=1),
        updated_at=now,
    )
    db.add(ev4)
    db.flush()
    db.add(EventCoordinator(event_id=ev4.id, faculty_user_id=ec_faculty.id, assigned_by=ec_faculty.id))

    # -------------------------------------------------------------
    # EVENT 5: Cloud DevOps & AWS Hands-on Masterclass (COMPLETED)
    # -------------------------------------------------------------
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
        created_by=cse_faculty.id,
        created_at=now - timedelta(days=25),
        updated_at=now - timedelta(days=7),
    )
    db.add(ev5)
    db.flush()
    db.add(EventCoordinator(event_id=ev5.id, faculty_user_id=cse_faculty.id, assigned_by=cse_faculty.id))

    # Add verified attendance and winners for completed event
    if len(students) >= 3:
        # Student 0 won 1st Place
        db.add(Attendance(event_id=ev5.id, student_user_id=students[0].id, status="PRESENT", marked_by=cse_faculty.id, marked_at=now - timedelta(days=8)))
        db.add(Winner(event_id=ev5.id, position=1, student_user_id=students[0].id, achievement="1st Place (Gold Medal) - Best AWS Architected Solution", updated_by=cse_faculty.id))

        # Student 1 won 2nd Place
        db.add(Attendance(event_id=ev5.id, student_user_id=students[1].id, status="PRESENT", marked_by=cse_faculty.id, marked_at=now - timedelta(days=8)))
        db.add(Winner(event_id=ev5.id, position=2, student_user_id=students[1].id, achievement="2nd Place (Silver Medal) - Outstanding Container Performance", updated_by=cse_faculty.id))

        # Student 2 won 3rd Place
        db.add(Attendance(event_id=ev5.id, student_user_id=students[2].id, status="PRESENT", marked_by=cse_faculty.id, marked_at=now - timedelta(days=8)))
        db.add(Winner(event_id=ev5.id, position=3, student_user_id=students[2].id, achievement="3rd Place (Bronze Medal) - Most Innovative CI/CD Automation", updated_by=cse_faculty.id))

    db.commit()
    print("Seeded 5 fresh, realistic VVCE events with forms, leadership, and records successfully!")
    db.close()

if __name__ == "__main__":
    # Run on both DB files
    for path in ["./eventxtracker.db", "./backend/eventxtracker.db"]:
        if os.path.exists(path):
            print(f"\n--- Seeding {path} ---")
            run_reset_and_seed(path)
        else:
            print(f"File {path} not found, skipping.")
