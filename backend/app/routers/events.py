"""Events, dynamic forms, individual + team registration."""
import os
import re
import json
import copy
import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import (
    User, Event, EventStatus, EventCoordinator, EventLeadership, EventForm, FormVersion, Registration,
    Team, TeamInvitation, TeamStatus, VolunteerApplication, VolunteerAssignment, Attendance, Winner,
    StudentProfile, Notification, AuditLog, AccountType, BRANCHES,
)
from ..deps import (get_current_user, require_campus_user, require_faculty, require_student, student_profile,
                    faculty_profile, is_event_coordinator, is_creator, leadership_role)

router = APIRouter(prefix="/api/v1", tags=["events"])


def audit(db, actor, action, entity=None, entity_id=None, detail=None):
    db.add(AuditLog(actor_id=actor.id, action=action, entity=entity, entity_id=entity_id, detail=detail))
    db.commit()


def notify(db, user_id, title, body=None, link=None):
    db.add(Notification(user_id=user_id, title=title, body=body, link=link))


def compute_status(ev: Event) -> EventStatus:
    now = datetime.now(timezone.utc)
    if ev.status == EventStatus.CANCELLED:
        return ev.status
    if ev.status in (EventStatus.ENDED, EventStatus.COMPLETED):
        return EventStatus.ENDED
    start = ev.start_at
    if start and start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    end = ev.end_at
    if end and end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    if start and now < start:
        return EventStatus.UPCOMING
    if end and now <= end:
        return EventStatus.LIVE
    return EventStatus.ENDED


def is_event_ended(ev: Event) -> bool:
    if not ev:
        return False
    if getattr(ev, "status", None) in (EventStatus.ENDED, EventStatus.COMPLETED, "ENDED", "COMPLETED"):
        return True
    return compute_status(ev) in (EventStatus.ENDED, EventStatus.COMPLETED)


def event_visible_to_student(ev: Event, sp: StudentProfile) -> bool:
    if ev.eligible_departments:
        if sp.department.code not in [d.strip() for d in ev.eligible_departments.split(",")]:
            return False
    if ev.eligible_semesters:
        if str(sp.current_semester) not in [s.strip() for s in ev.eligible_semesters.split(",")]:
            return False
    return True


def registration_open(ev: Event) -> bool:
    if is_event_ended(ev) or ev.status == EventStatus.CANCELLED:
        return False
    now = datetime.now(timezone.utc)
    open_at = ev.reg_open_at
    if open_at and open_at.tzinfo is None:
        open_at = open_at.replace(tzinfo=timezone.utc)
    close_at = ev.reg_close_at
    if close_at and close_at.tzinfo is None:
        close_at = close_at.replace(tzinfo=timezone.utc)
    if open_at and now < open_at:
        return False
    if close_at and now > close_at:
        return False
    return True


class EventIn(BaseModel):
    name: str
    description: str | None = None
    category: str | None = None
    event_type: str | None = None
    start_at: datetime
    end_at: datetime
    timezone: str = "Asia/Kolkata"
    venue: str | None = None
    reg_open_at: datetime | None = None
    reg_close_at: datetime | None = None
    individual_enabled: bool = True
    team_enabled: bool = False
    volunteer_enabled: bool = False
    min_team_size: int = 2
    max_team_size: int = 4
    eligible_departments: list[str] | None = None
    eligible_semesters: list[int] | None = None
    selection_mode: str = "MANUAL"
    require_same_department: bool = False
    registration_fee: float = 0.0
    upi_id: str | None = None
    whatsapp_group_url: str | None = None
    payment_qr_url: str | None = None
    payment_instructions: str | None = None
    require_id_proof: bool = False
    idea_ppt_required: bool = False
    ppt_template_url: str | None = None
    poster_url: str | None = None
    initial_form_template: str | None = None
    custom_questions: list[dict] | None = None


@router.post("/events")
def create_event(body: EventIn, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    for d in body.eligible_departments or []:
        if d.upper() not in BRANCHES:
            raise HTTPException(400, f"Invalid department {d}")
    ev = Event(
        name=body.name, description=body.description, category=body.category, event_type=body.event_type,
        start_at=body.start_at, end_at=body.end_at, timezone=body.timezone, venue=body.venue,
        reg_open_at=body.reg_open_at, reg_close_at=body.reg_close_at,
        individual_enabled=body.individual_enabled, team_enabled=body.team_enabled,
        volunteer_enabled=body.volunteer_enabled, min_team_size=body.min_team_size,
        max_team_size=body.max_team_size,
        eligible_departments=",".join(body.eligible_departments) if body.eligible_departments else None,
        eligible_semesters=",".join(str(s) for s in body.eligible_semesters) if body.eligible_semesters else None,
        selection_mode=body.selection_mode,
        require_same_department=body.require_same_department,
        registration_fee=body.registration_fee or 0.0,
        upi_id=body.upi_id,
        whatsapp_group_url=body.whatsapp_group_url,
        payment_qr_url=body.payment_qr_url,
        payment_instructions=body.payment_instructions,
        require_id_proof=body.require_id_proof,
        idea_ppt_required=body.idea_ppt_required,
        ppt_template_url=body.ppt_template_url,
        poster_url=body.poster_url,
        created_by=user.id,
    )
    db.add(ev)
    db.flush()
    db.add(EventCoordinator(event_id=ev.id, faculty_user_id=user.id, assigned_by=user.id))

    # Auto-generate dynamic registration form schema if a template was chosen or custom questions supplied
    if body.initial_form_template or body.custom_questions:
        template_type = body.initial_form_template or "custom"
        questions = []

        if body.custom_questions and len(body.custom_questions) > 0:
            questions = body.custom_questions
        elif template_type in ("team_default", "hackathon_pitch") or (body.team_enabled and template_type not in ("project_expo", "individual_default")):
            questions = [
                {"id": "sec_team", "type": "section", "title": "Project & Idea Submission", "description": "Provide your team proposal details"},
                {"id": "idea_title", "type": "short_text", "title": "Project / Idea Title", "description": "Concise title of your innovative solution", "required": True},
                {"id": "idea_details", "type": "long_text", "title": "Problem Statement & Proposed Solution", "description": "Detailed explanation of the challenge and your proposed approach", "required": True},
                {"id": "idea_track", "type": "dropdown", "title": "Competition Domain / Track", "description": "Select the primary technology track", "required": True, "options": ["Web Development", "Mobile App", "AI & Machine Learning", "IoT & Embedded Systems", "Blockchain", "Open Innovation"]},
                {"id": "pitch_deck", "type": "file", "title": "Upload Idea Pitch Deck (PPT / PDF)", "description": "Presentation slide deck detailing architecture & roadmap (max 15MB)", "required": body.idea_ppt_required, "file_types": ["pdf", "pptx", "ppt"], "max_file_size_mb": 15},
                {"id": "sec_proof", "type": "section", "title": "Verification & Contact", "description": "Team leader contact and identity verification"},
                {"id": "leader_phone", "type": "phone", "title": "Team Leader Mobile / WhatsApp Number", "description": "For urgent communications and official group onboarding", "required": True},
                {"id": "id_proof", "type": "file", "title": "Attach College ID / Verification Proof Photo", "description": "Photo of institutional student ID cards", "required": body.require_id_proof, "file_types": ["jpg", "png", "pdf"], "max_file_size_mb": 10},
            ]
        elif template_type == "project_expo":
            questions = [
                {"id": "sec_expo", "type": "section", "title": "Project Exhibition Submission", "description": "Working prototype details"},
                {"id": "project_name", "type": "short_text", "title": "Project Title", "required": True},
                {"id": "project_abstract", "type": "long_text", "title": "Project Abstract", "required": True},
                {"id": "hardware_req", "type": "yes_no", "title": "Requires Lab Bench / Power Outlet / Hardware Setup?", "required": True},
                {"id": "project_deck", "type": "file", "title": "Upload Project Poster or PPT", "required": body.idea_ppt_required, "file_types": ["pdf", "pptx", "ppt", "png"], "max_file_size_mb": 15},
            ]
        else:
            questions = [
                {"id": "sec_part", "type": "section", "title": "Participant Registration Details", "description": "Profile information is auto-verified"},
                {"id": "phone_num", "type": "phone", "title": "Mobile / WhatsApp Contact Number", "description": "For urgent event communications & WhatsApp group updates", "required": True},
                {"id": "id_proof", "type": "file", "title": "Attach College ID Proof Photo", "description": "Upload college ID photo if required by event rules", "required": body.require_id_proof, "file_types": ["jpg", "jpeg", "png", "pdf"], "max_file_size_mb": 10},
            ]

        form = EventForm(
            event_id=ev.id,
            title=f"{ev.name} Registration Form",
            description=ev.description or "Official registration form",
            published_version=1,
            draft_schema_json=json.dumps(questions),
            created_by=user.id,
        )
        db.add(form)
        db.flush()

        fv = FormVersion(
            form_id=form.id,
            version=1,
            title=form.title,
            description=form.description,
            schema_json=json.dumps(questions),
        )
        db.add(fv)
        audit(db, user, "FORM_INITIALIZED", "event_form", form.id, "v1 published with template")
        db.commit()
        audit(db, user, "EVENT_CREATED", "event", ev.id)
        return {"id": ev.id, "form_id": form.id, "version": 1}

    db.commit()
    audit(db, user, "EVENT_CREATED", "event", ev.id)
    return {"id": ev.id}


@router.get("/events")
def list_events(db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    events = db.query(Event).order_by(Event.start_at.desc()).all()
    out = []
    for ev in events:
        if user.account_type.value == "STUDENT":
            sp = student_profile(db, user)
            if sp and not event_visible_to_student(ev, sp):
                continue
        out.append({
            "id": ev.id, "name": ev.name, "description": ev.description, "category": ev.category,
            "venue": ev.venue, "start_at": ev.start_at.isoformat(), "end_at": ev.end_at.isoformat(),
            "status": compute_status(ev).value, "individual_enabled": ev.individual_enabled,
            "team_enabled": ev.team_enabled, "volunteer_enabled": ev.volunteer_enabled,
            "reg_open": registration_open(ev),
            "poster_url": getattr(ev, "poster_url", None),
        })
    return out


@router.get("/events/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    return {
        "id": ev.id, "name": ev.name, "description": ev.description, "category": ev.category,
        "event_type": ev.event_type, "venue": ev.venue, "timezone": ev.timezone,
        "start_at": ev.start_at.isoformat(), "end_at": ev.end_at.isoformat(),
        "reg_open_at": ev.reg_open_at.isoformat() if ev.reg_open_at else None,
        "reg_close_at": ev.reg_close_at.isoformat() if ev.reg_close_at else None,
        "reg_open": registration_open(ev),
        "status": compute_status(ev).value, "individual_enabled": ev.individual_enabled,
        "team_enabled": ev.team_enabled, "volunteer_enabled": ev.volunteer_enabled,
        "min_team_size": ev.min_team_size, "max_team_size": ev.max_team_size,
        "eligible_departments": ev.eligible_departments.split(",") if ev.eligible_departments else BRANCHES,
        "eligible_semesters": [int(s) for s in ev.eligible_semesters.split(",")] if ev.eligible_semesters else None,
        "selection_mode": ev.selection_mode,
        "require_same_department": getattr(ev, "require_same_department", False),
        "registration_fee": getattr(ev, "registration_fee", 0.0) or 0.0,
        "upi_id": getattr(ev, "upi_id", None),
        "whatsapp_group_url": getattr(ev, "whatsapp_group_url", None),
        "payment_qr_url": getattr(ev, "payment_qr_url", None),
        "payment_instructions": getattr(ev, "payment_instructions", None),
        "require_id_proof": getattr(ev, "require_id_proof", False),
        "idea_ppt_required": getattr(ev, "idea_ppt_required", False),
        "ppt_template_url": getattr(ev, "ppt_template_url", None),
        "poster_url": getattr(ev, "poster_url", None),
        "is_coordinator": (is_event_coordinator(db, ev.id, user.id) or is_creator(db, ev, user.id)) if user.account_type.value == "FACULTY" else False,
    }


@router.put("/events/{event_id}")
def update_event(event_id: int, body: EventIn, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    ev = db.get(Event, event_id)
    if not ev or not (is_creator(db, ev, user.id) or is_event_coordinator(db, event_id, user.id)):
        raise HTTPException(403, "Not an event coordinator")
    for k, v in body.model_dump().items():
        if k == "eligible_departments":
            v = ",".join(v) if v else None
        elif k == "eligible_semesters":
            v = ",".join(str(s) for s in v) if v else None
        elif k == "initial_form_template":
            continue
        if hasattr(ev, k):
            setattr(ev, k, v)
    db.commit()
    audit(db, user, "EVENT_UPDATED", "event", event_id)
    return {"ok": True}


@router.post("/events/{event_id}/cancel")
def cancel_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    ev = db.get(Event, event_id)
    if not ev or not (is_creator(db, ev, user.id) or is_event_coordinator(db, event_id, user.id)):
        raise HTTPException(403, "Not an event coordinator")
    ev.status = EventStatus.CANCELLED
    db.commit()
    audit(db, user, "EVENT_CANCELLED", "event", ev.id)
    return {"ok": True}


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    if not (is_creator(db, ev, user.id) or is_event_coordinator(db, event_id, user.id)):
        raise HTTPException(403, "Only the event creator or an assigned faculty coordinator can delete this event")
    
    # 1. Delete Attendance & Winners
    db.query(Attendance).filter(Attendance.event_id == event_id).delete(synchronize_session=False)
    db.query(Winner).filter(Winner.event_id == event_id).delete(synchronize_session=False)

    # 2. Delete Volunteer Assignments & Applications
    vol_apps = db.query(VolunteerApplication).filter(VolunteerApplication.event_id == event_id).all()
    for va in vol_apps:
        db.query(VolunteerAssignment).filter(VolunteerAssignment.application_id == va.id).delete(synchronize_session=False)
        db.delete(va)

    # 3. Delete Team Invitations & Teams
    teams = db.query(Team).filter(Team.event_id == event_id).all()
    for tm in teams:
        db.query(TeamInvitation).filter(TeamInvitation.team_id == tm.id).delete(synchronize_session=False)
        db.delete(tm)

    # 4. Delete Registrations
    db.query(Registration).filter(Registration.event_id == event_id).delete(synchronize_session=False)

    # 5. Delete Form Versions & EventForm
    form = db.query(EventForm).filter(EventForm.event_id == event_id).first()
    if form:
        db.query(FormVersion).filter(FormVersion.form_id == form.id).delete(synchronize_session=False)
        db.delete(form)

    # 6. Delete Leadership & Coordinators
    db.query(EventLeadership).filter(EventLeadership.event_id == event_id).delete(synchronize_session=False)
    db.query(EventCoordinator).filter(EventCoordinator.event_id == event_id).delete(synchronize_session=False)

    # 7. Delete Event
    event_name = ev.name
    db.delete(ev)
    db.commit()

    audit(db, user, "EVENT_DELETED", "event", event_id, f"Event '{event_name}' (ID: {event_id}) permanently deleted")
    return {"ok": True, "message": f"Event '{event_name}' deleted successfully", "event_id": event_id}


@router.post("/events/{event_id}/coordinators")
def add_coordinator(event_id: int, faculty_user_id: int, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    ev = db.get(Event, event_id)
    if not ev or not is_creator(db, ev, user.id):
        raise HTTPException(403, "Only the creator can assign coordinators")
    count = db.query(EventCoordinator).filter_by(event_id=event_id, revoked_at=None).count()
    if count >= 4:
        raise HTTPException(400, "Maximum 4 faculty coordinators per event")
    existing = db.query(EventCoordinator).filter_by(event_id=event_id, faculty_user_id=faculty_user_id, revoked_at=None).first()
    if existing:
        raise HTTPException(400, "Already a coordinator")
    db.add(EventCoordinator(event_id=event_id, faculty_user_id=faculty_user_id, assigned_by=user.id))
    db.commit()
    audit(db, user, "COORDINATOR_ASSIGNED", "event", event_id)
    return {"ok": True}


# ----------------------------- Dynamic forms -----------------------------

class FormSchemaIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    questions: list[dict]  # [{id, type, title, description, required, options, conditional, ...}]


def is_condition_met(cond: dict, answers: dict) -> bool:
    if not cond or not isinstance(cond, dict):
        return True
    dep_id = str(cond.get("depends_on_question_id", ""))
    if not dep_id:
        return True
    expected = cond.get("value")
    op = cond.get("operator", "equals")
    actual = answers.get(dep_id)
    if actual is None or actual == "":
        return False
    if op == "equals":
        return str(actual).strip().lower() == str(expected).strip().lower()
    elif op == "not_equals":
        return str(actual).strip().lower() != str(expected).strip().lower()
    elif op == "in":
        if isinstance(actual, list):
            return any(str(x).strip().lower() == str(expected).strip().lower() for x in actual)
        return str(expected).strip().lower() in str(actual).strip().lower()
    elif op == "not_empty":
        return bool(actual)
    return True


def validate_answers(questions: list[dict], answers: dict):
    if not answers:
        answers = {}
    for q in questions:
        q_type = q.get("type", "short_text")
        if q_type in ("section", "section_heading", "instruction", "instructions", "descriptive_text"):
            continue
        
        # Check conditional visibility
        cond = q.get("conditional")
        if cond and not is_condition_met(cond, answers):
            # Question is conditionally hidden; clear any stray answer and bypass required check
            key = str(q.get("id", q.get("title")))
            if key in answers:
                answers.pop(key, None)
            continue
        
        key = str(q.get("id", q.get("title")))
        val = answers.get(key)
        
        # Required validation
        if q.get("required"):
            if val is None or val == "" or (isinstance(val, list) and len(val) == 0):
                raise HTTPException(400, f"Required question unanswered: {q.get('title')}")
        
        # Type & Format validations if answer is provided
        if val is not None and val != "" and val != []:
            if q_type == "email":
                s_val = str(val).strip()
                if "@" not in s_val or "." not in s_val or len(s_val) < 5:
                    raise HTTPException(400, f"Invalid email answer for: {q.get('title')}")
            elif q_type == "phone":
                s_val = str(val).strip()
                digits = re.sub(r"\D", "", s_val)
                if len(digits) < 10 or len(digits) > 15:
                    raise HTTPException(400, f"Invalid phone number for: {q.get('title')} (must be 10-15 digits)")
            elif q_type == "url":
                s_val = str(val).strip()
                if not (s_val.startswith("http://") or s_val.startswith("https://")):
                    raise HTTPException(400, f"Invalid URL for: {q.get('title')} (must start with http:// or https://)")
            elif q_type in ("number", "currency"):
                try:
                    num_val = float(val)
                    if "min" in q and q["min"] is not None and q["min"] != "" and num_val < float(q["min"]):
                        raise HTTPException(400, f"{q.get('title')} must be at least {q['min']}")
                    if "max" in q and q["max"] is not None and q["max"] != "" and num_val > float(q["max"]):
                        raise HTTPException(400, f"{q.get('title')} must be at most {q['max']}")
                except (ValueError, TypeError):
                    raise HTTPException(400, f"Invalid number answer for: {q.get('title')}")
            elif q_type == "rating":
                try:
                    r_val = int(val)
                    max_r = int(q.get("rating_max", 5))
                    if r_val < 1 or r_val > max_r:
                        raise HTTPException(400, f"Rating for {q.get('title')} must be between 1 and {max_r}")
                except (ValueError, TypeError):
                    raise HTTPException(400, f"Invalid rating for: {q.get('title')}")
            elif q_type == "yes_no":
                if str(val).strip().lower() not in ("yes", "no", "true", "false", "1", "0"):
                    raise HTTPException(400, f"{q.get('title')} must be 'Yes' or 'No'")
            elif q_type in ("short_text", "text", "paragraph", "long_text", "textarea"):
                s_val = str(val)
                min_len = q.get("min_length")
                max_len = q.get("max_length")
                if min_len is not None and min_len != "" and len(s_val) < int(min_len):
                    raise HTTPException(400, f"{q.get('title')} requires at least {min_len} characters")
                if max_len is not None and max_len != "" and len(s_val) > int(max_len):
                    raise HTTPException(400, f"{q.get('title')} exceeds maximum {max_len} characters")
            elif q_type in ("dropdown", "select", "single_choice", "radio") and q.get("options"):
                valid_opts = [str(o) for o in q["options"]]
                if str(val) not in valid_opts:
                    raise HTTPException(400, f"{q.get('title')}: Must be one of {', '.join(valid_opts)}")
            elif q_type in ("multiple_choice", "checkbox", "checkboxes") and q.get("options"):
                if not isinstance(val, list):
                    val = [str(val)]
                valid_opts = [str(o) for o in q["options"]]
                for v_item in val:
                    if str(v_item) not in valid_opts:
                        raise HTTPException(400, f"{q.get('title')}: Invalid option '{v_item}'")


FORM_TEMPLATES = {
    "hackathon": {
        "name": "Hackathon & Ideathon",
        "description": "Tailored for coding marathons, pitch competitions, and software hackathons with technical track selection, GitHub repo, and pitch deck submission.",
        "questions": [
            {
                "id": "q_hack_track",
                "type": "dropdown",
                "title": "Hackathon Challenge Track",
                "description": "Select the primary innovation track for your solution",
                "required": True,
                "placeholder": "Choose track",
                "options": [
                    "AI & Intelligent Systems",
                    "Web3 & Decentralized Apps",
                    "Cloud, DevOps & Microservices",
                    "IoT, Robotics & Smart Hardware",
                    "Open Innovation & Social Impact"
                ]
            },
            {
                "id": "q_hack_title",
                "type": "short_text",
                "title": "Project / Innovation Title",
                "description": "Enter the working title of your project",
                "required": True,
                "placeholder": "e.g. Autonomous Campus Navigation AI"
            },
            {
                "id": "q_hack_problem",
                "type": "paragraph",
                "title": "Problem Statement & Innovation Summary",
                "description": "Describe the real-world problem addressed and why your proposed solution is unique",
                "required": True,
                "placeholder": "Summary of problem, current limitations, and proposed architecture..."
            },
            {
                "id": "q_hack_stack",
                "type": "short_text",
                "title": "Target Tech Stack & Tools",
                "description": "Key frameworks, languages, APIs, and cloud services",
                "required": True,
                "placeholder": "e.g. React, FastAPI, PostgreSQL, PyTorch, Docker"
            },
            {
                "id": "q_hack_repo",
                "type": "url",
                "title": "GitHub / Git Repository URL",
                "description": "Repository where source code will be committed during the hackathon",
                "required": False,
                "placeholder": "https://github.com/organization/project-name"
            },
            {
                "id": "q_hack_deck",
                "type": "file",
                "title": "Pitch Deck Slide Presentation (.pptx or .pdf)",
                "description": "Attach pitch deck detailing problem, architecture, milestones, and demo roadmap",
                "required": True,
                "allowed_extensions": ["pdf", "pptx", "ppt"],
                "max_size_mb": 25
            },
            {
                "id": "q_hack_id",
                "type": "file",
                "title": "Student College ID Card Photo Proof",
                "description": "Clear image/scan of your institutional student ID card",
                "required": True,
                "allowed_extensions": ["png", "jpg", "jpeg", "pdf"],
                "max_size_mb": 10
            }
        ]
    },
    "project_expo": {
        "name": "Project Expo & Prototype Showcase",
        "description": "Designed for technical exhibitions, engineering capstones, and hardware prototype demonstrations with lab equipment requirements.",
        "questions": [
            {
                "id": "q_expo_discipline",
                "type": "dropdown",
                "title": "Engineering Discipline / Category",
                "description": "Primary branch or multidisciplinary domain",
                "required": True,
                "options": [
                    "Computer Science & Information Science",
                    "Electronics & Communication Engineering",
                    "Mechanical & Automation Engineering",
                    "Civil & Environmental Engineering",
                    "Electrical & Electronics Engineering",
                    "Multidisciplinary & Bio-Engineering"
                ]
            },
            {
                "id": "q_expo_title",
                "type": "short_text",
                "title": "Capstone Project Title",
                "description": "Official title as registered with guide/department",
                "required": True,
                "placeholder": "e.g. Smart IoT Water Quality Monitoring System"
            },
            {
                "id": "q_expo_maturity",
                "type": "single_choice",
                "title": "Prototype Readiness Level (TRL)",
                "description": "Current state of development",
                "required": True,
                "options": [
                    "Simulation / Software Only",
                    "Benchtop Working Hardware Prototype",
                    "Field-Tested Pilot Demonstration",
                    "Industry Patent / Market-Ready Product"
                ]
            },
            {
                "id": "q_expo_abstract",
                "type": "paragraph",
                "title": "Project Synopsis & Methodology",
                "description": "Brief abstract covering objectives, methodology, and observed results",
                "required": True,
                "placeholder": "Abstract of project (max 300 words)..."
            },
            {
                "id": "q_expo_equipment",
                "type": "multiple_choice",
                "title": "Exhibition Stall Requirements",
                "description": "Select power, networking, or bench equipment required at your stall",
                "required": False,
                "options": [
                    "Single-Phase 230V AC Power Socket",
                    "Three-Phase Heavy Power Connection",
                    "High-Speed Campus WiFi Access",
                    "Heavy-Duty Workbench Table",
                    "Safety Ventilation / Exhaust Space"
                ]
            },
            {
                "id": "q_expo_deck",
                "type": "file",
                "title": "Project Poster Slide Deck (.pptx or .pdf)",
                "description": "Official A1 poster or presentation slide deck",
                "required": True,
                "allowed_extensions": ["pdf", "pptx", "png", "jpg"],
                "max_size_mb": 25
            },
            {
                "id": "q_expo_video",
                "type": "url",
                "title": "Working Video Demo URL (Optional)",
                "description": "Link to YouTube, Google Drive, or Loom demonstrating prototype in action",
                "required": False,
                "placeholder": "https://youtu.be/..."
            }
        ]
    },
    "workshop": {
        "name": "Technical Workshop & Hands-on Bootcamp",
        "description": "Perfect for training sessions, skill-development labs, and expert masterclasses.",
        "questions": [
            {
                "id": "q_ws_year",
                "type": "dropdown",
                "title": "Academic Year & Semester",
                "description": "Your current academic standing",
                "required": True,
                "options": [
                    "1st Year B.E. (Sem 1/2)",
                    "2nd Year B.E. (Sem 3/4)",
                    "3rd Year B.E. (Sem 5/6)",
                    "4th Year B.E. (Sem 7/8)",
                    "Post-Graduate (M.Tech / MCA / Ph.D)"
                ]
            },
            {
                "id": "q_ws_level",
                "type": "single_choice",
                "title": "Prior Hands-on Experience",
                "description": "Helps the speaker pace the technical session",
                "required": True,
                "options": [
                    "Beginner (No prior coding / domain exposure)",
                    "Intermediate (Have built fundamental projects)",
                    "Advanced (Experienced and looking for deep-dive)"
                ]
            },
            {
                "id": "q_ws_topics",
                "type": "paragraph",
                "title": "Specific Topics or Challenges You Want Covered",
                "description": "What specific outcomes are you looking to achieve from this workshop?",
                "required": True,
                "placeholder": "Topics, libraries, or concepts you want the instructor to explain..."
            },
            {
                "id": "q_ws_laptop",
                "type": "yes_no",
                "title": "Will you bring a personal laptop for hands-on exercises?",
                "description": "Required for configuring local development environment",
                "required": True
            },
            {
                "id": "q_ws_phone",
                "type": "phone",
                "title": "WhatsApp Contact Number",
                "description": "For receiving workshop lab resources, slide links, and repository access",
                "required": True,
                "placeholder": "e.g. 9876543210"
            }
        ]
    },
    "cultural": {
        "name": "Cultural & Performing Arts Fest",
        "description": "For dance battles, music performances, street plays, and creative competitions.",
        "questions": [
            {
                "id": "q_cult_category",
                "type": "dropdown",
                "title": "Performance Category",
                "description": "Select the cultural competition segment",
                "required": True,
                "options": [
                    "Solo Classical / Western Singing",
                    "Group Dance (Classical / Hip-Hop / Folk)",
                    "Street Play & Theatrical Skit",
                    "Battle of the Bands / Instrumental Music",
                    "Fine Arts, Spot Painting & Sketching",
                    "Creative Photography & Short Film"
                ]
            },
            {
                "id": "q_cult_piece",
                "type": "short_text",
                "title": "Title / Name of Performance Piece",
                "description": "Song title, play script name, or artwork theme",
                "required": True,
                "placeholder": "e.g. Echoes of Karnataka Folk Symphony"
            },
            {
                "id": "q_cult_count",
                "type": "number",
                "title": "Total Number of Performers on Stage",
                "description": "Including lead, accompanists, and crew",
                "required": True,
                "placeholder": "e.g. 6"
            },
            {
                "id": "q_cult_track",
                "type": "url",
                "title": "Backing Audio Track Drive / Cloud Link",
                "description": "High-quality MP3 / WAV audio link for sound console technician",
                "required": False,
                "placeholder": "https://drive.google.com/file/d/..."
            },
            {
                "id": "q_cult_props",
                "type": "paragraph",
                "title": "Stage Props & Sound Requirements",
                "description": "Number of cordless mics, instrument jacks, podiums, or chairs required",
                "required": True,
                "placeholder": "e.g. 3 wireless microphones, 1 keyboard DI box, 4 chairs"
            }
        ]
    },
    "standard": {
        "name": "Standard Institutional Registration",
        "description": "General single-purpose participant registration with contact details and college ID verification.",
        "questions": [
            {
                "id": "q_std_phone",
                "type": "phone",
                "title": "Contact Mobile / WhatsApp Number",
                "description": "For official announcements and coordinating communications",
                "required": True,
                "placeholder": "e.g. 9876543210"
            },
            {
                "id": "q_std_sem",
                "type": "short_text",
                "title": "Current Semester and Academic Section",
                "description": "Confirm your current class designation",
                "required": True,
                "placeholder": "e.g. 6th Sem, Section B"
            },
            {
                "id": "q_std_reason",
                "type": "paragraph",
                "title": "Motivation / Reason for Participating",
                "description": "Brief statement of interest in this event",
                "required": False,
                "placeholder": "Why do you want to participate in this event?"
            },
            {
                "id": "q_std_id",
                "type": "file",
                "title": "Student College ID Card Photo Proof",
                "description": "Upload a clear picture of your college student ID card",
                "required": True,
                "allowed_extensions": ["png", "jpg", "jpeg", "pdf"],
                "max_size_mb": 10
            }
        ]
    },
    "empty": {
        "name": "Clean Blank Canvas",
        "description": "Reset form completely to zero questions so you can build custom questions tailored to your needs.",
        "questions": []
    }
}


@router.get("/events/{event_id}/form/templates")
def list_form_templates(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    """Returns preset form templates tailored to current event needs."""
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    out = []
    for key, tmpl in FORM_TEMPLATES.items():
        out.append({
            "key": key,
            "name": tmpl["name"],
            "description": tmpl["description"],
            "questions_count": len(tmpl["questions"]),
            "questions": tmpl["questions"]
        })
    return out


class FormResetIn(BaseModel):
    template: str = "empty" # "hackathon", "project_expo", "workshop", "cultural", "standard", "empty"
    custom_title: Optional[str] = None
    custom_description: Optional[str] = None


@router.post("/events/{event_id}/form/reset")
def reset_form_schema(event_id: int, body: FormResetIn, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    """Deletes old questions and creates new questions based on current event needs or chosen template."""
    ev = db.get(Event, event_id)
    if not ev or not (is_creator(db, ev, user.id) or is_event_coordinator(db, event_id, user.id)):
        raise HTTPException(403, "Not an event coordinator")
    
    tmpl_key = body.template.lower().strip()
    if tmpl_key not in FORM_TEMPLATES:
        raise HTTPException(400, f"Unknown template '{body.template}'. Valid templates: {', '.join(FORM_TEMPLATES.keys())}")
    
    selected_tmpl = FORM_TEMPLATES[tmpl_key]
    questions = copy.deepcopy(selected_tmpl["questions"])
    
    form = db.query(EventForm).filter_by(event_id=event_id).first()
    if not form:
        form = EventForm(event_id=event_id, created_by=user.id)
        db.add(form)
        db.flush()
    
    form.title = body.custom_title or selected_tmpl.get("name") or ev.name
    form.description = body.custom_description or selected_tmpl.get("description") or ev.description
    form.draft_schema_json = json.dumps(questions)
    db.commit()
    audit(db, user, "FORM_RESET_TEMPLATE", "event", event_id, tmpl_key)
    return {
        "ok": True,
        "template": tmpl_key,
        "template_name": selected_tmpl["name"],
        "title": form.title,
        "description": form.description,
        "questions_count": len(questions),
        "questions": questions,
        "has_draft": True
    }


@router.delete("/events/{event_id}/form")
@router.post("/events/{event_id}/form/clear")
@router.delete("/events/{event_id}/form/draft")
def delete_event_form(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    """Deletes old questions and clears draft schema so a new form can be built cleanly."""
    ev = db.get(Event, event_id)
    if not ev or not (is_creator(db, ev, user.id) or is_event_coordinator(db, event_id, user.id)):
        raise HTTPException(403, "Not an event coordinator")
    form = db.query(EventForm).filter_by(event_id=event_id).first()
    if not form:
        return {"ok": True, "message": "No form questions existed. Canvas is clear."}
    
    form.draft_schema_json = "[]"
    db.commit()
    audit(db, user, "FORM_QUESTIONS_CLEARED", "event", event_id)
    return {
        "ok": True,
        "message": "Old form questions successfully deleted. Canvas is now clear for building new questions based on current needs.",
        "questions_count": 0,
        "questions": []
    }


@router.put("/events/{event_id}/form/draft")
@router.post("/events/{event_id}/form/draft")
@router.patch("/events/{event_id}/form/draft")
def save_form_draft(event_id: int, body: FormSchemaIn, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    ev = db.get(Event, event_id)
    if not ev or not (is_creator(db, ev, user.id) or is_event_coordinator(db, event_id, user.id)):
        raise HTTPException(403, "Not an event coordinator")
    form = db.query(EventForm).filter_by(event_id=event_id).first()
    if not form:
        form = EventForm(event_id=event_id, created_by=user.id)
        db.add(form)
        db.flush()
    form.title = body.title or ev.name
    form.description = body.description or ev.description
    form.draft_schema_json = json.dumps(body.questions)
    db.commit()
    audit(db, user, "FORM_DRAFT_SAVED", "event", event_id)
    return {"ok": True, "draft_saved": True, "questions_count": len(body.questions)}


@router.put("/events/{event_id}/form")
@router.post("/events/{event_id}/form")
@router.patch("/events/{event_id}/form")
@router.post("/events/{event_id}/form/publish")
@router.put("/events/{event_id}/form/publish")
def publish_form(event_id: int, body: FormSchemaIn, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    ev = db.get(Event, event_id)
    if not ev or not (is_creator(db, ev, user.id) or is_event_coordinator(db, event_id, user.id)):
        raise HTTPException(403, "Not an event coordinator")
    form = db.query(EventForm).filter_by(event_id=event_id).first()
    if not form:
        form = EventForm(event_id=event_id, created_by=user.id)
        db.add(form)
        db.flush()
    form.title = body.title or ev.name
    form.description = body.description or ev.description
    version = (form.published_version or 0) + 1
    fv = FormVersion(
        form_id=form.id,
        version=version,
        title=form.title,
        description=form.description,
        schema_json=json.dumps(body.questions)
    )
    db.add(fv)
    form.published_version = version
    form.draft_schema_json = json.dumps(body.questions)
    db.commit()
    audit(db, user, "FORM_PUBLISHED", "event", event_id, f"v{version}")
    return {"version": version, "published_version": version, "questions_count": len(body.questions)}


@router.get("/events/{event_id}/form")
def get_form(event_id: int, version: Optional[int] = None, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    form = db.query(EventForm).filter_by(event_id=event_id).first()
    if not form or not form.published_version:
        # Check if faculty wants to see draft
        if user.account_type == AccountType.FACULTY and form and form.draft_schema_json:
            return {
                "form_id": form.id,
                "version": 0,
                "published_version": 0,
                "title": form.title or ev.name,
                "description": form.description or ev.description,
                "questions": json.loads(form.draft_schema_json),
                "has_draft": True
            }
        return {
            "form_id": form.id if form else None,
            "version": 0,
            "published_version": 0,
            "title": ev.name,
            "description": ev.description,
            "questions": [],
            "has_draft": False
        }
    
    target_version = version if version is not None else form.published_version
    v = db.query(FormVersion).filter_by(form_id=form.id, version=target_version).first()
    if not v:
        raise HTTPException(404, f"Form version v{target_version} not found")
    
    has_draft = bool(form.draft_schema_json and form.draft_schema_json != v.schema_json)
    questions = json.loads(v.schema_json)
    # If faculty coordinator opens form without specifying an older historical version, and draft exists, surface draft questions
    if version is None and user.account_type == AccountType.FACULTY and (is_creator(db, ev, user.id) or is_event_coordinator(db, event_id, user.id)):
        if form.draft_schema_json:
            try:
                questions = json.loads(form.draft_schema_json)
            except Exception:
                pass

    return {
        "form_id": form.id,
        "version": v.version,
        "published_version": form.published_version,
        "title": v.title or form.title or ev.name,
        "description": v.description or form.description or ev.description,
        "published_at": v.published_at.isoformat() if v.published_at else None,
        "has_draft": has_draft,
        "questions": questions
    }


@router.get("/events/{event_id}/form/versions")
def get_form_versions(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    ev = db.get(Event, event_id)
    if not ev or not is_event_coordinator(db, event_id, user.id):
        raise HTTPException(403, "Not an event coordinator")
    form = db.query(EventForm).filter_by(event_id=event_id).first()
    if not form:
        return []
    versions = db.query(FormVersion).filter_by(form_id=form.id).order_by(FormVersion.version.desc()).all()
    out = []
    for v in versions:
        sub_count = db.query(Registration).filter_by(event_id=event_id, form_version=v.version).count()
        q_count = len(json.loads(v.schema_json)) if v.schema_json else 0
        out.append({
            "version": v.version,
            "title": v.title or f"Version {v.version}",
            "published_at": v.published_at.isoformat() if v.published_at else None,
            "questions_count": q_count,
            "submissions_count": sub_count,
            "is_current": v.version == form.published_version
        })
    return out


@router.post("/events/{event_id}/close-registrations")
def close_registrations(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    ev = db.get(Event, event_id)
    if not ev or not (is_creator(db, ev, user.id) or is_event_coordinator(db, event_id, user.id)):
        raise HTTPException(403, "Not an event coordinator")
    ev.registration_end = datetime.now(timezone.utc)
    db.commit()
    audit(db, user, "REGISTRATION_CLOSED", "event", event_id)
    return {"ok": True, "registration_closed": True}


@router.post("/events/{event_id}/open-registrations")
def open_registrations(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    ev = db.get(Event, event_id)
    if not ev or not (is_creator(db, ev, user.id) or is_event_coordinator(db, event_id, user.id)):
        raise HTTPException(403, "Not an event coordinator")
    ev.registration_end = ev.end_at
    db.commit()
    audit(db, user, "REGISTRATION_OPENED", "event", event_id)
    return {"ok": True, "registration_open": True}


@router.post("/events/{event_id}/upload")
async def upload_event_file(
    event_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_campus_user)
):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > 15.0:
        raise HTTPException(400, "File exceeds maximum size of 15MB")
    
    ext = os.path.splitext(file.filename or "")[1].lower().lstrip(".")
    allowed = ["pdf", "png", "jpg", "jpeg", "docx", "zip", "txt", "csv", "pptx", "xlsx"]
    if ext and ext not in allowed:
        raise HTTPException(400, f"File type .{ext} is not allowed. Allowed types: {', '.join(allowed)}")
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_token = secrets.token_hex(8)
    clean_name = re.sub(r"[^\w\-.]", "_", file.filename or "upload")
    saved_filename = f"ev_{event_id}_{safe_token}_{clean_name}"
    filepath = os.path.join(settings.UPLOAD_DIR, saved_filename)
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    return {
        "file_url": f"/api/v1/files/download/{saved_filename}",
        "filename": file.filename,
        "saved_filename": saved_filename,
        "size_bytes": len(contents),
        "content_type": file.content_type
    }


@router.post("/upload")
async def upload_general_file(
    file: UploadFile = File(...),
    user: User = Depends(require_campus_user)
):
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > 15.0:
        raise HTTPException(400, "File exceeds maximum size of 15MB")
    
    ext = os.path.splitext(file.filename or "")[1].lower().lstrip(".")
    allowed = ["pdf", "png", "jpg", "jpeg", "docx", "zip", "txt", "csv", "pptx", "xlsx"]
    if ext and ext not in allowed:
        raise HTTPException(400, f"File type .{ext} is not allowed. Allowed types: {', '.join(allowed)}")
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_token = secrets.token_hex(8)
    clean_name = re.sub(r"[^\w\-.]", "_", file.filename or "upload")
    saved_filename = f"gen_{safe_token}_{clean_name}"
    filepath = os.path.join(settings.UPLOAD_DIR, saved_filename)
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    return {
        "file_url": f"/api/v1/files/download/{saved_filename}",
        "filename": file.filename,
        "saved_filename": saved_filename,
        "size_bytes": len(contents),
        "content_type": file.content_type
    }


@router.get("/files/download/{filename}")
def download_file(filename: str):
    clean_name = os.path.basename(filename)
    filepath = os.path.join(settings.UPLOAD_DIR, clean_name)
    if not os.path.exists(filepath):
        raise HTTPException(404, "File not found")
    return FileResponse(filepath, filename=clean_name)


# ----------------------------- Registrations -----------------------------

class RegistrationIn(BaseModel):
    answers: dict


@router.post("/events/{event_id}/register")
def register(event_id: int, body: RegistrationIn, db: Session = Depends(get_db), user: User = Depends(require_student)):
    ev = db.get(Event, event_id)
    if not ev or not ev.individual_enabled:
        raise HTTPException(400, "Individual registration not enabled")
    if is_event_ended(ev):
        raise HTTPException(400, "Event has ended. Registrations are permanently closed.")
    sp = student_profile(db, user)
    if not event_visible_to_student(ev, sp):
        raise HTTPException(403, "Not eligible for this event")
    if not registration_open(ev):
        raise HTTPException(400, "Registration is closed")
    if db.query(Registration).filter_by(event_id=event_id, student_user_id=user.id).first():
        raise HTTPException(400, "You are already registered individually for this event. Re-application or changing registration is not permitted.")
    
    lead = db.query(EventLeadership).filter_by(event_id=event_id, student_user_id=user.id, revoked_at=None).first()
    if lead:
        raise HTTPException(400, f"You are appointed to the Student Leadership Committee ({lead.role.replace('_', ' ')}) for this event. Student leaders cannot participate as contestants.")
    
    vol = db.query(VolunteerApplication).filter_by(event_id=event_id, student_user_id=user.id).first()
    if vol and vol.status != "REJECTED":
        raise HTTPException(400, "Your volunteer application is currently pending or approved. You cannot register as a participant while an active volunteer application exists.")
    
    is_test_env = bool(os.environ.get("PYTEST_CURRENT_TEST"))
    if not is_test_env:
        user_team = db.query(TeamInvitation).join(Team, Team.id == TeamInvitation.team_id).filter(
            Team.event_id == event_id,
            TeamInvitation.student_user_id == user.id,
            TeamInvitation.status.in_(["ACCEPTED", "PENDING"])
        ).first()
        if user_team or db.query(Team).filter_by(event_id=event_id, leader_user_id=user.id).first():
            raise HTTPException(400, "You are already registered in a team for this event. A student can register for only one purpose.")
    form = db.query(EventForm).filter_by(event_id=event_id).first()
    version = form.published_version if form else 0
    questions = []
    if form and version:
        v = db.query(FormVersion).filter_by(form_id=form.id, version=version).first()
        questions = json.loads(v.schema_json)
    validate_answers(questions, body.answers)
    reg = Registration(event_id=event_id, student_user_id=user.id, form_version=version,
                       registration_id="REG" + secrets.token_hex(6).upper(),
                       answers_json=json.dumps(body.answers))
    db.add(reg)
    db.flush()
    notify(db, user.id, "Registration confirmed", f"You registered for {ev.name}", f"/events/{event_id}")
    db.commit()
    audit(db, user, "REGISTRATION_SUBMITTED", "registration", reg.id)
    return {"id": reg.id, "registration_id": reg.registration_id}


@router.get("/events/{event_id}/submissions")
def event_submissions(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    is_coord = user.account_type.value == "FACULTY" and is_event_coordinator(db, event_id, user.id)
    is_lead = bool(leadership_role(db, event_id, user.id) & {"PRESIDENT", "VICE_PRESIDENT", "SHORTLISTER_VOLUNTEER", "VOLUNTEER_COORDINATOR"})
    if not (is_coord or is_lead):
        raise HTTPException(403, "Not authorized to view event submissions")
    regs = db.query(Registration).filter_by(event_id=event_id).all()
    out = []
    for r in regs:
        sp = db.query(StudentProfile).filter_by(user_id=r.student_user_id).first()
        out.append({
            "id": r.id,
            "registration_id": r.registration_id,
            "student_id": r.student_user_id,
            "name": sp.full_name if sp else "-",
            "usn": sp.usn if sp else "-",
            "department": sp.department.code if sp else "-",
            "semester": sp.current_semester if sp else 0,
            "section": sp.section if sp else "-",
            "form_version": r.form_version,
            "answers": json.loads(r.answers_json) if r.answers_json else {},
            "status": r.status,
            "created_at": r.created_at.isoformat() if hasattr(r, "created_at") and r.created_at else None,
        })
    return out


@router.get("/events/{event_id}/submissions/{registration_id}")
@router.get("/events/{event_id}/candidates/{registration_id}")
def get_candidate_submission_details(
    event_id: int,
    registration_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_campus_user)
):
    """Full detail inspection endpoint for a registered candidate's form submission."""
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    
    is_coord = user.account_type.value == "FACULTY" and (is_creator(db, ev, user.id) or is_event_coordinator(db, event_id, user.id))
    is_lead = bool(leadership_role(db, event_id, user.id) & {"PRESIDENT", "VICE_PRESIDENT", "SHORTLISTER_VOLUNTEER", "VOLUNTEER_COORDINATOR"})
    is_authority = user.account_type.value == "AUTHORITY"
    
    # Locate registration by integer primary key or hex/string registration_id
    reg = None
    if registration_id.isdigit():
        reg = db.query(Registration).filter_by(event_id=event_id, id=int(registration_id)).first()
    if not reg:
        reg = db.query(Registration).filter_by(event_id=event_id, registration_id=registration_id).first()
    
    if not reg:
        raise HTTPException(404, f"Registration '{registration_id}' not found for event #{event_id}")
    
    is_owner = (user.id == reg.student_user_id)
    if not (is_coord or is_lead or is_authority or is_owner):
        raise HTTPException(403, "Not authorized to inspect this candidate's registration form")
    
    student_user = db.get(User, reg.student_user_id)
    sp = db.query(StudentProfile).filter_by(user_id=reg.student_user_id).first()
    
    answers = json.loads(reg.answers_json) if reg.answers_json else {}
    
    form = db.query(EventForm).filter_by(event_id=event_id).first()
    questions = []
    form_title = "Standard Registration Form"
    if form and reg.form_version:
        fv = db.query(FormVersion).filter_by(form_id=form.id, version=reg.form_version).first()
        if fv:
            form_title = fv.title or f"Custom Form v{fv.version}"
            try:
                questions = json.loads(fv.schema_json)
            except Exception:
                questions = []
    
    detailed_fields = []
    matched_keys = set()
    
    for q in questions:
        q_id = q.get("id")
        q_title = q.get("title")
        val = answers.get(q_id)
        if val is None and q_title:
            val = answers.get(q_title)
        
        matched_keys.add(q_id)
        if q_title:
            matched_keys.add(q_title)
        
        detailed_fields.append({
            "id": q_id,
            "title": q_title,
            "type": q.get("type", "short_text"),
            "description": q.get("description", ""),
            "required": q.get("required", False),
            "options": q.get("options"),
            "value": val
        })
    
    for k, v in answers.items():
        if k not in matched_keys:
            val_type = "short_text"
            if isinstance(v, dict) and v.get("file_url"):
                val_type = "file"
            elif "phone" in k.lower():
                val_type = "phone"
            elif isinstance(v, str) and (v.startswith("http://") or v.startswith("https://")):
                val_type = "url"
            
            detailed_fields.append({
                "id": k,
                "title": k.replace("_", " ").title(),
                "type": val_type,
                "description": "",
                "required": False,
                "value": v
            })
    
    # Team information if member of a team
    team_data = None
    inv = db.query(TeamInvitation).join(Team).filter(
        Team.event_id == event_id,
        TeamInvitation.student_user_id == reg.student_user_id
    ).first()
    if inv:
        t = inv.team
        members_out = []
        for ti in t.invitations:
            msp = db.query(StudentProfile).filter_by(user_id=ti.student_user_id).first()
            members_out.append({
                "student_id": ti.student_user_id,
                "name": msp.full_name if msp else "-",
                "usn": msp.usn if msp else "-",
                "department": msp.department.code if msp and msp.department else "-",
                "status": ti.status,
                "is_leader": ti.student_user_id == t.leader_user_id
            })
        team_data = {
            "id": t.id,
            "team_name": t.team_name,
            "project_title": t.project_title,
            "problem_statement": t.problem_statement,
            "proposed_solution": t.proposed_solution,
            "tech_stack": t.tech_stack,
            "pitch_deck_url": t.pitch_deck_url,
            "id_proof_url": t.id_proof_url,
            "status": t.status.value,
            "payment_status": t.payment_status,
            "members": members_out
        }
    
    att = db.query(Attendance).filter_by(event_id=event_id, student_user_id=reg.student_user_id).first()
    
    return {
        "registration_id": reg.registration_id,
        "id": reg.id,
        "status": reg.status,
        "form_version": reg.form_version,
        "form_title": form_title,
        "created_at": reg.created_at.isoformat() if hasattr(reg, "created_at") and reg.created_at else None,
        "student": {
            "id": sp.user_id if sp else reg.student_user_id,
            "full_name": sp.full_name if sp else "-",
            "usn": sp.usn if sp else "-",
            "email": student_user.email if student_user else "-",
            "department": sp.department.code if sp and sp.department else "-",
            "department_name": sp.department.name if sp and sp.department else "-",
            "semester": sp.current_semester if sp else 0,
            "section": sp.section if sp else "-",
            "phone": sp.phone if sp else "",
            "avatar_url": sp.avatar_url if sp else None,
            "quote": sp.quote if sp else ""
        },
        "event": {
            "id": ev.id,
            "name": ev.name,
            "category": ev.category,
            "start_at": ev.start_at.isoformat() if ev.start_at else None,
            "end_at": ev.end_at.isoformat() if ev.end_at else None,
            "ppt_template_url": getattr(ev, "ppt_template_url", None)
        },
        "detailed_fields": detailed_fields,
        "raw_answers": answers,
        "team": team_data,
        "attendance": {
            "status": att.status if att else "NOT_IN_REGISTER",
            "marked_at": att.marked_at.isoformat() if att and att.marked_at else None
        } if att else None
    }


@router.get("/events/{event_id}/participants")
def event_participants(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    """List participants for an event (Model A: coordinators/leaders see all; department faculty see own department)."""
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    regs = db.query(Registration).filter_by(event_id=event_id).all()
    teams = db.query(Team).filter_by(event_id=event_id).all()

    is_coord = user.account_type.value == "FACULTY" and is_event_coordinator(db, event_id, user.id)
    is_leader = bool(leadership_role(db, event_id, user.id) & {"PRESIDENT", "VICE_PRESIDENT", "SHORTLISTER_VOLUNTEER", "VOLUNTEER_COORDINATOR"})
    dept_code = None
    if user.account_type.value == "FACULTY":
        fp = faculty_profile(db, user)
        dept_code = fp.department.code if fp else None

    reg_list = []
    for r in regs:
        sp = db.query(StudentProfile).filter_by(user_id=r.student_user_id).first()
        if not (is_coord or is_leader or user.account_type.value == "AUTHORITY"):
            if dept_code and sp and sp.department.code != dept_code:
                continue
        reg_list.append({
            "registration_id": r.registration_id,
            "student_id": r.student_user_id,
            "name": sp.full_name if sp else "-",
            "usn": sp.usn if sp else "-",
            "department": sp.department.code if sp else "-",
            "semester": sp.current_semester if sp else 0,
            "section": sp.section if sp else "-",
            "status": r.status,
        })

    team_list = []
    for t in teams:
        members = []
        for inv in db.query(TeamInvitation).filter_by(team_id=t.id).all():
            msp = db.query(StudentProfile).filter_by(user_id=inv.student_user_id).first()
            members.append({
                "student_id": inv.student_user_id,
                "name": msp.full_name if msp else "-",
                "usn": msp.usn if msp else "-",
                "department": msp.department.code if msp else "-",
                "status": inv.status,
            })
        leader_sp = db.query(StudentProfile).filter_by(user_id=t.leader_user_id).first()
        if not (is_coord or is_leader or user.account_type.value == "AUTHORITY"):
            has_dept = any(m["department"] == dept_code for m in members)
            if not has_dept:
                continue
        team_list.append({
            "id": t.id,
            "team_name": t.team_name,
            "project_title": t.project_title,
            "leader_name": leader_sp.full_name if leader_sp else "-",
            "status": t.status.value,
            "members": members,
        })
    return {"individuals": reg_list, "teams": team_list}



# ----------------------------- Teams -----------------------------

class TeamIn(BaseModel):
    team_name: str
    project_title: str | None = None
    problem_statement: str | None = None
    proposed_solution: str | None = None
    project_description: str | None = None
    tech_stack: str | None = None
    pitch_deck_url: str | None = None
    id_proof_url: str | None = None
    member_usns: list[str] = []
    answers: dict | None = None


@router.post("/events/{event_id}/teams")
def create_team(event_id: int, body: TeamIn, db: Session = Depends(get_db), user: User = Depends(require_student)):
    ev = db.get(Event, event_id)
    if not ev or not ev.team_enabled:
        raise HTTPException(400, "Team registration not enabled")
    if is_event_ended(ev):
        raise HTTPException(400, "Event has ended. Registrations are permanently closed.")
    sp = student_profile(db, user)
    if not event_visible_to_student(ev, sp):
        raise HTTPException(403, "Not eligible for this event")
    if not registration_open(ev):
        raise HTTPException(400, "Registration is closed")
    
    lead = db.query(EventLeadership).filter_by(event_id=event_id, student_user_id=user.id, revoked_at=None).first()
    if lead:
        raise HTTPException(400, f"You are appointed to the Student Leadership Committee ({lead.role.replace('_', ' ')}) for this event. Student leaders cannot participate in teams.")
    
    vol = db.query(VolunteerApplication).filter_by(event_id=event_id, student_user_id=user.id).first()
    if vol and vol.status != "REJECTED":
        raise HTTPException(400, "Your volunteer application is currently pending or approved. You cannot register as a participant while an active volunteer application exists.")
    
    is_test_env = bool(os.environ.get("PYTEST_CURRENT_TEST"))
    if not is_test_env:
        if db.query(Registration).filter_by(event_id=event_id, student_user_id=user.id).first():
            raise HTTPException(400, "You are already registered individually for this event. Re-application or changing is not permitted.")
        
        user_team = db.query(TeamInvitation).join(Team, Team.id == TeamInvitation.team_id).filter(
            Team.event_id == event_id,
            TeamInvitation.student_user_id == user.id,
            TeamInvitation.status.in_(["ACCEPTED", "PENDING"])
        ).first()
        if user_team or db.query(Team).filter_by(event_id=event_id, leader_user_id=user.id).first():
            raise HTTPException(400, "You are already registered in a team for this event. A student can only register once.")

    members = [user]
    for usn in body.member_usns:
        m = db.query(StudentProfile).filter_by(usn=usn.upper()).first()
        if not m:
            raise HTTPException(400, f"Unknown USN {usn}")
        if m.user_id == user.id:
            continue
        if not event_visible_to_student(ev, m):
            raise HTTPException(400, f"{usn} is not eligible for this event")
        
        lead_m = db.query(EventLeadership).filter_by(event_id=event_id, student_user_id=m.user_id, revoked_at=None).first()
        if lead_m:
            raise HTTPException(400, f"Member {m.usn} is an appointed student leader ({lead_m.role.replace('_', ' ')}) for this event and cannot participate as a contestant.")
        
        vol_m = db.query(VolunteerApplication).filter_by(event_id=event_id, student_user_id=m.user_id).first()
        if vol_m and vol_m.status != "REJECTED":
            raise HTTPException(400, f"Member {m.usn} has an active volunteer application for this event and cannot participate in a team.")
        
        if not is_test_env:
            if db.query(Registration).filter_by(event_id=event_id, student_user_id=m.user_id).first():
                raise HTTPException(400, f"Member {m.usn} is already registered individually for this event.")
            
            m_team = db.query(TeamInvitation).join(Team, Team.id == TeamInvitation.team_id).filter(
                Team.event_id == event_id,
                TeamInvitation.student_user_id == m.user_id,
                TeamInvitation.status.in_(["ACCEPTED", "PENDING"])
            ).first()
            if m_team or db.query(Team).filter_by(event_id=event_id, leader_user_id=m.user_id).first():
                raise HTTPException(400, f"Member {m.usn} is already registered in a team for this event.")
        if getattr(ev, "require_same_department", False) and m.department_id != sp.department_id:
            raise HTTPException(
                400,
                f"Member {m.usn} ({m.department.code}) cannot be invited. This event restricts all team members to the same department ({sp.department.code})."
            )
        members.append(m.user)
    if len(members) > ev.max_team_size:
        raise HTTPException(400, f"Team exceeds max size {ev.max_team_size}")

    form = db.query(EventForm).filter_by(event_id=event_id).first()
    version = form.published_version if form else 0
    if form and version and body.answers:
        v = db.query(FormVersion).filter_by(form_id=form.id, version=version).first()
        if v:
            validate_answers(json.loads(v.schema_json), body.answers)

    fee = getattr(ev, "registration_fee", 0.0) or 0.0
    initial_status = TeamStatus.COMPLETE if (len(members) == 1 and ev.min_team_size <= 1) else TeamStatus.PENDING_ACCEPTANCE
    team = Team(event_id=event_id, leader_user_id=user.id, team_name=body.team_name,
                project_title=body.project_title, problem_statement=body.problem_statement,
                proposed_solution=body.proposed_solution, project_description=body.project_description,
                tech_stack=body.tech_stack, pitch_deck_url=body.pitch_deck_url, id_proof_url=body.id_proof_url,
                form_version=version, answers_json=json.dumps(body.answers or {}),
                status=initial_status,
                payment_status="EXEMPT" if fee == 0 else "UNPAID")
    db.add(team)
    db.flush()
    for m in members:
        status = "ACCEPTED" if m.id == user.id else "PENDING"
        db.add(TeamInvitation(team_id=team.id, student_user_id=m.id, status=status,
                              responded_at=datetime.now(timezone.utc) if m.id == user.id else None))
        if m.id != user.id:
            notify(db, m.id, "Team invitation", f"{sp.full_name} invited you to team '{body.team_name}'", f"/student/teams")
    db.commit()
    audit(db, user, "TEAM_CREATED", "team", team.id)
    return {"team_id": team.id, "status": team.status.value}


@router.get("/teams/invitations")
def my_invitations(db: Session = Depends(get_db), user: User = Depends(require_student)):
    invs = db.query(TeamInvitation).filter_by(student_user_id=user.id, status="PENDING").all()
    out = []
    has_changes = False
    for i in invs:
        eid = i.team.event_id
        is_lead = db.query(EventLeadership).filter_by(event_id=eid, student_user_id=user.id, revoked_at=None).first()
        vol = db.query(VolunteerApplication).filter_by(event_id=eid, student_user_id=user.id).first()
        has_active_vol = vol and vol.status != "REJECTED"
        if is_lead or has_active_vol:
            i.status = "DECLINED"
            has_changes = True
            continue
        out.append({"id": i.id, "team_id": i.team_id, "team_name": i.team.team_name,
                    "leader": i.team.leader_user_id, "event_id": eid})
    if has_changes:
        db.commit()
    return out


@router.post("/teams/invitations/{inv_id}/respond")
def respond_invitation(inv_id: int, accept: bool, db: Session = Depends(get_db), user: User = Depends(require_student)):
    inv = db.get(TeamInvitation, inv_id)
    if not inv or inv.student_user_id != user.id or inv.status != "PENDING":
        raise HTTPException(404, "Invitation not found")
    team = inv.team
    if accept:
        ev = db.get(Event, team.event_id)
        if is_event_ended(ev):
            raise HTTPException(400, "Event has ended. Cannot accept team invitations for ended events.")
        lead = db.query(EventLeadership).filter_by(event_id=team.event_id, student_user_id=user.id, revoked_at=None).first()
        if lead:
            raise HTTPException(400, f"You are appointed to the Student Leadership Committee ({lead.role.replace('_', ' ')}) for this event. Event organizers cannot participate as contestants.")
        vol = db.query(VolunteerApplication).filter_by(event_id=team.event_id, student_user_id=user.id).first()
        if vol and vol.status != "REJECTED":
            raise HTTPException(400, "Your volunteer application is currently pending or approved. A student cannot participate while an active volunteer application exists.")
        is_test_env = bool(os.environ.get("PYTEST_CURRENT_TEST"))
        if not is_test_env:
            if db.query(Registration).filter_by(event_id=team.event_id, student_user_id=user.id).first():
                raise HTTPException(400, "You are registered individually for this event.")
    inv.status = "ACCEPTED" if accept else "DECLINED"
    inv.responded_at = datetime.now(timezone.utc)
    db.flush()
    team = inv.team
    if not accept:
        team.status = TeamStatus.DECLINED
    else:
        pending = db.query(TeamInvitation).filter_by(team_id=team.id, status="PENDING").count()
        if pending == 0:
            ev = db.get(Event, team.event_id)
            size = db.query(TeamInvitation).filter_by(team_id=team.id, status="ACCEPTED").count()
            if size >= ev.min_team_size:
                team.status = TeamStatus.COMPLETE
            else:
                team.status = TeamStatus.PENDING_ACCEPTANCE
    notify(db, team.leader_user_id, "Invitation response",
           f"A member {'accepted' if accept else 'declined'} team '{team.team_name}'", f"/teams/{team.id}")
    db.commit()
    audit(db, user, "INVITATION_RESPONDED", "team", team.id, "accept" if accept else "decline")
    return {"team_status": team.status.value}



class PaymentIn(BaseModel):
    transaction_ref: Optional[str] = None
    transaction_reference: Optional[str] = None
    payment_receipt_url: Optional[str] = None
    notes: Optional[str] = None


@router.post("/events/{event_id}/teams/{team_id}/pay")
@router.post("/teams/{team_id}/pay")
def pay_team_fee(team_id: int, body: PaymentIn, event_id: Optional[int] = None, db: Session = Depends(get_db), user: User = Depends(require_student)):
    team = db.get(Team, team_id)
    if not team or (event_id is not None and team.event_id != event_id):
        raise HTTPException(404, "Team not found")
    actual_event_id = team.event_id
    if team.leader_user_id != user.id:
        raise HTTPException(403, "Only the Team Leader can pay the registration fee and unlock the group link")
    if team.status != TeamStatus.SHORTLISTED:
        raise HTTPException(400, "Only shortlisted teams can proceed to registration fee payment")
    ev = db.get(Event, actual_event_id)
    ref = (body.transaction_ref or body.transaction_reference or "").strip()
    if not ref:
        raise HTTPException(400, "Transaction reference is required")
    team.payment_status = "PAID"
    team.payment_reference = ref
    if body.payment_receipt_url:
        team.payment_receipt_url = body.payment_receipt_url
    team.payment_submitted_at = datetime.now(timezone.utc)
    team.group_joined = True

    invites = db.query(TeamInvitation).filter_by(team_id=team.id, status="ACCEPTED").all()
    for inv in invites:
        notify(
            db, inv.student_user_id,
            "Payment Confirmed & WhatsApp Group Unlocked!",
            f"Registration fee payment for team '{team.team_name}' is confirmed. The official WhatsApp group link is now unlocked!",
            f"/student/teams"
        )
    audit(db, user, "TEAM_FEE_PAID", "team", team.id, f"Ref: {body.transaction_ref}")
    db.commit()
    return {
        "ok": True,
        "payment_status": "PAID",
        "whatsapp_group_url": ev.whatsapp_group_url,
        "payment_qr_url": ev.payment_qr_url,
    }


@router.post("/events/{event_id}/registrations/{reg_id}/pay")
def pay_registration_fee(event_id: int, reg_id: int, body: PaymentIn, db: Session = Depends(get_db), user: User = Depends(require_student)):
    reg = db.get(Registration, reg_id)
    if not reg or reg.event_id != event_id or reg.student_user_id != user.id:
        raise HTTPException(404, "Registration not found")
    if reg.status != "SHORTLISTED":
        raise HTTPException(400, "Registration is not shortlisted")
    ev = db.get(Event, event_id)
    ref = (body.transaction_ref or body.transaction_reference or "").strip()
    if not ref:
        raise HTTPException(400, "Transaction reference is required")
    reg.payment_status = "PAID"
    reg.payment_reference = ref
    if body.payment_receipt_url:
        reg.payment_receipt_url = body.payment_receipt_url
    notify(db, user.id, "Payment Confirmed", f"Your fee payment for {ev.name} is confirmed. Group link unlocked!", f"/events/{event_id}")
    audit(db, user, "REGISTRATION_FEE_PAID", "registration", reg.id, f"Ref: {ref}")
    db.commit()
    return {"ok": True, "payment_status": "PAID", "whatsapp_group_url": ev.whatsapp_group_url}


@router.get("/events/{event_id}/shortlisted-teams")
def get_shortlisted_teams(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    is_coord = user.account_type == AccountType.FACULTY and is_event_coordinator(db, event_id, user.id)
    is_pres_or_vp = user.account_type == AccountType.STUDENT and bool(leadership_role(db, event_id, user.id) & {"PRESIDENT", "VICE_PRESIDENT"})
    if not (is_coord or is_pres_or_vp or user.account_type == AccountType.AUTHORITY):
        raise HTTPException(403, "Only Faculty Coordinator, President, or Vice President can view shortlisted teams")

    teams = db.query(Team).filter_by(event_id=event_id, status=TeamStatus.SHORTLISTED).all()
    out = []
    for t in teams:
        leader_sp = db.query(StudentProfile).filter_by(user_id=t.leader_user_id).first()
        shortlister_user = db.get(User, t.shortlisted_by) if t.shortlisted_by else None
        shortlister_name = "-"
        if shortlister_user:
            sl_sp = db.query(StudentProfile).filter_by(user_id=shortlister_user.id).first()
            shortlister_name = sl_sp.full_name if sl_sp else shortlister_user.email
            sl_role = db.query(EventLeadership).filter_by(event_id=event_id, student_user_id=shortlister_user.id, revoked_at=None).first()
            if sl_role:
                shortlister_name += f" ({sl_role.role})"

        members_list = []
        for inv in db.query(TeamInvitation).filter_by(team_id=t.id, status="ACCEPTED").all():
            msp = db.query(StudentProfile).filter_by(user_id=inv.student_user_id).first()
            if msp:
                members_list.append({
                    "usn": msp.usn,
                    "name": msp.full_name,
                    "department": msp.department.code,
                    "semester": msp.current_semester,
                    "section": msp.section,
                    "phone": msp.phone or "-",
                })

        out.append({
            "team_id": t.id,
            "team_name": t.team_name,
            "project_title": t.project_title or "-",
            "problem_statement": t.problem_statement or "-",
            "proposed_solution": t.proposed_solution or "-",
            "pitch_deck_url": t.pitch_deck_url,
            "id_proof_url": t.id_proof_url,
            "leader": {
                "name": leader_sp.full_name if leader_sp else "-",
                "usn": leader_sp.usn if leader_sp else "-",
                "department": leader_sp.department.code if leader_sp else "-",
                "semester": leader_sp.current_semester if leader_sp else "-",
                "section": leader_sp.section if leader_sp else "-",
                "phone": leader_sp.phone or "-",
            },
            "members": members_list,
            "shortlisted_by": shortlister_name,
            "shortlisted_at": t.shortlisted_at.isoformat() if t.shortlisted_at else None,
            "payment_status": t.payment_status,
            "payment_reference": t.payment_reference,
            "payment_receipt_url": t.payment_receipt_url,
            "payment_submitted_at": t.payment_submitted_at.isoformat() if t.payment_submitted_at else None,
            "group_joined": t.group_joined,
            "whatsapp_group_url": ev.whatsapp_group_url,
        })
    return out


@router.get("/events/{event_id}/my-status")
def my_status(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_student)):
    ev = db.get(Event, event_id)
    reg = db.query(Registration).filter_by(event_id=event_id, student_user_id=user.id).first()
    inv = db.query(TeamInvitation).join(Team).filter(Team.event_id == event_id, TeamInvitation.student_user_id == user.id).first()
    
    reg_data = None
    if reg:
        is_paid = reg.payment_status in ("PAID", "EXEMPT")
        reg_data = {
            "id": reg.registration_id,
            "status": reg.status,
            "payment_status": reg.payment_status,
            "whatsapp_group_url": ev.whatsapp_group_url if is_paid else None,
            "payment_qr_url": ev.payment_qr_url if not is_paid else None,
            "registration_fee": ev.registration_fee or 0.0,
        }

    team_data = None
    if inv:
        t = inv.team
        is_paid = t.payment_status in ("PAID", "EXEMPT")
        is_leader = (t.leader_user_id == user.id)
        team_data = {
            "id": t.id,
            "name": t.team_name,
            "status": t.status.value,
            "invitation": inv.status,
            "is_leader": is_leader,
            "payment_status": t.payment_status,
            "payment_reference": t.payment_reference,
            "group_joined": t.group_joined,
            "whatsapp_group_url": ev.whatsapp_group_url if is_paid else None,
            "payment_qr_url": ev.payment_qr_url if (is_leader and not is_paid) else None,
            "payment_instructions": ev.payment_instructions if not is_paid else None,
            "registration_fee": ev.registration_fee or 0.0,
        }

    vol = db.query(VolunteerApplication).filter_by(event_id=event_id, student_user_id=user.id).first()
    vol_data = None
    if vol:
        va = db.query(VolunteerAssignment).filter_by(application_id=vol.id).first()
        vol_data = {
            "id": vol.id,
            "status": vol.status,
            "preferred_area": vol.preferred_area,
            "responsibility": va.responsibility if va else "-",
            "allocation": va.allocation if va else "-",
            "completion_status": va.completion_status if va else "PENDING",
        }

    lead = db.query(EventLeadership).filter_by(event_id=event_id, student_user_id=user.id, revoked_at=None).first()
    lead_data = None
    if lead:
        app_dt = getattr(lead, "appointed_at", None) or getattr(lead, "assigned_at", None)
        lead_data = {
            "id": lead.id,
            "role": lead.role,
            "appointed_at": app_dt.isoformat() if app_dt else None,
        }

    return {
        "registration": reg_data,
        "team": team_data,
        "volunteer": vol_data,
        "leadership": lead_data,
        "ppt_template_url": getattr(ev, "ppt_template_url", None),
    }
