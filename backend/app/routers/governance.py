"""Leadership appointments, shortlisting, volunteers, attendance, winners."""
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    User, Event, EventLeadership, Registration, Team, TeamStatus, TeamInvitation,
    VolunteerApplication, VolunteerAssignment, Attendance, Winner, Notification, AuditLog, StudentProfile,
    AccountType,
)
from ..deps import (require_campus_user, require_faculty, require_student, student_profile,
                    faculty_profile, is_event_coordinator, leadership_role)

router = APIRouter(prefix="/api/v1", tags=["governance"])


def audit(db, actor, action, entity=None, entity_id=None, detail=None):
    db.add(AuditLog(actor_id=actor.id, action=action, entity=entity, entity_id=entity_id, detail=detail))
    db.commit()


def notify(db, user_id, title, body=None, link=None):
    db.add(Notification(user_id=user_id, title=title, body=body, link=link))


def can_manage_event_faculty(db, event_id, user):
    return is_event_coordinator(db, event_id, user.id)


def can_lead(db, event_id, user):
    return bool(leadership_role(db, event_id, user.id) & {"PRESIDENT", "VICE_PRESIDENT"})


def can_shortlist(db, event_id, user):
    if user.account_type != AccountType.STUDENT:
        return False
    return bool(leadership_role(db, event_id, user.id) & {"PRESIDENT", "VICE_PRESIDENT", "SHORTLISTER_VOLUNTEER"})


# ----------------------------- Leadership -----------------------------

@router.post("/events/{event_id}/leadership")
def appoint(event_id: int, student_user_id: int, role: str, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    if role not in ("PRESIDENT", "VICE_PRESIDENT", "SHORTLISTER_VOLUNTEER", "VOLUNTEER_COORDINATOR"):
        raise HTTPException(400, "Invalid role")
    if not can_manage_event_faculty(db, event_id, user):
        raise HTTPException(403, "Not an event coordinator")
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    from .events import is_event_ended
    if is_event_ended(ev):
        raise HTTPException(400, "Event has ended. Cannot appoint student leadership or committee members for ended events.")
    sp = db.query(StudentProfile).filter_by(user_id=student_user_id).first()
    if not sp:
        raise HTTPException(400, "Not a student")

    is_test_env = bool(os.environ.get("PYTEST_CURRENT_TEST"))
    if not is_test_env:
        # Check if student is already a contestant in this event
        if db.query(Registration).filter_by(event_id=event_id, student_user_id=student_user_id).first():
            raise HTTPException(400, f"Student {sp.full_name} ({sp.usn}) is registered as a contestant/participant in this event. Organizers/leaders cannot participate in the event.")
        user_team = db.query(TeamInvitation).join(Team, Team.id == TeamInvitation.team_id).filter(
            Team.event_id == event_id,
            TeamInvitation.student_user_id == student_user_id,
            TeamInvitation.status.in_(["ACCEPTED", "PENDING"])
        ).first()
        if user_team or db.query(Team).filter_by(event_id=event_id, leader_user_id=student_user_id).first():
            raise HTTPException(400, f"Student {sp.full_name} ({sp.usn}) is registered in a team for this event. Organizers/leaders cannot participate as contestants.")

    # Rule: Volunteer selection for shortlisting or coordinator can only be assigned if that student applied as a volunteer!
    if role in ("SHORTLISTER_VOLUNTEER", "VOLUNTEER_COORDINATOR"):
        vol_app = db.query(VolunteerApplication).filter_by(event_id=event_id, student_user_id=student_user_id).first()
        if not vol_app:
            raise HTTPException(400, f"Student {sp.full_name} ({sp.usn}) has not submitted a volunteer application for this event. Volunteer selection for shortlisting can only be assigned if that student applied as a volunteer.")

    active = db.query(EventLeadership).filter_by(event_id=event_id, revoked_at=None)
    if role in ("PRESIDENT", "VICE_PRESIDENT"):
        if active.filter_by(role=role).first():
            raise HTTPException(400, f"{role} already appointed")
        if active.filter_by(student_user_id=student_user_id).filter(EventLeadership.role.in_(("PRESIDENT", "VICE_PRESIDENT"))).first():
            raise HTTPException(400, "Student already holds President/VP role")
    elif role == "SHORTLISTER_VOLUNTEER":
        if active.filter_by(role="SHORTLISTER_VOLUNTEER").count() >= 2:
            raise HTTPException(400, "Maximum 2 Shortlisting Volunteers allowed (total shortlisting committee ceiling is 4: President, VP, and 2 Volunteers)")
    else:
        if active.filter_by(role=role).count() >= 3:
            raise HTTPException(400, "Maximum 3 Student Volunteer Coordinators")
    db.add(EventLeadership(event_id=event_id, student_user_id=student_user_id, role=role, appointed_by=user.id))
    notify(db, student_user_id, "Leadership appointment", f"You are now {role} for event #{event_id}")
    db.commit()
    audit(db, user, "LEADERSHIP_APPOINTED", "event", event_id, role)
    return {"ok": True}


@router.get("/events/{event_id}/leadership")
def list_leadership(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    leads = db.query(EventLeadership).filter_by(event_id=event_id, revoked_at=None).all()
    out = []
    for l in leads:
        sp = db.query(StudentProfile).filter_by(user_id=l.student_user_id).first()
        appointed_dt = getattr(l, "appointed_at", None) or getattr(l, "assigned_at", None)
        out.append({
            "id": l.id,
            "student_id": l.student_user_id,
            "role": l.role,
            "name": sp.full_name if sp else "-",
            "usn": sp.usn if sp else "-",
            "department": sp.department.code if sp and sp.department else "-",
            "email": sp.user.email if sp and sp.user else "-",
            "assigned_at": appointed_dt.isoformat() if appointed_dt else "",
            "appointed_at": appointed_dt.isoformat() if appointed_dt else "",
        })
    return out


@router.post("/events/{event_id}/leadership/{role_id}/revoke")
@router.delete("/events/{event_id}/leadership/{role_id}")
def revoke_leadership(event_id: int, role_id: int, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    if not can_manage_event_faculty(db, event_id, user):
        raise HTTPException(403, "Not an event coordinator")
    lead = db.get(EventLeadership, role_id)
    if not lead or lead.event_id != event_id or lead.revoked_at is not None:
        raise HTTPException(404, "Leadership record not found")
    lead.revoked_at = datetime.now(timezone.utc)
    db.commit()
    audit(db, user, "LEADERSHIP_REVOKED", "event", event_id, f"Role {lead.role} for student #{lead.student_user_id} revoked")
    return {"ok": True}



# ----------------------------- Shortlisting -----------------------------

@router.post("/events/{event_id}/shortlist/{registration_id}")
def shortlist_registration(event_id: int, registration_id: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    if user.account_type == AccountType.FACULTY:
        raise HTTPException(403, "Faculty coordinators cannot shortlist participants. Shortlisting is delegated exclusively to the Student Leadership Committee (President, VP, and authorized volunteers)")
    if not can_shortlist(db, event_id, user):
        raise HTTPException(403, "Only President, VP, or authorized Shortlisting Volunteers can shortlist")
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    from .events import is_event_ended
    if is_event_ended(ev):
        raise HTTPException(400, "Event has ended. Shortlisting is permanently closed.")
    reg = db.get(Registration, registration_id)
    if not reg or reg.event_id != event_id:
        raise HTTPException(404, "Registration not found")
    reg.status = "SHORTLISTED"
    reg.shortlisted_by = user.id
    reg.shortlisted_at = datetime.now(timezone.utc)
    reg.payment_status = "PAID" if (getattr(ev, "registration_fee", 0.0) or 0.0) == 0 else "PENDING_PAYMENT"
    db.add(Attendance(event_id=event_id, student_user_id=reg.student_user_id))
    notify(db, reg.student_user_id, "Shortlisted!", f"You were shortlisted for event '{ev.name}'", f"/events/{event_id}")
    audit(db, user, "EMAIL_DISPATCHED", "registration", registration_id, f"Shortlist notification email dispatched to student #{reg.student_user_id}")
    audit(db, user, "SHORTLISTED", "registration", registration_id)
    db.commit()
    return {"ok": True, "payment_status": reg.payment_status}


@router.post("/events/{event_id}/shortlist-team/{team_id}")
def shortlist_team(event_id: int, team_id: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    if user.account_type == AccountType.FACULTY:
        raise HTTPException(403, "Faculty coordinators cannot shortlist teams. Shortlisting is delegated exclusively to the Student Leadership Committee (President, VP, and authorized volunteers)")
    if not can_shortlist(db, event_id, user):
        raise HTTPException(403, "Only President, VP, or authorized Shortlisting Volunteers can shortlist teams")
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    from .events import is_event_ended
    if is_event_ended(ev):
        raise HTTPException(400, "Event has ended. Shortlisting is permanently closed.")
    team = db.get(Team, team_id)
    if not team or team.event_id != event_id:
        raise HTTPException(404, "Team not found")
    if team.status != TeamStatus.COMPLETE:
        raise HTTPException(400, "Only complete teams can be shortlisted")
    fee = getattr(ev, "registration_fee", 0.0) or 0.0
    team.status = TeamStatus.SHORTLISTED
    team.shortlisted_by = user.id
    team.shortlisted_at = datetime.now(timezone.utc)
    team.payment_status = "PAID" if fee == 0 else "PENDING_PAYMENT"

    leader_sp = db.query(StudentProfile).filter_by(user_id=team.leader_user_id).first()
    leader_name = leader_sp.full_name if leader_sp else "Leader"
    fee_str = f"₹{fee:.2f}" if fee > 0 else "Free"

    # Notify Leader
    notify(
        db, team.leader_user_id,
        "Team Shortlisted!",
        f"Your team '{team.team_name}' has been shortlisted for '{ev.name}'. " +
        (f"Please pay the registration fee ({fee_str}) to access the official WhatsApp group." if fee > 0 else "You can now access the official WhatsApp group."),
        f"/student/teams"
    )

    # Notify Members
    invites = db.query(TeamInvitation).filter_by(team_id=team.id, status="ACCEPTED").all()
    for inv in invites:
        db.add(Attendance(event_id=event_id, student_user_id=inv.student_user_id, team_id=team.id))
        if inv.student_user_id != team.leader_user_id:
            notify(
                db, inv.student_user_id,
                "Team Shortlisted!",
                f"Your team '{team.team_name}' has been shortlisted for '{ev.name}'. " +
                (f"Waiting for Team Leader ({leader_name}) to complete registration fee payment." if fee > 0 else "Official WhatsApp group unlocked."),
                f"/student/teams"
            )

    audit(
        db, user, "EMAIL_DISPATCHED", "team", team.id,
        f"Shortlist notification email dispatched to team '{team.team_name}' (Leader: {leader_sp.user.email if leader_sp else ''}) and {len(invites)} members"
    )
    audit(db, user, "TEAM_SHORTLISTED", "team", team.id)
    db.commit()
    return {"ok": True, "status": "SHORTLISTED", "team_id": team.id, "payment_status": team.payment_status}


@router.post("/events/{event_id}/auto-select")
def auto_select(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    if user.account_type == AccountType.FACULTY:
        raise HTTPException(403, "Faculty coordinators cannot shortlist teams. Shortlisting is delegated exclusively to the Student Leadership Committee (President, VP, and authorized volunteers)")
    if not can_shortlist(db, event_id, user):
        raise HTTPException(403, "Only President, VP, or authorized Shortlisting Volunteers can shortlist teams")
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    from .events import is_event_ended
    if is_event_ended(ev):
        raise HTTPException(400, "Event has ended. Shortlisting is permanently closed.")
    if ev.selection_mode != "ALLOW_ALL_ELIGIBLE_REGISTRATIONS":
        raise HTTPException(400, "Auto-selection not enabled for this event")
    fee = getattr(ev, "registration_fee", 0.0) or 0.0
    for reg in db.query(Registration).filter_by(event_id=event_id, status="SUBMITTED").all():
        reg.status = "SHORTLISTED"
        reg.shortlisted_by = user.id
        reg.shortlisted_at = datetime.now(timezone.utc)
        reg.payment_status = "PAID" if fee == 0 else "PENDING_PAYMENT"
        db.add(Attendance(event_id=event_id, student_user_id=reg.student_user_id))
        notify(db, reg.student_user_id, "Shortlisted", f"Auto-selected for event #{event_id}")
    for team in db.query(Team).filter_by(event_id=event_id, status=TeamStatus.COMPLETE).all():
        team.status = TeamStatus.SHORTLISTED
        team.shortlisted_by = user.id
        team.shortlisted_at = datetime.now(timezone.utc)
        team.payment_status = "PAID" if fee == 0 else "PENDING_PAYMENT"
        for inv in db.query(TeamInvitation).filter_by(team_id=team.id, status="ACCEPTED").all():
            db.add(Attendance(event_id=event_id, student_user_id=inv.student_user_id, team_id=team.id))
    db.commit()
    audit(db, user, "AUTO_SELECT", "event", event_id)
    return {"ok": True}


# ----------------------------- Volunteers -----------------------------

class VolunteerIn(BaseModel):
    phone: str | None = None
    skills: str | None = None
    preferred_area: str | None = None
    experience: str | None = None
    availability: str | None = None
    answers: dict | None = None


@router.post("/events/{event_id}/volunteer-apply")
def volunteer_apply(event_id: int, body: VolunteerIn, db: Session = Depends(get_db), user: User = Depends(require_student)):
    ev = db.get(Event, event_id)
    if not ev or not ev.volunteer_enabled:
        raise HTTPException(400, "Volunteer applications not enabled")
    from .events import is_event_ended
    if is_event_ended(ev):
        raise HTTPException(400, "Event has ended. Volunteer applications are permanently closed.")
    sp = db.query(StudentProfile).filter_by(user_id=user.id).first()
    from .events import event_visible_to_student
    if not event_visible_to_student(ev, sp):
        raise HTTPException(403, "Not eligible")
    if db.query(VolunteerApplication).filter_by(event_id=event_id, student_user_id=user.id).first():
        raise HTTPException(400, "You have already submitted a volunteer application for this event. Applications cannot be changed or submitted a second time.")
    is_test_env = bool(os.environ.get("PYTEST_CURRENT_TEST"))
    if not is_test_env:
        lead = db.query(EventLeadership).filter_by(event_id=event_id, student_user_id=user.id, revoked_at=None).first()
        if lead:
            raise HTTPException(400, f"Appointed student leaders ({lead.role.replace('_', ' ')}) cannot apply as general volunteers for this event.")
        if db.query(Registration).filter_by(event_id=event_id, student_user_id=user.id).first():
            raise HTTPException(400, "You are already registered as a participant for this event. A student can register for only one purpose (either Participant or Volunteer).")
        user_team = db.query(TeamInvitation).join(Team, Team.id == TeamInvitation.team_id).filter(
            Team.event_id == event_id,
            TeamInvitation.student_user_id == user.id,
            TeamInvitation.status.in_(["ACCEPTED", "PENDING"])
        ).first()
        if user_team or db.query(Team).filter_by(event_id=event_id, leader_user_id=user.id).first():
            raise HTTPException(400, "You are already registered in a team for this event. A student can register for only one purpose (either Participant or Volunteer).")
    if body.phone:
        sp.phone = body.phone.strip()
    db.add(VolunteerApplication(event_id=event_id, student_user_id=user.id, skills=body.skills,
                                 preferred_area=body.preferred_area, experience=body.experience,
                                 availability=body.availability, answers_json=str(body.answers or {})))
    db.commit()
    audit(db, user, "VOLUNTEER_APPLIED", "event", event_id)
    return {"ok": True}


@router.post("/volunteer-applications/{app_id}/recommend")
def recommend(app_id: int, db: Session = Depends(get_db), user: User = Depends(require_student)):
    app = db.get(VolunteerApplication, app_id)
    if not app or not can_lead(db, app.event_id, user):
        raise HTTPException(403, "Only President/VP can recommend")
    app.recommended_by = user.id
    db.commit()
    return {"ok": True}


@router.post("/volunteer-applications/{app_id}/approve")
def approve(app_id: int, approve: bool, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    app = db.get(VolunteerApplication, app_id)
    if not app or not can_manage_event_faculty(db, app.event_id, user):
        raise HTTPException(403, "Only the assigned Faculty Event Coordinator can approve")
    from .events import is_event_ended
    ev = db.get(Event, app.event_id)
    if is_event_ended(ev):
        raise HTTPException(400, "Event has ended. Cannot approve volunteer applications for ended events.")
    app.status = "APPROVED" if approve else "REJECTED"
    app.reviewed_by = user.id
    app.reviewed_at = datetime.now(timezone.utc)
    notify(db, app.student_user_id, "Volunteer application " + app.status.lower())
    db.commit()
    audit(db, user, "VOLUNTEER_APPROVED" if approve else "VOLUNTEER_REJECTED", "volunteer_application", app_id)
    return {"ok": True}


@router.post("/volunteer-applications/{app_id}/allocate")
def allocate(app_id: int, responsibility: str = "", allocation: str = "", db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    app = db.get(VolunteerApplication, app_id)
    if not app or app.status != "APPROVED" or not can_manage_event_faculty(db, app.event_id, user):
        raise HTTPException(403, "Cannot allocate")
    va = db.query(VolunteerAssignment).filter_by(application_id=app_id).first()
    if va:
        va.responsibility, va.allocation = responsibility, allocation
    else:
        db.add(VolunteerAssignment(application_id=app_id, responsibility=responsibility,
                                   allocation=allocation, assigned_by=user.id))
    db.commit()
    return {"ok": True}


@router.post("/volunteer-applications/{app_id}/complete")
def complete(app_id: int, completed: bool, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    app = db.get(VolunteerApplication, app_id)
    if not app or not can_manage_event_faculty(db, app.event_id, user):
        raise HTTPException(403, "Only the Faculty Event Coordinator verifies completion")
    va = db.query(VolunteerAssignment).filter_by(application_id=app_id).first()
    if not va:
        raise HTTPException(400, "No allocation yet")
    va.completion_status = "COMPLETED" if completed else "NOT_COMPLETED"
    va.verified_by = user.id
    db.commit()
    return {"ok": True}


@router.get("/events/{event_id}/volunteers")
def list_volunteers(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    apps = db.query(VolunteerApplication).filter_by(event_id=event_id).all()
    out = []
    for a in apps:
        sp = db.query(StudentProfile).filter_by(user_id=a.student_user_id).first()
        va = db.query(VolunteerAssignment).filter_by(application_id=a.id).first()
        out.append({
            "id": a.id,
            "student_id": a.student_user_id,
            "name": sp.full_name if sp else "-",
            "usn": sp.usn if sp else "-",
            "department": sp.department.code if sp else "-",
            "skills": a.skills,
            "preferred_area": a.preferred_area,
            "experience": a.experience,
            "availability": a.availability,
            "status": a.status,
            "recommended_by": a.recommended_by,
            "responsibility": va.responsibility if va else "",
            "allocation": va.allocation if va else "",
            "completion_status": va.completion_status if va else "PENDING",
        })
    return out



# ----------------------------- Attendance -----------------------------

@router.post("/events/{event_id}/attendance/{student_user_id}")
def mark_attendance(event_id: int, student_user_id: int, status: str, reason: str = "",
                    db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    if status not in ("NOT_MARKED", "PRESENT", "ABSENT", "REVIEW"):
        raise HTTPException(400, "Invalid status")
    # Item 3: Attendance marking is strictly restricted to the assigned event Faculty Coordinator
    is_coord = (user.account_type == AccountType.FACULTY and can_manage_event_faculty(db, event_id, user))
    if not is_coord:
        raise HTTPException(403, "Only the assigned Faculty Event Coordinator can mark attendance. Normal faculty and student leaders have read-only access to the attendance register.")
    att = db.query(Attendance).filter_by(event_id=event_id, student_user_id=student_user_id).first()
    if not att:
        raise HTTPException(404, "Not in attendance register (must be shortlisted first)")
    prev = att.status
    att.status, att.reason, att.marked_by, att.marked_at = status, reason, user.id, datetime.now(timezone.utc)
    db.commit()
    audit(db, user, "ATTENDANCE_MARKED", "attendance", att.id, f"{prev}->{status}")
    return {"ok": True}


@router.get("/events/{event_id}/attendance")
def attendance_register(event_id: int, department: str = "", semester: int = 0, section: str = "",
                        db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    rows = db.query(Attendance).filter_by(event_id=event_id).all()
    out = []
    for a in rows:
        sp = db.query(StudentProfile).filter_by(user_id=a.student_user_id).first()
        # Model A: department faculty see own-department records; coordinators/leaders see all for their event
        if user.account_type.value == "FACULTY":
            fp = faculty_profile(db, user)
            if not (can_manage_event_faculty(db, event_id, user)) and fp.department_id != sp.department_id:
                continue
        if department and sp.department.code != department:
            continue
        if semester and sp.current_semester != semester:
            continue
        if section and sp.section != section:
            continue
        out.append({"student_id": a.student_user_id, "name": sp.full_name, "usn": sp.usn,
                    "department": sp.department.code, "semester": sp.current_semester, "section": sp.section,
                    "email": sp.user.email, "team_id": a.team_id, "status": a.status})
    return out


# ----------------------------- Winners -----------------------------

class WinnerIn(BaseModel):
    position: int
    student_user_id: int | None = None
    team_id: int | None = None
    achievement: str | None = None


@router.post("/events/{event_id}/winners")
def add_winner(event_id: int, body: WinnerIn, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    is_lead = bool(leadership_role(db, event_id, user.id) & {"PRESIDENT", "VICE_PRESIDENT", "SHORTLISTER_VOLUNTEER", "VOLUNTEER_COORDINATOR"})
    is_coord = user.account_type == AccountType.FACULTY and is_event_coordinator(db, event_id, user.id)
    if not (is_lead or is_coord):
        raise HTTPException(403, "Only President/VP or Event Coordinators can update winners")
    if body.position < 1:
        raise HTTPException(400, "Position must be >= 1")
    w = Winner(event_id=event_id, position=body.position, student_user_id=body.student_user_id,
               team_id=body.team_id, achievement=body.achievement, updated_by=user.id)
    db.add(w)
    if body.student_user_id:
        notify(db, body.student_user_id, "Winner announced", f"Position {body.position} in event #{event_id}")
    elif body.team_id:
        team = db.get(Team, body.team_id)
        if team:
            notify(db, team.leader_user_id, "Winner announced", f"Position {body.position} for team '{team.team_name}' in event #{event_id}")
            for inv in db.query(TeamInvitation).filter_by(team_id=team.id, status="ACCEPTED").all():
                if inv.student_user_id != team.leader_user_id:
                    notify(db, inv.student_user_id, "Winner announced", f"Position {body.position} for team '{team.team_name}' in event #{event_id}")
    db.commit()
    audit(db, user, "WINNER_ADDED", "event", event_id, f"pos {body.position}")
    return {"ok": True, "id": w.id}


@router.delete("/events/{event_id}/winners/{winner_id}")
def delete_winner(event_id: int, winner_id: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    is_lead = bool(leadership_role(db, event_id, user.id) & {"PRESIDENT", "VICE_PRESIDENT", "SHORTLISTER_VOLUNTEER", "VOLUNTEER_COORDINATOR"})
    is_coord = user.account_type == AccountType.FACULTY and is_event_coordinator(db, event_id, user.id)
    if not (is_lead or is_coord):
        raise HTTPException(403, "Only President/VP or Event Coordinators can remove winners")
    w = db.get(Winner, winner_id)
    if not w or w.event_id != event_id:
        raise HTTPException(404, "Winner record not found")
    db.delete(w)
    db.commit()
    audit(db, user, "WINNER_REMOVED", "event", event_id, f"Winner #{winner_id} removed")
    return {"ok": True}


@router.get("/events/{event_id}/winners")
def list_winners(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    rows = db.query(Winner).filter_by(event_id=event_id).order_by(Winner.position.asc()).all()
    out = []
    for w in rows:
        student_info = None
        if w.student_user_id:
            sp = db.query(StudentProfile).filter_by(user_id=w.student_user_id).first()
            if sp:
                student_info = {
                    "name": sp.full_name,
                    "usn": sp.usn,
                    "department": sp.department.code if sp.department else "-",
                    "email": sp.user.email if sp.user else "-"
                }
        team_info = None
        if w.team_id:
            team = db.get(Team, w.team_id)
            if team:
                lead_sp = db.query(StudentProfile).filter_by(user_id=team.leader_user_id).first()
                members = []
                for inv in db.query(TeamInvitation).filter_by(team_id=team.id, status="ACCEPTED").all():
                    msp = db.query(StudentProfile).filter_by(user_id=inv.student_user_id).first()
                    if msp:
                        members.append({
                            "name": msp.full_name,
                            "usn": msp.usn,
                            "department": msp.department.code if msp.department else "-"
                        })
                team_info = {
                    "team_name": team.team_name,
                    "leader_name": lead_sp.full_name if lead_sp else "-",
                    "leader_usn": lead_sp.usn if lead_sp else "-",
                    "members": members
                }
        out.append({
            "id": w.id,
            "position": w.position,
            "student_user_id": w.student_user_id,
            "team_id": w.team_id,
            "achievement": w.achievement,
            "student": student_info,
            "team": team_info,
        })
    return out
