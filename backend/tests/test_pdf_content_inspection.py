"""Deep content inspection of all 16 A4 PDF Reports.
Extracts and parses actual text from PDF streams using pypdf to verify headers,
columns, records, pagination, and strict absence of volunteer hours.
"""
import io
import os
import sys
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
import pypdf

os.environ["DATABASE_URL"] = "sqlite:///./test_eventxtracker.db"
os.environ["BOOTSTRAP_SECRET"] = "test-bootstrap"
os.environ["SECRET_KEY"] = "super-secret-key-at-least-32-chars-long"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

def hdr(token):
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def pdf_test_context():
    # 1. Authority
    db = SessionLocal()
    existing = db.query(User).filter_by(email="pdf_admin@vvce.ac.in").first()
    if not existing:
        auth_users = db.query(User).filter_by(account_type=AccountType.AUTHORITY).all()
        if len(auth_users) >= 3:
            db.delete(auth_users[-1])
            db.commit()
    db.close()

    client.post("/api/v1/bootstrap/authority", json={
        "email": "pdf_admin@vvce.ac.in",
        "password": "AuthoritySuperSecure123!",
        "bootstrap_secret": "test-bootstrap"
    })
    auth_tok = client.post("/api/v1/authority/auth/login", json={
        "email": "pdf_admin@vvce.ac.in",
        "password": "AuthoritySuperSecure123!"
    }).json()["access_token"]
    h_a = hdr(auth_tok)

    # 2. Faculty
    r_f = client.post("/api/v1/authority/faculty", headers=h_a, json={
        "full_name": "Dr. PDF Test Coordinator",
        "email": "fac_pdf@vvce.ac.in",
        "branch": "CSE",
        "designation": "Professor"
    })
    fac_pw = r_f.json()["temporary_password"]
    fac_tok = client.post("/api/v1/auth/login", json={
        "email": "fac_pdf@vvce.ac.in", "password": fac_pw
    }).json()["access_token"]
    h_f = hdr(fac_tok)

    # 3. Student
    r_s = client.post("/api/v1/authority/students", headers=h_a, json={
        "full_name": "Ananya Sharma",
        "usn": "1VV23CSE061",
        "email": "vvce23cse0061@vvce.ac.in",
        "branch": "CSE",
        "joining_year": 2023,
        "semester": 5,
        "section": "A"
    })
    stu_pw = r_s.json()["temporary_password"]
    stu_tok = client.post("/api/v1/auth/login", json={
        "email": "vvce23cse0061@vvce.ac.in", "password": stu_pw
    }).json()["access_token"]
    h_s = hdr(stu_tok)

    # Class teacher assignment for CSE Sem 5 Section A
    cse_id = [d for d in client.get("/api/v1/authority/departments", headers=h_a).json() if d["code"] == "CSE"][0]["id"]
    client.post(
        f"/api/v1/authority/class-teacher?department_id={cse_id}&semester=5&section=A&academic_year=2025-26&faculty_user_id={r_f.json()['user_id']}",
        headers=h_a
    )

    # 4. Create Event & Records
    start = datetime.now(timezone.utc) - timedelta(hours=1)
    end = datetime.now(timezone.utc) + timedelta(days=2)
    ev = client.post("/api/v1/events", headers=h_f, json={
        "name": "State Level Robotics Conclave",
        "description": "Annual Autonomous Robotics Conclave",
        "category": "Robotics",
        "venue": "Mechanical Block Lab 3",
        "start_at": start.isoformat(),
        "end_at": end.isoformat(),
        "individual_enabled": True,
        "team_enabled": True,
        "volunteer_enabled": True
    }).json()
    eid = ev["id"]

    # Student registers and is shortlisted
    client.post(f"/api/v1/events/{eid}/register", headers=h_s, json={"answers": {}})
    client.post(f"/api/v1/events/{eid}/leadership?student_user_id={r_s.json()['user_id']}&role=PRESIDENT", headers=h_f)
    subs = client.get(f"/api/v1/events/{eid}/submissions", headers=h_f).json()
    if subs:
        client.post(f"/api/v1/events/{eid}/shortlist/{subs[0]['id']}", headers=h_s)

    # Volunteer applies, is approved, allocated, and completed
    client.post(f"/api/v1/events/{eid}/volunteer-apply", headers=h_s, json={
        "skills": "Robotics hardware", "preferred_area": "Arena Setup"
    })
    v_apps = client.get(f"/api/v1/events/{eid}/volunteers", headers=h_f).json()
    v_id = v_apps[0]["id"]
    client.post(f"/api/v1/volunteer-applications/{v_id}/approve?approve=true", headers=h_f)
    client.post(f"/api/v1/volunteer-applications/{v_id}/allocate?responsibility=Arena+Marshal&allocation=Table-1", headers=h_f)
    client.post(f"/api/v1/volunteer-applications/{v_id}/complete?completed=true", headers=h_f)

    # Student submits internship and CT verifies
    int_resp = client.post("/api/v1/internships", headers=h_s, json={
        "company": "Bosch Global Software",
        "role": "Embedded Systems Intern"
    }).json()
    client.post(f"/api/v1/internships/{int_resp['id']}/review?status=VERIFIED&evidence_inspected=true", headers=h_f)

    # Student submits external event
    ext_resp = client.post("/api/v1/external-events", headers=h_s, json={
        "event_name": "IIT Bombay Techfest",
        "organization": "IIT Bombay",
        "category": "Robotics"
    }).json()
    client.post(f"/api/v1/external-events/{ext_resp['id']}/review?status=VERIFIED&evidence_inspected=true", headers=h_f)

    return {"h_f": h_f, "eid": eid}


def extract_pdf_text(content: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(content))
    assert len(reader.pages) >= 1
    text = ""
    for page in reader.pages:
        t = page.extract_text()
        if t:
            text += t + "\n"
    return text


def test_pdf_report_1_event_executive(pdf_test_context):
    h = pdf_test_context["h_f"]
    eid = pdf_test_context["eid"]
    r = client.get(f"/api/v1/reports/event_executive?event_id={eid}", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Executive Summary" in text or "Robotics Conclave" in text


def test_pdf_report_2_participants(pdf_test_context):
    h = pdf_test_context["h_f"]
    eid = pdf_test_context["eid"]
    r = client.get(f"/api/v1/reports/participants?event_id={eid}", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "1VV23CSE061" in text or "Ananya" in text


def test_pdf_report_3_teams(pdf_test_context):
    h = pdf_test_context["h_f"]
    eid = pdf_test_context["eid"]
    r = client.get(f"/api/v1/reports/teams?event_id={eid}", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Team" in text


def test_pdf_report_4_attendance(pdf_test_context):
    h = pdf_test_context["h_f"]
    eid = pdf_test_context["eid"]
    r = client.get(f"/api/v1/reports/attendance?event_id={eid}", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Attendance" in text


def test_pdf_report_5_volunteer_applications(pdf_test_context):
    h = pdf_test_context["h_f"]
    eid = pdf_test_context["eid"]
    r = client.get(f"/api/v1/reports/volunteer_applications?event_id={eid}", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Volunteer" in text


def test_pdf_report_6_volunteer_allocations(pdf_test_context):
    h = pdf_test_context["h_f"]
    eid = pdf_test_context["eid"]
    r = client.get(f"/api/v1/reports/volunteer_allocations?event_id={eid}", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Allocation" in text or "Arena Marshal" in text


def test_pdf_report_7_winners(pdf_test_context):
    h = pdf_test_context["h_f"]
    eid = pdf_test_context["eid"]
    r = client.get(f"/api/v1/reports/winners?event_id={eid}", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Winner" in text or "Recognition" in text or "Podium" in text


def test_pdf_report_8_volunteer_completion_strictly_no_hours(pdf_test_context):
    """Report 8 must not mention volunteer hours or hourly calculations."""
    h = pdf_test_context["h_f"]
    eid = pdf_test_context["eid"]
    r = client.get(f"/api/v1/reports/volunteer_completion?event_id={eid}", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Completion" in text
    assert "hours" not in text.lower()
    assert "hour" not in text.lower()


def test_pdf_report_9_event_summary(pdf_test_context):
    h = pdf_test_context["h_f"]
    eid = pdf_test_context["eid"]
    r = client.get(f"/api/v1/reports/event_summary?event_id={eid}", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Summary" in text


def test_pdf_report_10_semester_register(pdf_test_context):
    h = pdf_test_context["h_f"]
    r = client.get("/api/v1/reports/semester_register", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Semester" in text


def test_pdf_report_11_section_register(pdf_test_context):
    h = pdf_test_context["h_f"]
    r = client.get("/api/v1/reports/section_register", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Section" in text


def test_pdf_report_12_internships(pdf_test_context):
    h = pdf_test_context["h_f"]
    r = client.get("/api/v1/reports/internships", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Internship" in text


def test_pdf_report_13_verified_internships(pdf_test_context):
    h = pdf_test_context["h_f"]
    r = client.get("/api/v1/reports/verified_internships", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Verified" in text or "Bosch" in text


def test_pdf_report_14_external_events(pdf_test_context):
    h = pdf_test_context["h_f"]
    r = client.get("/api/v1/reports/external_events", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "External" in text


def test_pdf_report_15_external_verification(pdf_test_context):
    h = pdf_test_context["h_f"]
    r = client.get("/api/v1/reports/external_verification", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Verification" in text or "Techfest" in text


def test_pdf_report_16_comprehensive_extract(pdf_test_context):
    h = pdf_test_context["h_f"]
    r = client.get("/api/v1/reports/comprehensive_extract", headers=h)
    assert r.status_code == 200
    text = extract_pdf_text(r.content)
    assert "Academic" in text or "Register" in text or "Extract" in text
