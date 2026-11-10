"""Auth dependencies and authorization helpers. All identity/permission
decisions are resolved server-side from the JWT — never from client input."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import (
    AccountType, User, StudentProfile, FacultyProfile, Event, EventCoordinator,
    EventLeadership, ClassTeacherAssignment, HODAssignment,
)
from .security import decode_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(creds.credentials)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    if payload.get("kind") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token kind")
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.status.value not in ("ACTIVE", "PENDING_ACTIVATION"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Account is {user.status.value}")
    return user


def require_authority(user: User = Depends(get_current_user)) -> User:
    if user.account_type != AccountType.AUTHORITY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authority access required")
    return user


def require_faculty(user: User = Depends(get_current_user)) -> User:
    if user.account_type != AccountType.FACULTY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faculty access required")
    return user


def require_student(user: User = Depends(get_current_user)) -> User:
    if user.account_type != AccountType.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    return user


def require_campus_user(user: User = Depends(get_current_user)) -> User:
    if user.account_type == AccountType.AUTHORITY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authority accounts are not permitted on campus student/faculty routes")
    if user.account_type not in (AccountType.STUDENT, AccountType.FACULTY):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student or Faculty account required")
    return user


def student_profile(db: Session, user: User) -> StudentProfile | None:
    return db.query(StudentProfile).filter_by(user_id=user.id).first()


def faculty_profile(db: Session, user: User) -> FacultyProfile | None:
    return db.query(FacultyProfile).filter_by(user_id=user.id).first()


def is_event_coordinator(db: Session, event_id: int, user_id: int) -> bool:
    return db.query(EventCoordinator).filter_by(
        event_id=event_id, faculty_user_id=user_id, revoked_at=None).first() is not None


def is_creator(db: Session, event: Event, user_id: int) -> bool:
    return event.created_by == user_id


def leadership_role(db: Session, event_id: int, user_id: int) -> set[str]:
    rows = db.query(EventLeadership).filter_by(event_id=event_id, student_user_id=user_id, revoked_at=None).all()
    return {r.role for r in rows}


def is_class_teacher_for(db: Session, student: StudentProfile, academic_year: str) -> bool:
    return db.query(ClassTeacherAssignment).filter_by(
        department_id=student.department_id, semester=student.current_semester,
        section=student.section, academic_year=academic_year, faculty_user_id=None, active=True).first() is not None


def is_assigned_class_teacher(db: Session, faculty_user_id: int, student: StudentProfile, academic_year: str) -> bool:
    return db.query(ClassTeacherAssignment).filter_by(
        department_id=student.department_id, semester=student.current_semester,
        section=student.section, academic_year=academic_year,
        faculty_user_id=faculty_user_id, active=True).first() is not None


def is_hod(db: Session, faculty_user_id: int) -> bool:
    return db.query(HODAssignment).filter_by(faculty_user_id=faculty_user_id, active=True).first() is not None
