"""Tests for Phase 3: Separate logins, Authority account management, and governance endpoints."""
import os
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_eventxtracker.db"
os.environ["BOOTSTRAP_SECRET"] = "test-bootstrap"
os.environ["SECRET_KEY"] = "super-secret-key-at-least-32-chars-long"

from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import Department, User, AccountType

Base.metadata.create_all(bind=engine)
db = SessionLocal()
for code in ["CSE", "ISE", "AIML", "EC", "EEE", "ME", "CV"]:
    if not db.query(Department).filter_by(code=code).first():
        db.add(Department(code=code, name=code))
db.commit()
db.close()

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_tokens():
    # Ensure there is room to bootstrap or user exists
    db = SessionLocal()
    existing = db.query(User).filter_by(email="phase3_admin@vvce.ac.in").first()
    if not existing:
        auth_users = db.query(User).filter_by(account_type=AccountType.AUTHORITY).all()
        if len(auth_users) >= 3:
            db.delete(auth_users[-1])
            db.commit()
    db.close()

    # Bootstrap authority
    client.post("/api/v1/bootstrap/authority", json={
        "email": "phase3_admin@vvce.ac.in",
        "password": "AuthoritySuperSecure123!",
        "bootstrap_secret": "test-bootstrap"
    })
    
    # Authority login via authority login endpoint
    r_auth = client.post("/api/v1/authority/auth/login", json={
        "email": "phase3_admin@vvce.ac.in",
        "password": "AuthoritySuperSecure123!"
    })
    assert r_auth.status_code == 200, r_auth.text
    auth_token = r_auth.json()["access_token"]
    
    # Provision a student and faculty
    headers = {"Authorization": f"Bearer {auth_token}"}
    r_fac = client.post("/api/v1/authority/faculty", headers=headers, json={
        "full_name": "Dr. Phase3 Faculty",
        "email": "facp301@vvce.ac.in",
        "branch": "CSE",
        "designation": "Associate Professor"
    })
    assert r_fac.status_code == 200
    fac_pw = r_fac.json()["temporary_password"]
    fac_id = r_fac.json()["user_id"]
    
    r_stu = client.post("/api/v1/authority/students", headers=headers, json={
        "full_name": "Phase3 Student",
        "usn": "1VV23CSE099",
        "email": "vvce23cse0099@vvce.ac.in",
        "branch": "CSE",
        "joining_year": 2023,
        "semester": 5,
        "section": "A"
    })
    assert r_stu.status_code == 200
    stu_pw = r_stu.json()["temporary_password"]
    stu_id = r_stu.json()["user_id"]
    
    return {
        "auth_token": auth_token,
        "fac_id": fac_id, "fac_pw": fac_pw,
        "stu_id": stu_id, "stu_pw": stu_pw
    }


def test_separate_logins(setup_tokens):
    tok = setup_tokens
    
    # 1. Authority attempting to login via ordinary /auth/login must be rejected with 403
    r = client.post("/api/v1/auth/login", json={
        "email": "phase3_admin@vvce.ac.in",
        "password": "AuthoritySuperSecure123!"
    })
    assert r.status_code == 403
    assert "Authority Portal" in r.json()["detail"]
    
    # 2. Student attempting to login via authority endpoint must be rejected with 403
    r = client.post("/api/v1/authority/auth/login", json={
        "email": "vvce23cse0099@vvce.ac.in",
        "password": tok["stu_pw"]
    })
    assert r.status_code == 403
    assert "Not an authority account" in r.json()["detail"]
    
    # 3. Faculty attempting to login via authority endpoint must be rejected with 403
    r = client.post("/api/v1/authority/auth/login", json={
        "email": "facp301@vvce.ac.in",
        "password": tok["fac_pw"]
    })
    assert r.status_code == 403
    
    # 4. Student and faculty can login via ordinary /auth/login
    r = client.post("/api/v1/auth/login", json={
        "email": "vvce23cse0099@vvce.ac.in",
        "password": tok["stu_pw"]
    })
    assert r.status_code == 200
    assert r.json()["account_type"] == "STUDENT"


def test_authority_account_crud_and_templates(setup_tokens):
    tok = setup_tokens
    headers = {"Authorization": f"Bearer {tok['auth_token']}"}
    
    # Get account by ID
    r = client.get(f"/api/v1/authority/accounts/{tok['stu_id']}", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "vvce23cse0099@vvce.ac.in"
    assert data["profile"]["usn"] == "1VV23CSE099"
    
    # Patch account
    r = client.patch(f"/api/v1/authority/accounts/{tok['stu_id']}", headers=headers, json={
        "full_name": "Phase3 Student Updated",
        "semester": 6
    })
    assert r.status_code == 200
    
    r = client.get(f"/api/v1/authority/accounts/{tok['stu_id']}", headers=headers)
    assert r.json()["profile"]["full_name"] == "Phase3 Student Updated"
    assert r.json()["profile"]["current_semester"] == 6
    
    # Download templates
    r = client.get("/api/v1/authority/accounts/import-template?kind=STUDENT", headers=headers)
    assert r.status_code == 200
    assert "joining_year" in r.text
    
    r = client.get("/api/v1/authority/accounts/import-template?kind=FACULTY", headers=headers)
    assert r.status_code == 200
    assert "designation" in r.text
    
    # Password reset alias
    r = client.post(f"/api/v1/authority/accounts/{tok['stu_id']}/password-reset", headers=headers)
    assert r.status_code == 200
    assert "temporary_password" in r.json()
    
    # Account audit
    r = client.get(f"/api/v1/authority/accounts/{tok['stu_id']}/audit", headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_departments_and_governance(setup_tokens):
    tok = setup_tokens
    headers = {"Authorization": f"Bearer {tok['auth_token']}"}
    
    # List departments
    r = client.get("/api/v1/authority/departments", headers=headers)
    assert r.status_code == 200
    depts = r.json()
    assert len(depts) == 7
    codes = {d["code"] for d in depts}
    assert {"CSE", "ISE", "AIML", "EC", "EEE", "ME", "CV"}.issubset(codes)
    
    # Governance
    r = client.get("/api/v1/authority/governance", headers=headers)
    assert r.status_code == 200
    gov = r.json()
    assert "hods" in gov
    assert "class_teachers" in gov


def test_faculty_portal_split_endpoints(setup_tokens):
    tok = setup_tokens
    
    # 1. Login as faculty
    r_fac_login = client.post("/api/v1/auth/login", json={
        "email": "facp301@vvce.ac.in",
        "password": tok["fac_pw"]
    })
    assert r_fac_login.status_code == 200
    fac_token = r_fac_login.json()["access_token"]
    fac_headers = {"Authorization": f"Bearer {fac_token}"}
    
    # 2. Normal View: Department Participation & Profile Endpoint
    r_dept = client.get("/api/v1/faculty/department-participation", headers=fac_headers)
    assert r_dept.status_code == 200
    data = r_dept.json()
    assert "faculty" in data
    assert data["faculty"]["email"] == "facp301@vvce.ac.in"
    assert "is_hod" in data["faculty"]
    assert "is_class_teacher" in data["faculty"]
    assert "institutional_role" in data["faculty"]
    assert "participants" in data
    assert "volunteers" in data
    assert "total_dept_students" in data
    
    # 3. Department Roster CSV Export
    r_export = client.get("/api/v1/faculty/department-participation/export", headers=fac_headers)
    assert r_export.status_code == 200
    assert "text/csv" in r_export.headers.get("content-type", "")
    assert "Record Type,USN,Student Name" in r_export.text
    
    # 4. Special Menu: Coordinated Events (Active vs History)
    r_coord = client.get("/api/v1/faculty/coordinated-events", headers=fac_headers)
    assert r_coord.status_code == 200
    coord_data = r_coord.json()
    assert "active_events" in coord_data
    assert "history_events" in coord_data
    assert isinstance(coord_data["active_events"], list)
    assert isinstance(coord_data["history_events"], list)
    
    # 5. Class Teacher Endpoints
    # For a faculty member who is not assigned yet:
    r_ct_class = client.get("/api/v1/faculty/class-teacher/assigned-class", headers=fac_headers)
    assert r_ct_class.status_code == 200
    assert isinstance(r_ct_class.json(), list)
    
    r_ct_students = client.get("/api/v1/faculty/class-teacher/students", headers=fac_headers)
    assert r_ct_students.status_code == 200
    assert isinstance(r_ct_students.json(), list)
    
    r_ct_reviews = client.get("/api/v1/faculty/class-teacher/reviews", headers=fac_headers)
    assert r_ct_reviews.status_code == 200
    reviews_data = r_ct_reviews.json()
    assert "internships" in reviews_data
    assert "external_events" in reviews_data
    assert "total_pending" in reviews_data


def test_student_portal_split_and_academic_requests(setup_tokens):
    tok = setup_tokens

    # 1. Reset password via authority to obtain fresh password
    headers = {"Authorization": f"Bearer {tok['auth_token']}"}
    r_reset = client.post(f"/api/v1/authority/accounts/{tok['stu_id']}/password-reset", headers=headers)
    assert r_reset.status_code == 200
    new_pw = r_reset.json()["temporary_password"]

    # 2. Login as student
    r_stu_login = client.post("/api/v1/auth/login", json={
        "email": "vvce23cse0099@vvce.ac.in",
        "password": new_pw
    })
    assert r_stu_login.status_code == 200
    stu_token = r_stu_login.json()["access_token"]
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    # 2. Normal View: Student Dashboard Activities (Registrations, Teams, Volunteering)
    r_dash = client.get("/api/v1/student/dashboard", headers=stu_headers)
    assert r_dash.status_code == 200
    data = r_dash.json()
    assert "registrations" in data
    assert "teams" in data
    assert "volunteer_applications" in data
    assert "leadership" in data

    # 3. Academic Requests: Submit Internship
    r_intern = client.post("/api/v1/internships", headers=stu_headers, json={
        "company": "Infosys Springboard",
        "role": "Cloud Developer Intern",
        "start_date": "2026-06-01",
        "end_date": "2026-07-31",
        "mode": "Remote",
        "description": "Cloud native microservices",
        "technologies": "FastAPI, Docker, AWS",
        "document_path": "https://storage.vvce.ac.in/certs/infosys.pdf"
    })
    assert r_intern.status_code == 200
    intern_id = r_intern.json()["id"]

    # 4. Academic Requests: Submit External Event
    r_ext = client.post("/api/v1/external-events", headers=stu_headers, json={
        "event_name": "VTU Inter-Collegiate Coding Contest",
        "organization": "Visvesvaraya Technological University",
        "category": "Coding Contest",
        "event_date": "2026-08-10",
        "participation_type": "Individual",
        "achievement": "First Prize",
        "document_path": "https://storage.vvce.ac.in/certs/vtu_1st.pdf"
    })
    assert r_ext.status_code == 200
    ext_id = r_ext.json()["id"]

    # 5. Student checks submitted records
    r_my_interns = client.get("/api/v1/internships", headers=stu_headers)
    assert r_my_interns.status_code == 200
    my_entry = next((i for i in r_my_interns.json() if i["id"] == intern_id), None)
    assert my_entry is not None
    assert my_entry["status"] == "PENDING_REVIEW"
    assert my_entry["document_path"] == "https://storage.vvce.ac.in/certs/infosys.pdf"


def test_academic_settings_and_semester_promotion(setup_tokens):
    auth_token = setup_tokens["auth_token"]
    headers = {"Authorization": f"Bearer {auth_token}"}

    # 1. Fetch academic settings
    r = client.get("/api/v1/authority/academic-settings", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "settings" in data
    assert "stats" in data
    assert "odd_sem_promotion_month" in data["settings"]
    assert "even_sem_promotion_month" in data["settings"]

    # 2. Update academic settings
    r_update = client.post("/api/v1/authority/academic-settings", headers=headers, json={
        "odd_sem_promotion_month": 9,
        "even_sem_promotion_month": 3,
        "auto_promotion_enabled": True,
        "current_academic_year": "2026-27"
    })
    assert r_update.status_code == 200
    assert r_update.json()["settings"]["odd_sem_promotion_month"] == "9"

    # Verify settings persisted
    r_check = client.get("/api/v1/authority/academic-settings", headers=headers)
    assert r_check.status_code == 200
    assert r_check.json()["settings"]["odd_sem_promotion_month"] == 9
    assert r_check.json()["settings"]["current_academic_year"] == "2026-27"

    # 3. Test semester promotion
    r_promote = client.post("/api/v1/authority/students/promote-semester", headers=headers, json={
        "batch_year": 2023,
        "from_semester": 3,
        "increment": 1,
        "max_semester": 8
    })
    assert r_promote.status_code == 200
    res = r_promote.json()
    assert res["ok"] is True
    assert "promoted_count" in res



