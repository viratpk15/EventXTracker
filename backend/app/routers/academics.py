"""Model B academic records: internships and external event participation.
Visibility scoped to department+semester+section+academic year; only the exact
assigned Class Teacher reviews pending records."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    User, Internship, ExternalEventRecord, StudentProfile, Notification, AuditLog,
    ClassTeacherAssignment, Department
)
from ..deps import require_campus_user, require_student, require_faculty, student_profile, faculty_profile, is_assigned_class_teacher

router = APIRouter(prefix="/api/v1", tags=["academics"])

ACADEMIC_YEAR = "2025-26"


def audit(db, actor, action, entity=None, entity_id=None, detail=None):
    db.add(AuditLog(actor_id=actor.id, action=action, entity=entity, entity_id=entity_id, detail=detail))
    db.commit()


class InternshipIn(BaseModel):
    company: str
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    mode: str | None = None
    location: str | None = None
    description: str | None = None
    technologies: str | None = None
    supervisor: str | None = None
    document_path: str | None = None


class ExternalIn(BaseModel):
    event_name: str
    organization: str | None = None
    category: str | None = None
    event_date: str | None = None
    location: str | None = None
    description: str | None = None
    participation_type: str | None = None
    achievement: str | None = None
    document_path: str | None = None


@router.post("/internships")
def submit_internship(body: InternshipIn, db: Session = Depends(get_db), user: User = Depends(require_student)):
    item = Internship(student_user_id=user.id, **body.model_dump())
    db.add(item)
    db.commit()
    audit(db, user, "INTERNSHIP_SUBMITTED", "internship", item.id)
    return {"ok": True, "id": item.id}


@router.post("/external-events")
def submit_external(body: ExternalIn, db: Session = Depends(get_db), user: User = Depends(require_student)):
    item = ExternalEventRecord(student_user_id=user.id, **body.model_dump())
    db.add(item)
    db.commit()
    audit(db, user, "EXTERNAL_SUBMITTED", "external_event", item.id)
    return {"ok": True, "id": item.id}


def serialize(row, sp):
    return {
        "id": row.id,
        "student_id": row.student_user_id,
        "name": sp.full_name,
        "usn": sp.usn,
        "department": sp.department.code,
        "semester": sp.current_semester,
        "section": sp.section,
        "status": row.status,
        "evidence_inspected": row.evidence_inspected,
        "reviewed_by": row.reviewed_by,
        "review_notes": getattr(row, "review_notes", None),
        "reviewed_at": row.reviewed_at.isoformat() if getattr(row, "reviewed_at", None) else None,
        "submitted_at": row.submitted_at.isoformat() if getattr(row, "submitted_at", None) else None,
        "document_path": getattr(row, "document_path", None),
        **{k: getattr(row, k) for k in (
            "company", "role", "start_date", "end_date", "mode", "location", "description",
            "technologies", "supervisor", "event_name", "organization", "category",
            "event_date", "participation_type", "achievement") if hasattr(row, k)}
    }


def visible_records(db, user, model):
    """Model B enforcement, backend-side."""
    rows = db.query(model).all()
    out = []
    for r in rows:
        sp = db.query(StudentProfile).filter_by(user_id=r.student_user_id).first()
        if not sp:
            continue
        if user.account_type.value == "STUDENT":
            if r.student_user_id != user.id:
                continue
        else:
            fp = faculty_profile(db, user)
            if not fp or fp.department_id != sp.department_id:
                continue  # cross-department denied
            if r.status == "PENDING_REVIEW" and not is_assigned_class_teacher(db, user.id, sp, ACADEMIC_YEAR):
                continue  # unreviewed visible only to exact assigned Class Teacher
        out.append(serialize(r, sp))
    return out


@router.get("/internships")
def list_internships(db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    return visible_records(db, user, Internship)


@router.get("/external-events")
def list_external(db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    return visible_records(db, user, ExternalEventRecord)


@router.post("/internships/{rec_id}/review")
def review_internship(rec_id: int, status: str, evidence_inspected: bool = False, notes: str = "",
                      db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    rec = db.get(Internship, rec_id)
    if not rec:
        raise HTTPException(404, "Not found")
    sp = db.query(StudentProfile).filter_by(user_id=rec.student_user_id).first()
    if not is_assigned_class_teacher(db, user.id, sp, ACADEMIC_YEAR):
        raise HTTPException(403, "Only the assigned Class Teacher can review this record")
    if status not in ("ON_HOLD", "VERIFIED", "REJECTED"):
        raise HTTPException(400, "Invalid status")
    rec.status, rec.evidence_inspected, rec.review_notes = status, evidence_inspected, notes
    rec.reviewed_by, rec.reviewed_at = user.id, datetime.now(timezone.utc)
    db.add(Notification(user_id=rec.student_user_id, title=f"Internship {status.lower()}", body=notes))
    db.commit()
    audit(db, user, "INTERNSHIP_REVIEWED", "internship", rec_id, status)
    return {"ok": True}


@router.post("/external-events/{rec_id}/review")
def review_external(rec_id: int, status: str, evidence_inspected: bool = False, notes: str = "",
                    db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    rec = db.get(ExternalEventRecord, rec_id)
    if not rec:
        raise HTTPException(404, "Not found")
    sp = db.query(StudentProfile).filter_by(user_id=rec.student_user_id).first()
    if not is_assigned_class_teacher(db, user.id, sp, ACADEMIC_YEAR):
        raise HTTPException(403, "Only the assigned Class Teacher can review this record")
    if status not in ("ON_HOLD", "VERIFIED", "REJECTED"):
        raise HTTPException(400, "Invalid status")
    rec.status, rec.evidence_inspected, rec.review_notes = status, evidence_inspected, notes
    rec.reviewed_by, rec.reviewed_at = user.id, datetime.now(timezone.utc)
    db.add(Notification(user_id=rec.student_user_id, title=f"External event record {status.lower()}", body=notes))
    db.commit()
    audit(db, user, "EXTERNAL_REVIEWED", "external_event", rec_id, status)
    return {"ok": True}


# ----------------------------- Dedicated Class Teacher Endpoints -----------------------------

@router.get("/faculty/class-teacher/assigned-class")
def get_assigned_classes(db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    cta = db.query(ClassTeacherAssignment).filter_by(faculty_user_id=user.id, active=True).all()
    res = []
    for c in cta:
        dept = db.get(Department, c.department_id)
        count = db.query(StudentProfile).filter_by(
            department_id=c.department_id,
            current_semester=c.semester,
            section=c.section
        ).count()
        res.append({
            "id": c.id,
            "department_id": c.department_id,
            "department_code": dept.code if dept else "",
            "department_name": dept.name if dept else "",
            "semester": c.semester,
            "section": c.section,
            "academic_year": c.academic_year,
            "student_count": count,
        })
    return res


@router.get("/faculty/class-teacher/students")
def get_assigned_class_students(db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    cta = db.query(ClassTeacherAssignment).filter_by(faculty_user_id=user.id, active=True).all()
    if not cta:
        return []
    students = []
    for c in cta:
        dept = db.get(Department, c.department_id)
        sps = db.query(StudentProfile).filter_by(
            department_id=c.department_id,
            current_semester=c.semester,
            section=c.section
        ).all()
        for sp in sps:
            u = db.get(User, sp.user_id)
            students.append({
                "user_id": sp.user_id,
                "email": u.email if u else "",
                "full_name": sp.full_name,
                "usn": sp.usn,
                "department": dept.code if dept else "",
                "semester": sp.current_semester,
                "section": sp.section,
                "joining_year": sp.joining_year,
                "academic_year": c.academic_year,
            })
    return students


@router.get("/faculty/class-teacher/reviews")
def get_class_teacher_reviews(db: Session = Depends(get_db), user: User = Depends(require_faculty)):
    cta = db.query(ClassTeacherAssignment).filter_by(faculty_user_id=user.id, active=True).all()
    if not cta:
        return {"internships": [], "external_events": [], "total_pending": 0}
    internships = visible_records(db, user, Internship)
    externals = visible_records(db, user, ExternalEventRecord)
    pending_i = [i for i in internships if i.get("status") == "PENDING_REVIEW"]
    pending_e = [e for e in externals if e.get("status") == "PENDING_REVIEW"]
    return {
        "internships": internships,
        "external_events": externals,
        "total_pending": len(pending_i) + len(pending_e)
    }

