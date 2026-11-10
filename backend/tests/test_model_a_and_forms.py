"""Comprehensive tests for Model A/B Scoping, Dynamic Form Validation, and Volunteer Governance."""
import os
import sys
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_eventxtracker.db"
os.environ["BOOTSTRAP_SECRET"] = "test-bootstrap"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import Department

Base.metadata.create_all(bind=engine)
db = SessionLocal()
for code in ["CSE", "ISE", "AIML", "EC", "EEE", "ME", "CV"]:
    if not db.query(Department).filter_by(code=code).first():
        db.add(Department(code=code, name=code))
db.commit()
db.close()

client = TestClient(app)

def authority_login(email, password):
    client.post("/api/v1/bootstrap/authority", json={
        "email": email,
        "password": password,
        "bootstrap_secret": "test-bootstrap"
    })
    r = client.post("/api/v1/authority/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]

def login(email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]

def hdr(token):
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def setup_model_a_data():
    auth_tok = authority_login("authority@vvce.ac.in", "authority-secret-123")
    a = hdr(auth_tok)

    # Create EC faculty
    r = client.post("/api/v1/authority/faculty", headers=a, json={
        "full_name": "EC Faculty", "email": "ec_fac_m_a@vvce.ac.in", "branch": "EC", "designation": "Associate Prof"
    })
    assert r.status_code == 200, r.text
    ec_pw = r.json()["temporary_password"]
    ec_token = login("ec_fac_m_a@vvce.ac.in", ec_pw)

    # Create CSE faculty (non-coordinator)
    r = client.post("/api/v1/authority/faculty", headers=a, json={
        "full_name": "CSE Faculty 2", "email": "cse_fac2_m_a@vvce.ac.in", "branch": "CSE", "designation": "Assistant Prof"
    })
    assert r.status_code == 200, r.text
    cse2_pw = r.json()["temporary_password"]
    cse2_token = login("cse_fac2_m_a@vvce.ac.in", cse2_pw)

    # Create CSE coordinator faculty
    r = client.post("/api/v1/authority/faculty", headers=a, json={
        "full_name": "CSE Coordinator", "email": "cse_coord_m_a@vvce.ac.in", "branch": "CSE", "designation": "HOD"
    })
    assert r.status_code == 200, r.text
    cse_coord_pw = r.json()["temporary_password"]
    cse_coord_token = login("cse_coord_m_a@vvce.ac.in", cse_coord_pw)

    # Create an EC student
    r = client.post("/api/v1/authority/students", headers=a, json={
        "full_name": "EC Student Model A", "usn": "1VV23EC088", "email": "vvce23ec0088@vvce.ac.in",
        "branch": "EC", "joining_year": 2023, "semester": 5, "section": "A"
    })
    assert r.status_code == 200, r.text
    ec_stu_pw = r.json()["temporary_password"]
    ec_stu_token = login("vvce23ec0088@vvce.ac.in", ec_stu_pw)

    # Create a CSE student
    r = client.post("/api/v1/authority/students", headers=a, json={
        "full_name": "CSE Student Model A", "usn": "1VV23CSE088", "email": "vvce23cse0088@vvce.ac.in",
        "branch": "CSE", "joining_year": 2023, "semester": 5, "section": "B"
    })
    assert r.status_code == 200, r.text
    cse_stu_pw = r.json()["temporary_password"]
    cse_stu_token = login("vvce23cse0088@vvce.ac.in", cse_stu_pw)

    return {
        "auth_tok": auth_tok,
        "ec_fac": ec_token,
        "cse_fac2": cse2_token,
        "cse_coord": cse_coord_token,
        "ec_stu": ec_stu_token,
        "cse_stu": cse_stu_token,
    }


def test_model_a_department_and_coordinator_visibility(setup_model_a_data):
    """
    Model A Scoping:
    - Faculty in CSE can see own-dept student event records even without CT assignment.
    - Faculty in EC cannot see CSE student records unless they are coordinator of that event.
    - Event Coordinator can see cross-department records.
    """
    data = setup_model_a_data
    cse_coord_h = hdr(data["cse_coord"])
    cse_fac2_h = hdr(data["cse_fac2"])
    ec_fac_h = hdr(data["ec_fac"])
    cse_stu_h = hdr(data["cse_stu"])
    ec_stu_h = hdr(data["ec_stu"])

    # Create an event coordinated by CSE Coordinator
    start = datetime.now(timezone.utc) - timedelta(hours=1)
    end = datetime.now(timezone.utc) + timedelta(days=2)
    r = client.post("/api/v1/events", headers=cse_coord_h, json={
        "name": "Model A Inter-College Conclave",
        "start_at": start.isoformat(),
        "end_at": end.isoformat(),
        "team_enabled": False,
        "volunteer_enabled": True
    })
    assert r.status_code == 200, r.text
    eid = r.json()["id"]

    # Both CSE student and EC student register
    r1 = client.post(f"/api/v1/events/{eid}/register", headers=cse_stu_h, json={"answers": {}})
    assert r1.status_code == 200, r1.text
    r2 = client.post(f"/api/v1/events/{eid}/register", headers=ec_stu_h, json={"answers": {}})
    assert r2.status_code == 200, r2.text

    # 1. Event Coordinator (CSE Coordinator) sees both CSE and EC participants (Cross-dept view)
    res_coord = client.get(f"/api/v1/events/{eid}/participants", headers=cse_coord_h)
    assert res_coord.status_code == 200
    coord_p = res_coord.json()["individuals"]
    usns_coord = [p.get("usn") for p in coord_p]
    assert "1VV23CSE088" in usns_coord
    assert "1VV23EC088" in usns_coord

    # 2. CSE Faculty 2 (Not a coordinator, no CT role) can view CSE student records in Model A
    res_cse2 = client.get(f"/api/v1/events/{eid}/participants", headers=cse_fac2_h)
    assert res_cse2.status_code == 200
    cse2_p = res_cse2.json()["individuals"]
    usns_cse2 = [p.get("usn") for p in cse2_p]
    assert "1VV23CSE088" in usns_cse2
    # But cannot see EC student records!
    assert "1VV23EC088" not in usns_cse2

    # 3. EC Faculty (Not a coordinator) can view EC student records, but not CSE records
    res_ec = client.get(f"/api/v1/events/{eid}/participants", headers=ec_fac_h)
    assert res_ec.status_code == 200
    ec_p = res_ec.json()["individuals"]
    usns_ec = [p.get("usn") for p in ec_p]
    assert "1VV23EC088" in usns_ec
    assert "1VV23CSE088" not in usns_ec


def test_dynamic_form_builder_validation(setup_model_a_data):
    """
    Test immutable versioning and strict field validation:
    - Required field
    - Email format
    - Number bounds
    - Options dropdown
    """
    data = setup_model_a_data
    cse_coord_h = hdr(data["cse_coord"])
    cse_stu_h = hdr(data["cse_stu"])

    start = datetime.now(timezone.utc) - timedelta(hours=1)
    end = datetime.now(timezone.utc) + timedelta(days=2)
    r = client.post("/api/v1/events", headers=cse_coord_h, json={
        "name": "Dynamic Form Test Event",
        "start_at": start.isoformat(),
        "end_at": end.isoformat(),
        "team_enabled": False,
        "volunteer_enabled": False
    })
    eid = r.json()["id"]

    # Version 1 Form
    form_v1 = {
        "questions": [
            {"id": "q_req", "title": "Required Text", "type": "short_text", "required": True},
            {"id": "q_mail", "title": "Contact Email", "type": "email", "required": False},
            {"id": "q_num", "title": "Experience Years", "type": "number", "min": 1, "max": 10, "required": False},
            {"id": "q_track", "title": "Track", "type": "dropdown", "options": ["Web", "AI", "Cloud"], "required": False}
        ]
    }
    r = client.put(f"/api/v1/events/{eid}/form", headers=cse_coord_h, json=form_v1)
    assert r.status_code == 200
    assert r.json()["version"] == 1

    # Missing required field
    bad1 = client.post(f"/api/v1/events/{eid}/register", headers=cse_stu_h, json={"answers": {}})
    assert bad1.status_code == 400
    assert "Required Text" in bad1.json()["detail"]

    # Invalid email format
    bad2 = client.post(f"/api/v1/events/{eid}/register", headers=cse_stu_h, json={
        "answers": {"q_req": "Here", "q_mail": "not-an-email"}
    })
    assert bad2.status_code == 400
    assert "valid email" in bad2.json()["detail"].lower()

    # Out of range number
    bad3 = client.post(f"/api/v1/events/{eid}/register", headers=cse_stu_h, json={
        "answers": {"q_req": "Here", "q_num": 15}
    })
    assert bad3.status_code == 400
    assert "at most 10" in bad3.json()["detail"]

    # Invalid dropdown choice
    bad4 = client.post(f"/api/v1/events/{eid}/register", headers=cse_stu_h, json={
        "answers": {"q_req": "Here", "q_track": "InvalidChoice"}
    })
    assert bad4.status_code == 400
    assert "Must be one of" in bad4.json()["detail"]

    # Valid submission
    good = client.post(f"/api/v1/events/{eid}/register", headers=cse_stu_h, json={
        "answers": {
            "q_req": "All valid here",
            "q_mail": "valid.student@vvce.ac.in",
            "q_num": 3,
            "q_track": "AI"
        }
    })
    assert good.status_code == 200

    # Publish Version 2 Form
    form_v2 = {
        "questions": [
            {"id": "q_v2", "title": "V2 Question", "type": "short_text", "required": False}
        ]
    }
    r_v2 = client.put(f"/api/v1/events/{eid}/form", headers=cse_coord_h, json=form_v2)
    assert r_v2.status_code == 200
    assert r_v2.json()["version"] == 2


def test_volunteer_governance_lifecycle(setup_model_a_data):
    """
    Test Volunteer Lifecycle:
    - Student applies via /events/{id}/volunteer-apply
    - Faculty Coordinator approves, allocates role, and marks completion
    - Verify reports are accessible
    """
    data = setup_model_a_data
    cse_coord_h = hdr(data["cse_coord"])
    ec_stu_h = hdr(data["ec_stu"])

    start = datetime.now(timezone.utc) - timedelta(hours=1)
    end = datetime.now(timezone.utc) + timedelta(days=2)
    r = client.post("/api/v1/events", headers=cse_coord_h, json={
        "name": "Volunteer Gala",
        "start_at": start.isoformat(),
        "end_at": end.isoformat(),
        "team_enabled": False,
        "volunteer_enabled": True
    })
    eid = r.json()["id"]

    # EC Student applies as volunteer
    r_apply = client.post(f"/api/v1/events/{eid}/volunteer-apply", headers=ec_stu_h, json={
        "skills": "Stage management",
        "preferred_area": "Logistics",
        "experience": "1 year",
        "availability": "All days"
    })
    assert r_apply.status_code == 200, r_apply.text

    # Coordinator views applications
    apps = client.get(f"/api/v1/events/{eid}/volunteers", headers=cse_coord_h).json()
    assert len(apps) >= 1
    target_app = [a for a in apps if a["usn"] == "1VV23EC088"][0]
    app_id = target_app["id"]
    assert target_app["status"] == "PENDING"

    # Coordinator reviews application
    r_rev = client.post(f"/api/v1/volunteer-applications/{app_id}/approve?approve=true", headers=cse_coord_h)
    assert r_rev.status_code == 200

    # Coordinator allocates duty/role
    r_alloc = client.post(f"/api/v1/volunteer-applications/{app_id}/allocate?responsibility=Registration&allocation=Desk-A", headers=cse_coord_h)
    assert r_alloc.status_code == 200

    # Coordinator marks completion
    r_comp = client.post(f"/api/v1/volunteer-applications/{app_id}/complete?completed=true", headers=cse_coord_h)
    assert r_comp.status_code == 200

    # Download Volunteer completion report (Report 8) - verify 200 and no mention of volunteer hours
    r_rep = client.get(f"/api/v1/reports/volunteer_completion?event_id={eid}", headers=cse_coord_h)
    assert r_rep.status_code == 200
    assert r_rep.headers["content-type"] == "application/pdf"
    assert b"hours" not in r_rep.content.lower()
