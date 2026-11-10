"""Idempotent synthetic seed: exactly 200 ordinary accounts (40 faculty + 160 students),
1 HOD per department, Class Teacher assignments for odd semesters. Credentials written to
seed_credentials.local.txt (gitignored). Never runs against production (SEED_GUARD)."""
import os
import random
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))

GUARD = os.getenv("SEED_GUARD", "")
if GUARD != "I_UNDERSTAND_THIS_IS_DEV_ONLY":
    print("Refusing to seed. Set SEED_GUARD=I_UNDERSTAND_THIS_IS_DEV_ONLY for the local dev DB only.")
    sys.exit(1)

from app.db import SessionLocal, engine, Base
from app.models import (User, StudentProfile, FacultyProfile, Department, AccountType, AccountStatus,
                        HODAssignment, ClassTeacherAssignment, BRANCHES)
from app.security import hash_password, generate_temp_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()
random.seed(42)

BATCH = "seed-2026-11-06"
if db.query(User).filter_by(seed_batch=BATCH).first():
    print("Seed batch already applied — idempotent, nothing to do.")
    sys.exit(0)

FACULTY_COUNT = {"CSE": 5, "ISE": 5, "AIML": 10, "EC": 5, "EEE": 5, "ME": 5, "CV": 5}
STUDENT_COUNT = {"CSE": 5, "ISE": 5, "AIML": 10, "EC": 5, "EEE": 5, "ME": 5, "CV": 5}
ODD_SEMESTERS = [1, 3, 5, 7]

creds = []
first = ["Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Sara", "Kiran", "Meera", "Rahul", "Priya"]
last = ["Sharma", "Patel", "Reddy", "Nair", "kulkarni".title(), "Shetty", "Bhat", "Hegde", " Rao".strip(), "Joshi"]


def mk_user(email, atype):
    pw = generate_temp_password()
    u = User(email=email, password_hash=hash_password(pw), account_type=atype,
             status=AccountStatus.ACTIVE, must_change_password=False, is_seeded=True, seed_batch=BATCH)
    db.add(u)
    db.flush()
    creds.append((email, pw))
    return u


NAMES = {"CSE": "Computer Science & Engineering", "ISE": "Information Science & Engineering",
         "AIML": "AI & Machine Learning", "EC": "Electronics & Communication",
         "EEE": "Electrical & Electronics", "ME": "Mechanical", "CV": "Civil"}
for code in BRANCHES:
    if not db.query(Department).filter_by(code=code).first():
        db.add(Department(code=code, name=NAMES[code]))
db.commit()
depts = {d.code: d for d in db.query(Department).all()}
hods = {}
for code, n in FACULTY_COUNT.items():
    fac = []
    for i in range(1, n + 1):
        name = f"{random.choice(first)} {random.choice(last)}"
        email = f"fac{code.lower()}{i:02d}@vvce.ac.in"
        u = mk_user(email, AccountType.FACULTY)
        db.add(FacultyProfile(user_id=u.id, full_name=name, department_id=depts[code].id,
                              designation="Assistant Professor"))
        fac.append(u)
    hods[code] = fac[0].id
    db.add(HODAssignment(department_id=depts[code].id, faculty_user_id=fac[0].id,
                         assigned_by=fac[0].id, active=True))

for code, per_sem in STUDENT_COUNT.items():
    seq = 1
    for sem in ODD_SEMESTERS:
        for i in range(per_sem):
            name = f"{random.choice(first)} {random.choice(last)}"
            yy = 23 + (4 - ODD_SEMESTERS.index(sem))  # semester 1 -> joining year 23
            email = f"vvce{str(yy)[2:]}{code.lower()}{seq:04d}@vvce.ac.in"
            usn = f"1VV{str(yy)}6{code}{seq:03d}"
            u = mk_user(email, AccountType.STUDENT)
            db.add(StudentProfile(user_id=u.id, full_name=name, usn=usn, department_id=depts[code].id,
                                  joining_year=yy, current_semester=sem, section="A"))
            seq += 1

for code in BRANCHES:
    fac_ids = [u.id for u in db.query(User).join(User.faculty_profile).filter(
        FacultyProfile.department_id == depts[code].id).all()]
    for sem in ODD_SEMESTERS:
        db.add(ClassTeacherAssignment(department_id=depts[code].id, semester=sem, section="A",
                                      academic_year="2025-26", faculty_user_id=random.choice(fac_ids),
                                      assigned_by=fac_ids[0], active=True))

db.commit()
with open(os.path.join(os.path.dirname(__file__), "seed_credentials.local.txt"), "w") as f:
    f.write("# DEV ONLY — never commit\n")
    for e, p in creds:
        f.write(f"{e}  {p}\n")
print(f"Seeded {len(creds)} accounts (40 faculty + 160 students expected = 200).")
db.close()
