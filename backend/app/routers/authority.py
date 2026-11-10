"""Authority portal: provisioning, institutional management, bulk import, dashboard metrics."""
import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from pydantic import BaseModel, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    AccountStatus, AccountType, User, StudentProfile, FacultyProfile, Department,
    HODAssignment, ClassTeacherAssignment, AuditLog, ImportBatch, BRANCHES, AcademicSetting,
)
from ..security import hash_password, generate_temp_password, verify_password, create_token, decode_token
from ..deps import require_authority

router = APIRouter(prefix="/api/v1/authority", tags=["authority"])


class AuthorityLoginIn(BaseModel):
    email: str
    password: str


@router.post("/auth/login")
def authority_login(body: AuthorityLoginIn, db: Session = Depends(get_db)):
    """Authority-only login endpoint. Rejects ordinary student and faculty accounts."""
    user = db.query(User).filter_by(email=body.email.strip().lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid authority credentials")
    if user.account_type != AccountType.AUTHORITY:
        raise HTTPException(403, "Access denied: Not an authority account. Use campus login at /login")
    if user.status == AccountStatus.SUSPENDED:
        raise HTTPException(403, "Authority account suspended")
    if user.status == AccountStatus.REVOKED:
        raise HTTPException(403, "Authority account revoked")
    from ..config import settings
    access = create_token(user.id, user.account_type.value, kind="access")
    refresh = create_token(user.id, user.account_type.value,
                           minutes=settings.REFRESH_TOKEN_DAYS * 24 * 60, kind="refresh")
    audit(db, user, "AUTHORITY_LOGIN", "user", user.id)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "must_change_password": user.must_change_password,
        "account_type": user.account_type.value,
        "user_id": user.id,
    }


@router.post("/auth/refresh")
def authority_refresh(body: dict, db: Session = Depends(get_db)):
    """Authority-only refresh endpoint. Rejects campus student and faculty refresh tokens."""
    token = body.get("refresh_token", "")
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("kind") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token kind")
    if payload.get("type") != "AUTHORITY":
        raise HTTPException(status_code=403, detail="Campus accounts must use /api/v1/auth/refresh")
    user = db.get(User, int(payload["sub"]))
    if not user or user.status not in (AccountStatus.ACTIVE, AccountStatus.PENDING_ACTIVATION):
        raise HTTPException(status_code=401, detail="Account unavailable")
    if user.account_type != AccountType.AUTHORITY:
        raise HTTPException(status_code=403, detail="Access denied: Not an authority account")
    return {"access_token": create_token(user.id, user.account_type.value, kind="access")}



def audit(db, actor, action, entity=None, entity_id=None, detail=None):
    db.add(AuditLog(actor_id=actor.id, action=action, entity=entity, entity_id=entity_id, detail=detail))
    db.commit()


def branch_of_email(email: str) -> str | None:
    # vvce{YY}{BRANCH}{NNNN}@vvce.ac.in
    local = email.split("@")[0]
    if not (local.startswith("vvce") and local.endswith(tuple("0123456789"))):
        return None
    for b in sorted(BRANCHES, key=len, reverse=True):
        if b.lower() in local:
            return b
    return None


class StudentIn(BaseModel):
    full_name: str
    usn: str
    email: str
    branch: str
    joining_year: int
    semester: int
    section: str

    @field_validator("branch")
    @classmethod
    def _branch(cls, v):
        v = v.upper().replace("ECE", "EC")
        if v not in BRANCHES:
            raise ValueError("Unsupported branch")
        return v

    @field_validator("semester")
    @classmethod
    def _sem(cls, v):
        if v not in (1, 2, 3, 4, 5, 6, 7, 8):
            raise ValueError("Semester must be 1-8")
        return v


class FacultyIn(BaseModel):
    full_name: str
    email: str
    branch: str
    designation: str | None = None

    @field_validator("branch")
    @classmethod
    def _branch(cls, v):
        v = v.upper().replace("ECE", "EC")
        if v not in BRANCHES:
            raise ValueError("Unsupported branch")
        return v


def _provision(db, email, account_type, profile_row, actor, audit_action):
    email = email.strip().lower()
    if db.query(User).filter_by(email=email).first():
        raise HTTPException(400, "Email already exists")
    temp = generate_temp_password()
    user = User(email=email, password_hash=hash_password(temp),
                account_type=account_type, status=AccountStatus.PENDING_ACTIVATION, is_seeded=False,
                temp_password=temp)
    db.add(user)
    db.flush()
    profile_row.user_id = user.id
    db.add(profile_row)
    db.commit()
    audit(db, actor, audit_action, "user", user.id)
    return user, temp


@router.post("/students")
def create_student(body: StudentIn, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    if body.email != body.email.lower() or not body.email.endswith("@vvce.ac.in"):
        raise HTTPException(400, "Institutional email must be @vvce.ac.in")
    if branch_of_email(body.email) != body.branch:
        raise HTTPException(400, "Email does not match vvce{YY}{BRANCH}{NNNN} format for the given branch")
    dept = db.query(Department).filter_by(code=body.branch).first()
    if not dept:
        raise HTTPException(400, "Unknown department")
    if db.query(StudentProfile).filter_by(usn=body.usn.upper()).first():
        raise HTTPException(400, "USN already exists")
    sp = StudentProfile(full_name=body.full_name, usn=body.usn.upper(), department_id=dept.id,
                        joining_year=body.joining_year, current_semester=body.semester, section=body.section.upper())
    user, temp = _provision(db, body.email, AccountType.STUDENT, sp, actor, "STUDENT_CREATED")
    return {"user_id": user.id, "email": user.email, "temporary_password": temp}


@router.post("/faculty")
def create_faculty(body: FacultyIn, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    dept = db.query(Department).filter_by(code=body.branch).first()
    if not dept:
        raise HTTPException(400, "Unknown department")
    if not body.email.endswith("@vvce.ac.in"):
        raise HTTPException(400, "College-issued email must be @vvce.ac.in")
    fp = FacultyProfile(full_name=body.full_name, department_id=dept.id, designation=body.designation)
    user, temp = _provision(db, body.email, AccountType.FACULTY, fp, actor, "FACULTY_CREATED")
    return {"user_id": user.id, "email": user.email, "temporary_password": temp}


@router.get("/accounts")
def list_accounts(q: str = "", type: str = "", status: str = "", db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    query = db.query(User).filter(User.account_type != AccountType.AUTHORITY)
    if q:
        query = query.filter(User.email.ilike(f"%{q}%"))
    if type:
        query = query.filter(User.account_type == AccountType(type))
    if status:
        query = query.filter(User.status == AccountStatus(status))
    users = query.order_by(User.created_at.desc()).all()
    out = []
    for u in users:
        default_pw = "StudentPass@123" if u.account_type == AccountType.STUDENT else "FacultyPass@123"
        entry = {
            "id": u.id,
            "email": u.email,
            "type": u.account_type.value,
            "status": u.status.value,
            "temp_password": u.temp_password or default_pw,
            "must_change_password": u.must_change_password,
            "created_at": u.created_at.isoformat()
        }
        if u.student_profile:
            entry.update({"name": u.student_profile.full_name, "usn": u.student_profile.usn,
                          "department": u.student_profile.department.code,
                          "semester": u.student_profile.current_semester, "section": u.student_profile.section})
        elif u.faculty_profile:
            entry.update({"name": u.faculty_profile.full_name, "department": u.faculty_profile.department.code,
                          "designation": u.faculty_profile.designation})
        out.append(entry)
    return out


@router.get("/accounts/import-template")
def get_import_template(kind: str = "STUDENT", actor: User = Depends(require_authority)):
    """Downloadable CSV template for Student or Faculty bulk provisioning."""
    if kind.upper() == "FACULTY":
        content = "full_name,email,branch,designation\nDr. Ramesh Kumar,facaiml02@vvce.ac.in,AIML,Associate Professor\n"
        filename = "faculty_import_template.csv"
    else:
        content = "full_name,usn,email,branch,joining_year,semester,section\nKavya Reddy,1VV246CSE050,vvce24cse0050@vvce.ac.in,CSE,2024,3,A\n"
        filename = "student_import_template.csv"
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


class AccountUpdateIn(BaseModel):
    full_name: str | None = None
    designation: str | None = None
    semester: int | None = None
    section: str | None = None


@router.get("/accounts/{user_id}")
def get_account(user_id: int, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    u = db.get(User, user_id)
    if not u or u.account_type == AccountType.AUTHORITY:
        raise HTTPException(404, "Account not found")
    default_pw = "StudentPass@123" if u.account_type == AccountType.STUDENT else "FacultyPass@123"
    res = {
        "id": u.id, "email": u.email, "type": u.account_type.value, "status": u.status.value,
        "temp_password": u.temp_password or default_pw,
        "created_at": u.created_at.isoformat(), "must_change_password": u.must_change_password,
        "is_seeded": u.is_seeded,
    }
    if u.student_profile:
        sp = u.student_profile
        res["profile"] = {
            "full_name": sp.full_name, "usn": sp.usn, "department": sp.department.code,
            "department_id": sp.department_id, "joining_year": sp.joining_year,
            "current_semester": sp.current_semester, "section": sp.section,
        }
    elif u.faculty_profile:
        fp = u.faculty_profile
        res["profile"] = {
            "full_name": fp.full_name, "department": fp.department.code,
            "department_id": fp.department_id, "designation": fp.designation,
        }
    return res


@router.patch("/accounts/{user_id}")
def update_account(user_id: int, body: AccountUpdateIn, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    u = db.get(User, user_id)
    if not u or u.account_type == AccountType.AUTHORITY:
        raise HTTPException(404, "Account not found")
    if u.student_profile:
        if body.full_name is not None and body.full_name.strip():
            u.student_profile.full_name = body.full_name.strip()
        if body.semester is not None:
            u.student_profile.current_semester = body.semester
        if body.section is not None and body.section.strip():
            u.student_profile.section = body.section.strip().upper()
    elif u.faculty_profile:
        if body.full_name is not None and body.full_name.strip():
            u.faculty_profile.full_name = body.full_name.strip()
        if body.designation is not None:
            u.faculty_profile.designation = body.designation.strip()
    db.commit()
    audit(db, actor, "ACCOUNT_UPDATED", "user", u.id)
    return {"ok": True}



@router.get("/accounts/{user_id}/audit")
def account_audit(user_id: int, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    logs = db.query(AuditLog).filter(
        (AuditLog.actor_id == user_id) | ((AuditLog.entity == "user") & (AuditLog.entity_id == user_id))
    ).order_by(AuditLog.created_at.desc()).limit(50).all()
    return [{"id": l.id, "actor_id": l.actor_id, "action": l.action, "entity": l.entity,
             "entity_id": l.entity_id, "detail": l.detail, "created_at": l.created_at.isoformat()} for l in logs]


class UnifiedAccountIn(BaseModel):
    account_type: str  # STUDENT or FACULTY
    full_name: str
    email: str
    branch: str
    usn: str | None = None
    joining_year: int | None = 2024
    semester: int | None = 1
    section: str | None = "A"
    designation: str | None = "Assistant Professor"


@router.post("/accounts")
def create_unified_account(body: UnifiedAccountIn, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    if body.account_type.upper() == "STUDENT":
        if not body.usn:
            raise HTTPException(400, "USN is required for student accounts")
        student_data = StudentIn(
            full_name=body.full_name,
            usn=body.usn,
            email=body.email,
            branch=body.branch,
            joining_year=body.joining_year or 2024,
            semester=body.semester or 1,
            section=body.section or "A",
        )
        return create_student(student_data, db, actor)
    elif body.account_type.upper() == "FACULTY":
        faculty_data = FacultyIn(
            full_name=body.full_name,
            email=body.email,
            branch=body.branch,
            designation=body.designation or "Assistant Professor",
        )
        return create_faculty(faculty_data, db, actor)
    else:
        raise HTTPException(400, "account_type must be STUDENT or FACULTY")



@router.post("/accounts/{user_id}/suspend")
def suspend(user_id: int, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    u = db.get(User, user_id)
    if not u or u.account_type == AccountType.AUTHORITY:
        raise HTTPException(404, "Account not found")
    u.status = AccountStatus.SUSPENDED
    db.commit()
    audit(db, actor, "ACCOUNT_SUSPENDED", "user", u.id)
    return {"ok": True}


@router.post("/accounts/{user_id}/reactivate")
def reactivate(user_id: int, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "Account not found")
    u.status = AccountStatus.ACTIVE if u.must_change_password else u.status
    if u.status == AccountStatus.SUSPENDED:
        u.status = AccountStatus.ACTIVE
    db.commit()
    audit(db, actor, "ACCOUNT_REACTIVATED", "user", u.id)
    return {"ok": True}


@router.post("/accounts/{user_id}/revoke")
def revoke(user_id: int, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    u = db.get(User, user_id)
    if not u or u.account_type == AccountType.AUTHORITY:
        raise HTTPException(404, "Account not found")
    u.status = AccountStatus.REVOKED
    db.commit()
    audit(db, actor, "ACCOUNT_REVOKED", "user", u.id)
    return {"ok": True}


@router.post("/accounts/{user_id}/reset-password")
def reset_password(user_id: int, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    u = db.get(User, user_id)

    if not u or u.account_type == AccountType.AUTHORITY:
        raise HTTPException(404, "Account not found")
    temp = generate_temp_password()
    u.password_hash = hash_password(temp)
    u.temp_password = temp
    u.must_change_password = True
    if u.status == AccountStatus.ACTIVE:
        u.status = AccountStatus.PENDING_ACTIVATION
    db.commit()
    audit(db, actor, "PASSWORD_RESET_INITIATED", "user", u.id)
    return {"temporary_password": temp}


@router.post("/accounts/{user_id}/password-reset")
def password_reset_alias(user_id: int, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    return reset_password(user_id, db, actor)



@router.post("/hod")
def assign_hod(department_id: int, faculty_user_id: int, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    fp = db.query(FacultyProfile).filter_by(user_id=faculty_user_id).first()
    if not fp or fp.department_id != department_id:
        raise HTTPException(400, "HOD must be faculty of that department")
    db.query(HODAssignment).filter_by(department_id=department_id, active=True).update({"active": False, "revoked_at": datetime.now(timezone.utc)})
    db.add(HODAssignment(department_id=department_id, faculty_user_id=faculty_user_id, assigned_by=actor.id))
    db.commit()
    audit(db, actor, "HOD_ASSIGNED", "hod", department_id)
    return {"ok": True}


@router.post("/class-teacher")
def assign_ct(department_id: int, semester: int, section: str, academic_year: str, faculty_user_id: int,
               db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    fp = db.query(FacultyProfile).filter_by(user_id=faculty_user_id).first()
    if not fp or fp.department_id != department_id:
        raise HTTPException(400, "Class Teacher must be faculty of that department")
    db.add(ClassTeacherAssignment(department_id=department_id, semester=semester, section=section.upper(),
                                  academic_year=academic_year, faculty_user_id=faculty_user_id, assigned_by=actor.id))
    db.commit()
    audit(db, actor, "CLASS_TEACHER_ASSIGNED", "class_teacher", department_id)
    return {"ok": True}


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    students = db.query(func.count(User.id)).filter(User.account_type == AccountType.STUDENT).scalar()
    faculty = db.query(func.count(User.id)).filter(User.account_type == AccountType.FACULTY).scalar()
    active = db.query(func.count(User.id)).filter(User.status == AccountStatus.ACTIVE).scalar()
    suspended = db.query(func.count(User.id)).filter(User.status == AccountStatus.SUSPENDED).scalar()
    dept_students = db.query(Department.code, func.count(StudentProfile.id)).join(
        StudentProfile, StudentProfile.department_id == Department.id).group_by(Department.code).all()
    dept_faculty = db.query(Department.code, func.count(FacultyProfile.id)).join(
        FacultyProfile, FacultyProfile.department_id == Department.id).group_by(Department.code).all()
    recent = db.query(User).filter(User.account_type != AccountType.AUTHORITY).order_by(User.created_at.desc()).limit(10).all()
    return {
        "total_students": students, "total_faculty": faculty, "active_accounts": active,
        "suspended_accounts": suspended,
        "dept_students": {c: n for c, n in dept_students},
        "dept_faculty": {c: n for c, n in dept_faculty},
        "recent_accounts": [{"email": u.email, "type": u.account_type.value, "status": u.status.value,
                             "created_at": u.created_at.isoformat()} for u in recent],
    }


@router.post("/bulk-import")
def bulk_import(kind: str, file: UploadFile = File(...), db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    if kind not in ("STUDENT", "FACULTY"):
        raise HTTPException(400, "kind must be STUDENT or FACULTY")
    text = file.file.read().decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(text)))
    errors, preview = [], []
    seen_emails, seen_usns = set(), set()
    for i, r in enumerate(rows, start=2):
        email = (r.get("email") or "").strip().lower()
        errs = []
        if not email.endswith("@vvce.ac.in"):
            errs.append("invalid institutional email")
        if db.query(User).filter_by(email=email).first() or email in seen_emails:
            errs.append("duplicate email")
        seen_emails.add(email)
        if kind == "STUDENT":
            usn = (r.get("usn") or "").strip().upper()
            if not usn:
                errs.append("missing USN")
            if db.query(StudentProfile).filter_by(usn=usn).first() or usn in seen_usns:
                errs.append("duplicate USN")
            seen_usns.add(usn)
            branch = (r.get("branch") or "").upper().replace("ECE", "EC")
            if branch not in BRANCHES:
                errs.append("invalid branch")
            elif kind == "STUDENT" and branch_of_email(email) != branch:
                errs.append("email/branch mismatch")
        else:
            branch = (r.get("branch") or "").upper().replace("ECE", "EC")
            if branch not in BRANCHES:
                errs.append("invalid branch")
        if errs:
            errors.append({"row": i, "errors": errs})
        else:
            preview.append(r)
    if errors:
        return {"ok": False, "errors": errors, "created": 0}
    batch = ImportBatch(kind=kind, operator_id=actor.id, total_rows=len(rows))
    db.add(batch)
    db.flush()
    created = 0
    for r in preview:
        email = r["email"].strip().lower()
        branch = r["branch"].upper().replace("ECE", "EC")
        dept = db.query(Department).filter_by(code=branch).first()
        temp = generate_temp_password()
        user = User(email=email, password_hash=hash_password(temp), account_type=AccountType(kind),
                    status=AccountStatus.PENDING_ACTIVATION, temp_password=temp)
        db.add(user)
        db.flush()
        if kind == "STUDENT":
            db.add(StudentProfile(user_id=user.id, full_name=r["full_name"], usn=r["usn"].upper(),
                                  department_id=dept.id, joining_year=int(r["joining_year"]),
                                  current_semester=int(r["semester"]), section=r["section"].upper()))
        else:
            db.add(FacultyProfile(user_id=user.id, full_name=r["full_name"], department_id=dept.id))
        created += 1
    batch.created_count = created
    db.commit()
    audit(db, actor, "BULK_IMPORT", "import_batch", batch.id, f"{kind}:{created}")
    return {"ok": True, "created": created, "batch_id": batch.id, "errors": []}


@router.post("/accounts/bulk-import")
def bulk_import_alias(kind: str, file: UploadFile = File(...), db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    return bulk_import(kind, file, db, actor)


@router.get("/departments")
def list_departments(db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    depts = db.query(Department).order_by(Department.code).all()
    out = []
    for d in depts:
        hod_assign = db.query(HODAssignment).filter_by(department_id=d.id, active=True).first()
        hod_info = None
        if hod_assign:
            fp = db.query(FacultyProfile).filter_by(user_id=hod_assign.faculty_user_id).first()
            if fp:
                hod_info = {"user_id": fp.user_id, "name": fp.full_name, "email": fp.user.email}
        st_count = db.query(StudentProfile).filter_by(department_id=d.id).count()
        fc_count = db.query(FacultyProfile).filter_by(department_id=d.id).count()
        ct_count = db.query(ClassTeacherAssignment).filter_by(department_id=d.id, active=True).count()
        out.append({
            "id": d.id, "code": d.code, "name": d.name,
            "hod": hod_info, "student_count": st_count, "faculty_count": fc_count, "class_teacher_count": ct_count,
        })
    return out


@router.get("/governance")
def list_governance(db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    hods = db.query(HODAssignment).filter_by(active=True).all()
    hod_list = []
    for h in hods:
        fp = db.query(FacultyProfile).filter_by(user_id=h.faculty_user_id).first()
        dept = db.get(Department, h.department_id)
        if fp and dept:
            hod_list.append({
                "id": h.id, "department": dept.code, "department_id": dept.id,
                "faculty_user_id": fp.user_id, "faculty_name": fp.full_name, "faculty_email": fp.user.email,
                "assigned_at": h.assigned_at.isoformat(),
            })

    cts = db.query(ClassTeacherAssignment).filter_by(active=True).all()
    ct_list = []
    for c in cts:
        fp = db.query(FacultyProfile).filter_by(user_id=c.faculty_user_id).first()
        dept = db.get(Department, c.department_id)
        if fp and dept:
            ct_list.append({
                "id": c.id, "department": dept.code, "department_id": dept.id,
                "semester": c.semester, "section": c.section, "academic_year": c.academic_year,
                "faculty_user_id": fp.user_id, "faculty_name": fp.full_name, "faculty_email": fp.user.email,
                "assigned_at": c.assigned_at.isoformat(),
            })
    return {"hods": hod_list, "class_teachers": ct_list}


@router.delete("/class-teacher/{ct_id}")
def revoke_ct(ct_id: int, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    ct = db.get(ClassTeacherAssignment, ct_id)
    if not ct:
        raise HTTPException(404, "Assignment not found")
    ct.active = False
    ct.revoked_at = datetime.now(timezone.utc)
    db.commit()
    audit(db, actor, "CLASS_TEACHER_REVOKED", "class_teacher", ct_id)
    return {"ok": True}



class AuthorityProfileUpdateIn(BaseModel):
    avatar_url: str | None = None
    quote: str | None = None


@router.get("/auth/me")
def authority_me(actor: User = Depends(require_authority)):
    return {
        "id": actor.id,
        "email": actor.email,
        "account_type": actor.account_type.value,
        "status": actor.status.value,
        "profile": {
            "full_name": "Institutional Administrator",
            "department": "ADMIN",
            "avatar_url": actor.avatar_url,
            "quote": actor.quote,
        }
    }


@router.patch("/auth/profile")
def update_authority_profile(body: AuthorityProfileUpdateIn, actor: User = Depends(require_authority), db: Session = Depends(get_db)):
    if body.avatar_url is not None:
        actor.avatar_url = body.avatar_url.strip() if body.avatar_url else None
    if body.quote is not None:
        actor.quote = body.quote.strip() if body.quote else None
    db.commit()
    return {"ok": True, "avatar_url": actor.avatar_url, "quote": actor.quote}


@router.get("/hods")
def list_hods(db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    gov = list_governance(db, actor)
    return gov["hods"]


@router.get("/class-teachers")
def list_class_teachers(db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    gov = list_governance(db, actor)
    return gov["class_teachers"]


@router.get("/audit-logs")
@router.get("/audit")
def audit_log(limit: int = 100, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [{"id": l.id, "actor_id": l.actor_id, "action": l.action, "entity": l.entity,
             "entity_id": l.entity_id, "detail": l.detail, "created_at": l.created_at.isoformat()} for l in logs]


class AcademicSettingsIn(BaseModel):
    odd_sem_promotion_month: int = 8
    even_sem_promotion_month: int = 2
    auto_promotion_enabled: bool = True
    current_academic_year: str = "2025-26"


class PromoteSemesterIn(BaseModel):
    batch_year: int | None = None
    from_semester: int | None = None
    increment: int = 1
    max_semester: int = 8


@router.get("/academic-settings")
def get_academic_settings(db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    rows = db.query(AcademicSetting).all()
    settings_dict = {
        "odd_sem_promotion_month": "8",
        "even_sem_promotion_month": "2",
        "auto_promotion_enabled": "true",
        "current_academic_year": "2025-26",
    }
    for r in rows:
        settings_dict[r.key] = r.value

    # Calculate student distribution
    total_students = db.query(StudentProfile).count()
    sem_counts = (
        db.query(StudentProfile.current_semester, func.count(StudentProfile.id))
        .group_by(StudentProfile.current_semester)
        .order_by(StudentProfile.current_semester)
        .all()
    )
    batch_counts = (
        db.query(StudentProfile.joining_year, func.count(StudentProfile.id))
        .group_by(StudentProfile.joining_year)
        .order_by(StudentProfile.joining_year.desc())
        .all()
    )

    return {
        "settings": {
            "odd_sem_promotion_month": int(settings_dict.get("odd_sem_promotion_month", 8)),
            "even_sem_promotion_month": int(settings_dict.get("even_sem_promotion_month", 2)),
            "auto_promotion_enabled": settings_dict.get("auto_promotion_enabled", "true").lower() == "true",
            "current_academic_year": settings_dict.get("current_academic_year", "2025-26"),
        },
        "stats": {
            "total_students": total_students,
            "by_semester": [{"semester": sem, "count": cnt} for sem, cnt in sem_counts],
            "by_batch": [{"joining_year": yr, "count": cnt} for yr, cnt in batch_counts],
        }
    }


@router.post("/academic-settings")
def update_academic_settings(body: AcademicSettingsIn, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    updates = {
        "odd_sem_promotion_month": str(body.odd_sem_promotion_month),
        "even_sem_promotion_month": str(body.even_sem_promotion_month),
        "auto_promotion_enabled": "true" if body.auto_promotion_enabled else "false",
        "current_academic_year": body.current_academic_year.strip(),
    }
    for k, v in updates.items():
        row = db.query(AcademicSetting).filter_by(key=k).first()
        if not row:
            db.add(AcademicSetting(key=k, value=v))
        else:
            row.value = v
    db.commit()
    audit(db, actor, "ACADEMIC_SETTINGS_UPDATED", "settings", None, detail=str(updates))
    return {"ok": True, "settings": updates}


@router.post("/students/promote-semester")
def batch_promote_students(body: PromoteSemesterIn, db: Session = Depends(get_db), actor: User = Depends(require_authority)):
    query = db.query(StudentProfile)
    if body.batch_year is not None:
        query = query.filter(StudentProfile.joining_year == body.batch_year)
    if body.from_semester is not None:
        query = query.filter(StudentProfile.current_semester == body.from_semester)

    students = query.all()
    promoted_count = 0
    graduated_count = 0

    for st in students:
        if st.current_semester <= body.max_semester:
            new_sem = st.current_semester + body.increment
            st.current_semester = new_sem
            promoted_count += 1
            if new_sem > body.max_semester:
                graduated_count += 1

    db.commit()
    detail_str = f"Batch: {body.batch_year}, From Sem: {body.from_semester}, Promoted: {promoted_count}, Graduated: {graduated_count}"
    audit(db, actor, "STUDENTS_BATCH_PROMOTED", "students", None, detail=detail_str)
    return {
        "ok": True,
        "promoted_count": promoted_count,
        "graduated_count": graduated_count,
        "message": f"Successfully promoted {promoted_count} students ({graduated_count} transitioned to graduate status)."
    }

