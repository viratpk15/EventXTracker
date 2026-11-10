"""Authentication: login (student/faculty/authority), token refresh, password lifecycle."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AccountStatus, User, AuditLog, ClassTeacherAssignment, HODAssignment, Department
from ..security import verify_password, create_token, decode_token, hash_password
from ..deps import get_current_user, require_campus_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: str
    password: str


class PasswordChangeIn(BaseModel):
    old_password: str
    new_password: str


def audit(db: Session, actor: User | None, action: str, entity: str | None = None, entity_id: int | None = None, detail: str | None = None):
    db.add(AuditLog(actor_id=actor.id if actor else None, action=action, entity=entity, entity_id=entity_id, detail=detail))
    db.commit()


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=body.email.strip().lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.account_type.value == "AUTHORITY":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authority accounts must log in via the Authority Portal (/authority/login)")
    if user.status == AccountStatus.SUSPENDED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    if user.status == AccountStatus.REVOKED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account revoked")
    access = create_token(user.id, user.account_type.value, kind="access")
    refresh = create_token(user.id, user.account_type.value,
                           minutes=settings_minutes(), kind="refresh")
    audit(db, user, "LOGIN", "user", user.id)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "must_change_password": user.must_change_password,
        "account_type": user.account_type.value,
        "user_id": user.id,
    }


@router.post("/student/login")
def student_login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=body.email.strip().lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.account_type.value == "AUTHORITY":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Authority accounts must sign in via the Authority Portal (/authority/login)")
    if user.account_type.value == "FACULTY":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: This portal is strictly for Students. Faculty members must use the Faculty Portal (/faculty/login)")
    if user.status == AccountStatus.SUSPENDED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    if user.status == AccountStatus.REVOKED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account revoked")
    access = create_token(user.id, user.account_type.value, kind="access")
    refresh = create_token(user.id, user.account_type.value, minutes=settings_minutes(), kind="refresh")
    audit(db, user, "STUDENT_LOGIN", "user", user.id)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "must_change_password": user.must_change_password,
        "account_type": user.account_type.value,
        "user_id": user.id,
    }


@router.post("/faculty/login")
def faculty_login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=body.email.strip().lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.account_type.value == "AUTHORITY":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Authority accounts must sign in via the Authority Portal (/authority/login)")
    if user.account_type.value == "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: This portal is strictly for Faculty. Students must use the Student Portal (/student/login)")
    if user.status == AccountStatus.SUSPENDED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    if user.status == AccountStatus.REVOKED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account revoked")
    access = create_token(user.id, user.account_type.value, kind="access")
    refresh = create_token(user.id, user.account_type.value, minutes=settings_minutes(), kind="refresh")
    audit(db, user, "FACULTY_LOGIN", "user", user.id)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "must_change_password": user.must_change_password,
        "account_type": user.account_type.value,
        "user_id": user.id,
    }



def settings_minutes():
    from ..config import settings
    return settings.REFRESH_TOKEN_DAYS * 24 * 60


@router.post("/refresh")
def refresh(body: dict, db: Session = Depends(get_db)):
    token = body.get("refresh_token", "")
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if payload.get("kind") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token kind")
    if payload.get("type") == "AUTHORITY":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authority accounts must use /api/v1/authority/auth/refresh")
    user = db.get(User, int(payload["sub"]))
    if not user or user.status not in (AccountStatus.ACTIVE, AccountStatus.PENDING_ACTIVATION):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account unavailable")
    return {"access_token": create_token(user.id, user.account_type.value, kind="access")}


@router.post("/change-password")
def change_password(body: PasswordChangeIn, db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Old password incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    user.password_hash = hash_password(body.new_password)
    user.must_change_password = False
    if user.status == AccountStatus.PENDING_ACTIVATION:
        user.status = AccountStatus.ACTIVE
    audit(db, user, "PASSWORD_CHANGE", "user", user.id)
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(require_campus_user), db: Session = Depends(get_db)):
    from ..deps import student_profile, faculty_profile
    profile = None
    if user.account_type.value == "STUDENT":
        sp = student_profile(db, user)
        profile = {
            "full_name": sp.full_name,
            "usn": sp.usn,
            "department": sp.department.code,
            "semester": sp.current_semester,
            "section": sp.section,
            "joining_year": sp.joining_year,
            "phone": sp.phone,
            "avatar_url": sp.avatar_url,
            "quote": sp.quote
        }
    elif user.account_type.value == "FACULTY":
        fp = faculty_profile(db, user)
        cta = db.query(ClassTeacherAssignment).filter_by(faculty_user_id=user.id, active=True).all()
        ct_list = []
        for c in cta:
            dept = db.get(Department, c.department_id)
            ct_list.append({
                "department": dept.code if dept else "",
                "department_name": dept.name if dept else "",
                "semester": c.semester,
                "section": c.section,
                "academic_year": c.academic_year,
            })
        hod = db.query(HODAssignment).filter_by(faculty_user_id=user.id, active=True).first()
        hod_dept = db.get(Department, hod.department_id) if hod else None

        profile = {
            "full_name": fp.full_name,
            "department": fp.department.code,
            "designation": fp.designation,
            "avatar_url": fp.avatar_url,
            "quote": fp.quote,
            "is_class_teacher": len(ct_list) > 0,
            "class_teacher_assignments": ct_list,
            "is_hod": hod is not None,
            "hod_department": hod_dept.code if hod_dept else None,
        }
    else:
        profile = {"full_name": user.email}
    return {"id": user.id, "email": user.email, "account_type": user.account_type.value,
            "status": user.status.value, "must_change_password": user.must_change_password, "profile": profile}


class ProfileUpdateIn(BaseModel):
    avatar_url: str | None = None
    quote: str | None = None
    phone: str | None = None


@router.patch("/profile")
def update_profile(body: ProfileUpdateIn, user: User = Depends(require_campus_user), db: Session = Depends(get_db)):
    if user.account_type.value == "STUDENT":
        from ..deps import student_profile
        sp = student_profile(db, user)
        if body.avatar_url is not None:
            sp.avatar_url = body.avatar_url
        if body.quote is not None:
            sp.quote = body.quote.strip() if body.quote else None
        if body.phone is not None:
            sp.phone = body.phone.strip() if body.phone else None
        db.commit()
        return {"ok": True, "avatar_url": sp.avatar_url, "quote": sp.quote, "phone": sp.phone}
    elif user.account_type.value == "FACULTY":
        from ..deps import faculty_profile
        fp = faculty_profile(db, user)
        if body.avatar_url is not None:
            fp.avatar_url = body.avatar_url
        if body.quote is not None:
            fp.quote = body.quote.strip() if body.quote else None
        db.commit()
        return {"ok": True, "avatar_url": fp.avatar_url, "quote": fp.quote}
    raise HTTPException(400, "Unsupported account type")
