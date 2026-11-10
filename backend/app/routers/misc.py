"""Notifications and role dashboards."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (User, Notification, Registration, Team, TeamInvitation, VolunteerApplication,
                      VolunteerAssignment, Attendance, Internship, ExternalEventRecord, Event, EventLeadership,
                      AccountType, StudentProfile)
from ..deps import require_campus_user, require_student, require_faculty, student_profile, faculty_profile

router = APIRouter(prefix="/api/v1", tags=["misc"])


@router.get("/notifications")
def notifications(db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    rows = db.query(Notification).filter_by(user_id=user.id).order_by(Notification.created_at.desc()).all()
    return [{"id": n.id, "title": n.title, "body": n.body, "link": n.link, "read": n.read,
             "created_at": n.created_at.isoformat()} for n in rows]


@router.post("/notifications/mark-all-read")
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    db.query(Notification).filter_by(user_id=user.id, read=False).update({"read": True})
    db.commit()
    return {"ok": True}


@router.post("/notifications/{nid}/read")
def mark_read(nid: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    n = db.query(Notification).filter_by(id=nid, user_id=user.id).first()
    if n:
        n.read = True
        db.commit()
    return {"ok": True}


@router.get("/student/dashboard")
def student_dashboard(db: Session = Depends(get_db), user: User = Depends(require_student)):
    regs = db.query(Registration).filter_by(student_user_id=user.id).all()
    teams = db.query(TeamInvitation).filter_by(student_user_id=user.id).all()
    vols = db.query(VolunteerApplication).filter_by(student_user_id=user.id).all()
    att = db.query(Attendance).filter_by(student_user_id=user.id).all()
    interns = db.query(Internship).filter_by(student_user_id=user.id).count()
    ext = db.query(ExternalEventRecord).filter_by(student_user_id=user.id).count()
    
    # Event Leadership appointments (President, VP, Shortlisting Volunteer, Volunteer Coordinator)
    leads = db.query(EventLeadership).filter_by(student_user_id=user.id, revoked_at=None).all()
    leadership_items = []
    for l in leads:
        ev = db.get(Event, l.event_id)
        if ev:
            leadership_items.append({
                "id": l.id,
                "event_id": ev.id,
                "event_name": ev.name,
                "event_category": ev.category or "General",
                "venue": ev.venue or "Campus",
                "event_status": ev.status.value,
                "role": l.role,
                "assigned_at": l.appointed_at.isoformat() if l.appointed_at else "",
            })

    regs_out = []
    for r in regs:
        ev = db.get(Event, r.event_id)
        fee = getattr(ev, "registration_fee", 0.0) or 0.0
        regs_out.append({
            "event_id": r.event_id,
            "event_name": ev.name if ev else f"Event #{r.event_id}",
            "event_category": ev.category or "General" if ev else "General",
            "venue": ev.venue or "Campus" if ev else "Campus",
            "date": ev.start_at.strftime("%d/%m/%Y") if ev and ev.start_at else "-",
            "registration_id": r.registration_id,
            "status": r.status,
            "registration_fee": fee,
            "payment_status": getattr(r, "payment_status", "EXEMPT" if fee == 0 else "UNPAID"),
            "payment_reference": getattr(r, "payment_reference", None),
            "whatsapp_group_url": ev.whatsapp_group_url if (getattr(r, "payment_status", None) == "PAID" or fee == 0) else None,
            "payment_qr_url": getattr(ev, "payment_qr_url", None),
            "payment_instructions": getattr(ev, "payment_instructions", None),
        })

    teams_out = []
    for t in teams:
        team = t.team
        ev = db.get(Event, team.event_id) if team else None
        is_leader = team.leader_user_id == user.id if team else False
        leader_sp = db.query(StudentProfile).filter_by(user_id=team.leader_user_id).first() if team else None
        fee = getattr(ev, "registration_fee", 0.0) or 0.0 if ev else 0.0
        paid = (team.payment_status == "PAID" or fee == 0) if team else False
        teams_out.append({
            "team_id": team.id if team else t.team_id,
            "team_name": team.team_name if team else f"Team #{t.team_id}",
            "event_id": team.event_id if team else 0,
            "event_name": ev.name if ev else "Event",
            "event_category": ev.category or "General" if ev else "General",
            "venue": ev.venue or "Campus" if ev else "Campus",
            "date": ev.start_at.strftime("%d/%m/%Y") if ev and ev.start_at else "-",
            "project_title": getattr(team, "project_title", None),
            "status": team.status.value if team else "UNKNOWN",
            "invitation": t.status,
            "is_leader": is_leader,
            "leader_name": leader_sp.full_name if leader_sp else "-",
            "registration_fee": fee,
            "payment_status": team.payment_status if team else "UNPAID",
            "payment_reference": team.payment_reference if team else None,
            "whatsapp_group_url": ev.whatsapp_group_url if (paid and ev) else None,
            "payment_qr_url": getattr(ev, "payment_qr_url", None) if ev else None,
            "payment_instructions": getattr(ev, "payment_instructions", None) if ev else None,
            "group_joined": getattr(team, "group_joined", False) if team else False,
        })

    vols_out = []
    for v in vols:
        ev = db.get(Event, v.event_id)
        va = db.query(VolunteerAssignment).filter_by(application_id=v.id).first()
        vols_out.append({
            "id": v.id,
            "event_id": v.event_id,
            "event_name": ev.name if ev else f"Event #{v.event_id}",
            "event_category": ev.category or "General" if ev else "General",
            "venue": ev.venue or "Campus" if ev else "Campus",
            "date": ev.start_at.strftime("%d/%m/%Y") if ev and ev.start_at else "-",
            "preferred_area": v.preferred_area or "-",
            "status": v.status,
            "responsibility": va.responsibility if va else "-",
            "allocation": va.allocation if va else "-",
            "completion_status": va.completion_status if va else "PENDING",
        })

    return {
        "registrations": regs_out,
        "teams": teams_out,
        "volunteer_applications": vols_out,
        "attendance": [{"event_id": a.event_id, "status": a.status} for a in att],
        "internship_count": interns,
        "external_count": ext,
        "leadership": leadership_items,
    }



@router.get("/faculty/dashboard")
def faculty_dashboard(db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    fp = faculty_profile(db, user)
    from ..models import EventCoordinator, HODAssignment, ClassTeacherAssignment, StudentProfile

    coord_rows = db.query(EventCoordinator).filter_by(faculty_user_id=user.id, revoked_at=None).all()
    events_list = []
    for c in coord_rows:
        ev = db.get(Event, c.event_id)
        if ev:
            events_list.append({
                "id": ev.id,
                "name": ev.name,
                "status": ev.status.value,
                "venue": ev.venue,
                "start_at": ev.start_at.isoformat(),
            })

    hod = db.query(HODAssignment).filter_by(faculty_user_id=user.id, active=True).count()
    ct_rows = db.query(ClassTeacherAssignment).filter_by(faculty_user_id=user.id, active=True).all()
    ct_assignments = [
        {"id": ct.id, "semester": ct.semester, "section": ct.section, "academic_year": ct.academic_year}
        for ct in ct_rows
    ]

    pending_reviews_count = 0
    for ct in ct_rows:
        pending_interns = db.query(Internship).join(StudentProfile, StudentProfile.user_id == Internship.student_user_id).filter(
            StudentProfile.department_id == fp.department_id,
            StudentProfile.current_semester == ct.semester,
            StudentProfile.section == ct.section,
            Internship.status == "PENDING_REVIEW"
        ).count()
        pending_ext = db.query(ExternalEventRecord).join(StudentProfile, StudentProfile.user_id == ExternalEventRecord.student_user_id).filter(
            StudentProfile.department_id == fp.department_id,
            StudentProfile.current_semester == ct.semester,
            StudentProfile.section == ct.section,
            ExternalEventRecord.status == "PENDING_REVIEW"
        ).count()
        pending_reviews_count += (pending_interns + pending_ext)

    dept_students_count = db.query(StudentProfile).filter_by(department_id=fp.department_id).count()

    return {
        "department": fp.department.code,
        "department_name": fp.department.name,
        "designation": fp.designation,
        "is_hod": hod > 0,
        "coordinated_events": len(events_list),
        "events": events_list,
        "class_teacher_assignments": len(ct_assignments),
        "ct_assignments": ct_assignments,
        "pending_reviews_count": pending_reviews_count,
        "dept_students_count": dept_students_count,
    }


# ----------------------------- Faculty Department Participation & Export -----------------------------

@router.get("/faculty/department-participation")
def department_participation(db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    from ..models import EventCoordinator, HODAssignment, ClassTeacherAssignment, VolunteerAssignment, Department
    fp = faculty_profile(db, user)
    dept = fp.department

    hod = db.query(HODAssignment).filter_by(faculty_user_id=user.id, active=True).first()
    cta = db.query(ClassTeacherAssignment).filter_by(faculty_user_id=user.id, active=True).all()
    ct_list = [
        {"semester": c.semester, "section": c.section, "academic_year": c.academic_year}
        for c in cta
    ]

    dept_students = db.query(StudentProfile).filter_by(department_id=fp.department_id).all()
    dept_student_map = {s.user_id: s for s in dept_students}
    dept_user_ids = list(dept_student_map.keys())

    participants = []
    volunteers = []

    if dept_user_ids:
        # 1. Individual event registrations
        regs = db.query(Registration).filter(Registration.student_user_id.in_(dept_user_ids)).all()
        for r in regs:
            sp = dept_student_map.get(r.student_user_id)
            ev = db.get(Event, r.event_id)
            if sp and ev:
                participants.append({
                    "id": f"reg_{r.id}",
                    "student_user_id": sp.user_id,
                    "usn": sp.usn,
                    "name": sp.full_name,
                    "semester": sp.current_semester,
                    "section": sp.section,
                    "event_id": ev.id,
                    "event_name": ev.name,
                    "event_category": ev.category or "General",
                    "venue": ev.venue or "Campus",
                    "mode": "Individual",
                    "team_name": "-",
                    "status": r.status,
                    "payment_status": r.payment_status,
                    "date": ev.start_at.strftime("%d/%m/%Y") if ev.start_at else "-",
                })

        # 2. Team event participations
        invites = db.query(TeamInvitation).filter(
            TeamInvitation.student_user_id.in_(dept_user_ids),
            TeamInvitation.status == "ACCEPTED"
        ).all()
        for inv in invites:
            t = inv.team
            if t:
                ev = db.get(Event, t.event_id)
                sp = dept_student_map.get(inv.student_user_id)
                if sp and ev:
                    is_lead = (t.leader_user_id == sp.user_id)
                    participants.append({
                        "id": f"team_mem_{inv.id}",
                        "student_user_id": sp.user_id,
                        "usn": sp.usn,
                        "name": sp.full_name,
                        "semester": sp.current_semester,
                        "section": sp.section,
                        "event_id": ev.id,
                        "event_name": ev.name,
                        "event_category": ev.category or "General",
                        "venue": ev.venue or "Campus",
                        "mode": "Team Leader" if is_lead else "Team Member",
                        "team_name": t.team_name,
                        "status": t.status.value,
                        "payment_status": t.payment_status,
                        "date": ev.start_at.strftime("%d/%m/%Y") if ev.start_at else "-",
                    })

        # 3. Volunteer applications from department students
        vol_apps = db.query(VolunteerApplication).filter(VolunteerApplication.student_user_id.in_(dept_user_ids)).all()
        for v in vol_apps:
            sp = dept_student_map.get(v.student_user_id)
            ev = db.get(Event, v.event_id)
            va = db.query(VolunteerAssignment).filter_by(application_id=v.id).first()
            if sp and ev:
                volunteers.append({
                    "id": f"vol_{v.id}",
                    "student_user_id": sp.user_id,
                    "usn": sp.usn,
                    "name": sp.full_name,
                    "semester": sp.current_semester,
                    "section": sp.section,
                    "event_id": ev.id,
                    "event_name": ev.name,
                    "event_category": ev.category or "General",
                    "venue": ev.venue or "Campus",
                    "preferred_area": v.preferred_area or "-",
                    "responsibility": va.responsibility if va else "-",
                    "status": v.status,
                    "completion_status": va.completion_status if va else "PENDING",
                    "date": ev.start_at.strftime("%d/%m/%Y") if ev.start_at else "-",
                })

    return {
        "faculty": {
            "name": fp.full_name,
            "id": user.id,
            "email": user.email,
            "department_code": dept.code if dept else "",
            "department_name": dept.name if dept else "",
            "designation": fp.designation,
            "is_hod": hod is not None,
            "institutional_role": "Department Head (HOD)" if hod else fp.designation or "Faculty Teacher",
            "is_class_teacher": len(ct_list) > 0,
            "class_teacher_assignments": ct_list,
        },
        "participants": participants,
        "volunteers": volunteers,
        "total_dept_students": len(dept_students),
        "total_participants": len(participants),
        "total_volunteers": len(volunteers),
    }


@router.get("/faculty/department-participation/export")
def export_department_participation(db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    import csv, io
    data = department_participation(db, user)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record Type", "USN", "Student Name", "Department", "Semester", "Section",
        "Event ID", "Event Name", "Category", "Mode / Preferred Area", "Team / Responsibility", "Status", "Date"
    ])
    dept_code = data["faculty"]["department_code"]
    for p in data["participants"]:
        writer.writerow([
            "PARTICIPANT", p["usn"], p["name"], dept_code, p["semester"], p["section"],
            p["event_id"], p["event_name"], p["event_category"], p["mode"], p["team_name"], p["status"], p["date"]
        ])
    for v in data["volunteers"]:
        writer.writerow([
            "VOLUNTEER", v["usn"], v["name"], dept_code, v["semester"], v["section"],
            v["event_id"], v["event_name"], v["event_category"], v["preferred_area"], v["responsibility"], v["status"], v["date"]
        ])

    csv_bytes = output.getvalue().encode("utf-8")
    filename = f"{dept_code}_Students_Participation_and_Volunteering_Roster.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ----------------------------- Coordinated Events & History -----------------------------

@router.get("/faculty/coordinated-events")
def get_faculty_coordinated_events(db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    from ..models import EventCoordinator, Team, Registration, VolunteerApplication, Winner
    coord_rows = db.query(EventCoordinator).filter_by(faculty_user_id=user.id, revoked_at=None).all()
    active_events = []
    history_events = []
    now = datetime.now(timezone.utc)

    for c in coord_rows:
        ev = db.get(Event, c.event_id)
        if not ev:
            continue
        reg_count = db.query(Registration).filter_by(event_id=ev.id).count()
        team_count = db.query(Team).filter_by(event_id=ev.id).count()
        vol_count = db.query(VolunteerApplication).filter_by(event_id=ev.id).count()
        sl_teams_count = db.query(Team).filter_by(event_id=ev.id, status="SHORTLISTED").count()
        winners_count = db.query(Winner).filter_by(event_id=ev.id).count()

        item = {
            "id": ev.id,
            "name": ev.name,
            "description": ev.description,
            "category": ev.category or "General",
            "venue": ev.venue or "-",
            "start_at": ev.start_at.isoformat(),
            "end_at": ev.end_at.isoformat(),
            "reg_open_at": ev.reg_open_at.isoformat() if ev.reg_open_at else None,
            "reg_close_at": ev.reg_close_at.isoformat() if ev.reg_close_at else None,
            "status": ev.status.value,
            "registrations_count": reg_count,
            "teams_count": team_count,
            "volunteers_count": vol_count,
            "shortlisted_teams_count": sl_teams_count,
            "winners_count": winners_count,
            "team_enabled": ev.team_enabled,
            "individual_enabled": ev.individual_enabled,
            "volunteer_enabled": ev.volunteer_enabled,
            "registration_fee": ev.registration_fee or 0.0,
        }

        end = ev.end_at
        if end and end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)

        if ev.status.value in ("COMPLETED", "CANCELLED") or (end and end < now):
            history_events.append(item)
        else:
            active_events.append(item)

    return {
        "active_events": active_events,
        "history_events": history_events,
        "total_coordinated": len(coord_rows),
    }


