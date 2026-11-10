"""Comprehensive Automated Acceptance Test Suite for Portal Authentication Isolation.

Verifies:
1. Complete 2x3 Authentication Matrix across /api/v1/authority/auth/login and /api/v1/auth/login.
2. Token refresh portal isolation across both refresh endpoints.
3. Cross-portal API route enforcement (Student/Faculty -> Authority endpoints; Authority -> Campus endpoints).
4. Protected API endpoints against expired, malformed, missing, and suspended user tokens.
"""
import os
import uuid
import pytest
from datetime import timedelta
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_eventxtracker.db"
os.environ["BOOTSTRAP_SECRET"] = "test-bootstrap"
os.environ["SECRET_KEY"] = "super-secret-key-at-least-32-chars-long"

from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import Department, User, AccountType, AccountStatus
from app.security import create_token

Base.metadata.create_all(bind=engine)
client = TestClient(app)


@pytest.fixture(scope="module")
def isolation_ctx():
    uid = uuid.uuid4().hex[:6]
    db = SessionLocal()

    # Ensure authority account ceiling not breached
    auth_email = f"auth_iso_{uid}@vvce.ac.in"
    auth_users = db.query(User).filter_by(account_type=AccountType.AUTHORITY).all()
    if len(auth_users) >= 3:
        db.delete(auth_users[-1])
        db.commit()

    # Department
    dept = db.query(Department).filter_by(code="CSE").first()
    if not dept:
        dept = Department(code="CSE", name="Computer Science & Engineering")
        db.add(dept)
        db.commit()
    dept_id = dept.id
    db.close()

    # 1. Bootstrap and log in Authority
    auth_pw = "AuthoritySecret123!"
    r_boot = client.post("/api/v1/bootstrap/authority", json={
        "email": auth_email,
        "password": auth_pw,
        "bootstrap_secret": "test-bootstrap"
    })
    assert r_boot.status_code in (200, 400)

    r_auth_login = client.post("/api/v1/authority/auth/login", json={
        "email": auth_email,
        "password": auth_pw
    })
    assert r_auth_login.status_code == 200, r_auth_login.text
    auth_data = r_auth_login.json()
    auth_token = auth_data["access_token"]
    auth_refresh = auth_data["refresh_token"]
    auth_headers = {"Authorization": f"Bearer {auth_token}"}

    # 2. Provision Faculty
    fac_email = f"fac_iso_{uid}@vvce.ac.in"
    fac_pw = "FacultyInitPass123!"
    r_fac = client.post("/api/v1/authority/faculty", headers=auth_headers, json={
        "full_name": "Dr. Isolation Faculty",
        "email": fac_email,
        "branch": "CSE",
        "designation": "Associate Professor"
    })
    assert r_fac.status_code == 200, r_fac.text
    fac_pw = r_fac.json()["temporary_password"]

    # 3. Provision Student
    stud_email = f"vvce23cse{uid[:3]}1@vvce.ac.in"
    stud_usn = f"4VV23CS{uid[:3].upper()}1"
    r_stud = client.post("/api/v1/authority/students", headers=auth_headers, json={
        "full_name": "Isolation Student",
        "email": stud_email,
        "usn": stud_usn,
        "branch": "CSE",
        "semester": 5,
        "section": "A",
        "joining_year": 2023
    })
    assert r_stud.status_code == 200, r_stud.text
    stud_pw = r_stud.json()["temporary_password"]

    # 4. Provision Suspended Student
    susp_email = f"vvce23cse{uid[:3]}2@vvce.ac.in"
    r_susp = client.post("/api/v1/authority/students", headers=auth_headers, json={
        "full_name": "Suspended Student",
        "email": susp_email,
        "usn": f"4VV23CS{uid[:3].upper()}2",
        "branch": "CSE",
        "semester": 5,
        "section": "B",
        "joining_year": 2023
    })
    assert r_susp.status_code == 200, r_susp.text
    susp_pw = r_susp.json()["temporary_password"]
    susp_user_id = r_susp.json()["user_id"]

    # Suspend the user
    db = SessionLocal()
    susp_user = db.get(User, susp_user_id)
    susp_user.status = AccountStatus.SUSPENDED
    db.commit()
    db.close()

    return {
        "auth": {"email": auth_email, "password": auth_pw, "token": auth_token, "refresh": auth_refresh},
        "fac": {"email": fac_email, "password": fac_pw},
        "stud": {"email": stud_email, "password": stud_pw},
        "susp": {"email": susp_email, "password": susp_pw, "id": susp_user_id},
    }


def test_auth_login_matrix(isolation_ctx):
    """Test all 6 combinations of the 2x3 portal entrypoint matrix."""
    auth = isolation_ctx["auth"]
    fac = isolation_ctx["fac"]
    stud = isolation_ctx["stud"]

    # 1. Authority Login with Authority Credentials -> 200 OK
    res = client.post("/api/v1/authority/auth/login", json={
        "email": auth["email"],
        "password": auth["password"]
    })
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert "refresh_token" in res.json()

    # 2. Authority Login with Faculty Credentials -> 403 Forbidden
    res = client.post("/api/v1/authority/auth/login", json={
        "email": fac["email"],
        "password": fac["password"]
    })
    assert res.status_code == 403
    assert "not an authority" in res.json()["detail"].lower()

    # 3. Authority Login with Student Credentials -> 403 Forbidden
    res = client.post("/api/v1/authority/auth/login", json={
        "email": stud["email"],
        "password": stud["password"]
    })
    assert res.status_code == 403
    assert "not an authority" in res.json()["detail"].lower()

    # 4. Campus Login with Faculty Credentials -> 200 OK, account_type FACULTY
    res = client.post("/api/v1/auth/login", json={
        "email": fac["email"],
        "password": fac["password"]
    })
    assert res.status_code == 200
    assert res.json()["account_type"] == "FACULTY"
    fac_token = res.json()["access_token"]
    fac_refresh = res.json()["refresh_token"]
    fac["token"] = fac_token
    fac["refresh"] = fac_refresh

    # 5. Campus Login with Student Credentials -> 200 OK, account_type STUDENT
    res = client.post("/api/v1/auth/login", json={
        "email": stud["email"],
        "password": stud["password"]
    })
    assert res.status_code == 200
    assert res.json()["account_type"] == "STUDENT"
    stud_token = res.json()["access_token"]
    stud_refresh = res.json()["refresh_token"]
    stud["token"] = stud_token
    stud["refresh"] = stud_refresh

    # 6. Campus Login with Authority Credentials -> 403 Forbidden
    res = client.post("/api/v1/auth/login", json={
        "email": auth["email"],
        "password": auth["password"]
    })
    assert res.status_code == 403
    assert "authority portal" in res.json()["detail"].lower()


def test_token_refresh_portal_isolation(isolation_ctx):
    """Test that refresh tokens cannot be cross-used between campus and authority portals."""
    auth = isolation_ctx["auth"]
    stud = isolation_ctx["stud"]

    # 1. Campus refresh with Student refresh token -> 200 OK
    res = client.post("/api/v1/auth/refresh", json={"refresh_token": stud["refresh"]})
    assert res.status_code == 200
    assert "access_token" in res.json()

    # 2. Campus refresh with Authority refresh token -> 403 Forbidden
    res = client.post("/api/v1/auth/refresh", json={"refresh_token": auth["refresh"]})
    assert res.status_code == 403
    assert "authority accounts must use" in res.json()["detail"].lower()

    # 3. Authority refresh with Authority refresh token -> 200 OK
    res = client.post("/api/v1/authority/auth/refresh", json={"refresh_token": auth["refresh"]})
    assert res.status_code == 200
    assert "access_token" in res.json()

    # 4. Authority refresh with Student refresh token -> 403 Forbidden
    res = client.post("/api/v1/authority/auth/refresh", json={"refresh_token": stud["refresh"]})
    assert res.status_code == 403
    assert "campus accounts must use" in res.json()["detail"].lower()


def test_cross_portal_api_endpoint_protection(isolation_ctx):
    """Verify that every endpoint rigorously rejects tokens from unauthorized portal domains."""
    auth_token = isolation_ctx["auth"]["token"]
    fac_token = isolation_ctx["fac"]["token"]
    stud_token = isolation_ctx["stud"]["token"]

    auth_h = {"Authorization": f"Bearer {auth_token}"}
    fac_h = {"Authorization": f"Bearer {fac_token}"}
    stud_h = {"Authorization": f"Bearer {stud_token}"}

    # --- Student/Faculty accessing Authority Endpoints -> 403 ---
    assert client.get("/api/v1/authority/dashboard", headers=stud_h).status_code == 403
    assert client.get("/api/v1/authority/dashboard", headers=fac_h).status_code == 403
    assert client.get("/api/v1/authority/auth/me", headers=stud_h).status_code == 403
    assert client.get("/api/v1/authority/auth/me", headers=fac_h).status_code == 403
    assert client.get("/api/v1/authority/audit-logs", headers=stud_h).status_code == 403
    assert client.get("/api/v1/authority/audit-logs", headers=fac_h).status_code == 403

    # --- Authority accessing Campus Endpoints -> 403 ---
    assert client.get("/api/v1/student/dashboard", headers=auth_h).status_code == 403
    assert client.get("/api/v1/faculty/dashboard", headers=auth_h).status_code == 403
    assert client.get("/api/v1/events", headers=auth_h).status_code == 403
    assert client.get("/api/v1/notifications", headers=auth_h).status_code == 403
    assert client.get("/api/v1/auth/me", headers=auth_h).status_code == 403
    assert client.get("/api/v1/internships", headers=auth_h).status_code == 403
    assert client.get("/api/v1/reports/event_executive", headers=auth_h).status_code == 403

    # --- Student accessing Faculty Endpoints -> 403 ---
    assert client.get("/api/v1/faculty/dashboard", headers=stud_h).status_code == 403
    assert client.post("/api/v1/events", headers=stud_h, json={"name": "Hacked"}).status_code == 403

    # --- Faculty accessing Student Endpoints -> 403 ---
    assert client.get("/api/v1/student/dashboard", headers=fac_h).status_code == 403

    # --- Authorized calls succeed with 200 ---
    assert client.get("/api/v1/authority/dashboard", headers=auth_h).status_code == 200
    assert client.get("/api/v1/authority/auth/me", headers=auth_h).status_code == 200
    assert client.get("/api/v1/faculty/dashboard", headers=fac_h).status_code == 200
    assert client.get("/api/v1/student/dashboard", headers=stud_h).status_code == 200
    assert client.get("/api/v1/events", headers=stud_h).status_code == 200
    assert client.get("/api/v1/events", headers=fac_h).status_code == 200


def test_invalid_and_suspended_tokens(isolation_ctx):
    """Verify that unauthenticated, expired, malformed, and suspended tokens are rejected."""
    # 1. Missing Token -> 401
    assert client.get("/api/v1/authority/dashboard").status_code == 401
    assert client.get("/api/v1/student/dashboard").status_code == 401
    assert client.get("/api/v1/faculty/dashboard").status_code == 401

    # 2. Malformed Token -> 401
    assert client.get("/api/v1/student/dashboard", headers={"Authorization": "Bearer not-a-jwt"}).status_code == 401

    # 3. Expired Token -> 401
    expired_token = create_token(user_id=1, account_type="STUDENT", minutes=-10, kind="access")
    assert client.get("/api/v1/student/dashboard", headers={"Authorization": f"Bearer {expired_token}"}).status_code == 401

    # 4. Suspended User Login -> 403
    susp = isolation_ctx["susp"]
    res = client.post("/api/v1/auth/login", json={
        "email": susp["email"],
        "password": susp["password"]
    })
    assert res.status_code == 403
    assert "suspended" in res.json()["detail"].lower()

    # 5. Suspended User Active Token -> 403
    susp_token = create_token(user_id=susp["id"], account_type="STUDENT", minutes=60, kind="access")
    assert client.get("/api/v1/student/dashboard", headers={"Authorization": f"Bearer {susp_token}"}).status_code == 403


def test_dedicated_student_and_faculty_login_endpoints(isolation_ctx):
    """Test dedicated /api/v1/auth/student/login and /api/v1/auth/faculty/login endpoints."""
    auth = isolation_ctx["auth"]
    fac = isolation_ctx["fac"]
    stud = isolation_ctx["stud"]

    # Student portal endpoint: accepts Student, rejects Faculty and Authority
    r_stu_ok = client.post("/api/v1/auth/student/login", json={"email": stud["email"], "password": stud["password"]})
    assert r_stu_ok.status_code == 200
    assert r_stu_ok.json()["account_type"] == "STUDENT"

    r_stu_fac = client.post("/api/v1/auth/student/login", json={"email": fac["email"], "password": fac["password"]})
    assert r_stu_fac.status_code == 403
    assert "strictly for Students" in r_stu_fac.json()["detail"]

    r_stu_auth = client.post("/api/v1/auth/student/login", json={"email": auth["email"], "password": auth["password"]})
    assert r_stu_auth.status_code == 403

    # Faculty portal endpoint: accepts Faculty, rejects Student and Authority
    r_fac_ok = client.post("/api/v1/auth/faculty/login", json={"email": fac["email"], "password": fac["password"]})
    assert r_fac_ok.status_code == 200
    assert r_fac_ok.json()["account_type"] == "FACULTY"

    r_fac_stu = client.post("/api/v1/auth/faculty/login", json={"email": stud["email"], "password": stud["password"]})
    assert r_fac_stu.status_code == 403
    assert "strictly for Faculty" in r_fac_stu.json()["detail"]

    r_fac_auth = client.post("/api/v1/auth/faculty/login", json={"email": auth["email"], "password": auth["password"]})
    assert r_fac_auth.status_code == 403


def test_governance_and_shortlisting_workflow(isolation_ctx):
    """Verify:
    1. Faculty CANNOT shortlist teams or individuals (strictly delegated to Student Committee).
    2. President/VP/Shortlisting volunteers CAN shortlist.
    3. Shortlisted team fee payment by leader unlocks WhatsApp group.
    """
    from datetime import datetime, timezone, timedelta
    fac = isolation_ctx["fac"]
    stud = isolation_ctx["stud"]

    r_fac_l = client.post("/api/v1/auth/faculty/login", json={"email": fac["email"], "password": fac["password"]})
    h_fac = {"Authorization": f"Bearer {r_fac_l.json()['access_token']}"}

    r_stu_l = client.post("/api/v1/auth/student/login", json={"email": stud["email"], "password": stud["password"]})
    h_stu = {"Authorization": f"Bearer {r_stu_l.json()['access_token']}"}

    # 1. Faculty creates event with fee, whatsapp group, and same department restriction
    start = datetime.now(timezone.utc) - timedelta(hours=1)
    end = datetime.now(timezone.utc) + timedelta(days=2)
    r_ev = client.post("/api/v1/events", headers=h_fac, json={
        "name": "State Hackathon 2026",
        "description": "Annual state hackathon",
        "category": "Technical",
        "venue": "CSE Audi",
        "start_at": start.isoformat(),
        "end_at": end.isoformat(),
        "team_enabled": True,
        "min_team_size": 1,
        "max_team_size": 4,
        "volunteer_enabled": True,
        "registration_fee": 250.0,
        "whatsapp_group_url": "https://chat.whatsapp.com/TestGroup2026",
        "require_same_department": True,
        "idea_ppt_required": True,
        "initial_form_template": "hackathon_pitch"
    })
    assert r_ev.status_code == 200
    eid = r_ev.json()["id"]

    # Student registers team
    r_team = client.post(f"/api/v1/events/{eid}/teams", headers=h_stu, json={
        "team_name": "Hack Wizards",
        "pitch_deck_url": "https://storage.vvce.ac.in/decks/team-hack.pdf"
    })
    assert r_team.status_code == 200
    tid = r_team.json()["team_id"]

    # 2. Faculty tries to shortlist team -> 403 FORBIDDEN!
    r_fac_shortlist = client.post(f"/api/v1/events/{eid}/shortlist-team/{tid}", headers=h_fac)
    assert r_fac_shortlist.status_code == 403
    assert "delegated exclusively to the Student Leadership Committee" in r_fac_shortlist.json()["detail"]

    # 3. Faculty appoints student as President
    stu_me = client.get("/api/v1/auth/me", headers=h_stu).json()
    r_app = client.post(f"/api/v1/events/{eid}/leadership?student_user_id={stu_me['id']}&role=PRESIDENT", headers=h_fac)
    assert r_app.status_code == 200

    # 4. President shortlists the team -> 200 OK!
    r_stu_shortlist = client.post(f"/api/v1/events/{eid}/shortlist-team/{tid}", headers=h_stu)
    assert r_stu_shortlist.status_code == 200
    assert r_stu_shortlist.json()["status"] == "SHORTLISTED"

    # Check shortlisted teams view
    r_view = client.get(f"/api/v1/events/{eid}/shortlisted-teams", headers=h_fac)
    assert r_view.status_code == 200
    teams_list = r_view.json()
    assert len(teams_list) >= 1
    target = [t for t in teams_list if t["team_id"] == tid][0]
    assert target["payment_status"] == "PENDING_PAYMENT"
    assert target["group_joined"] is False

    # 5. Team leader pays registration fee
    r_pay = client.post(f"/api/v1/events/{eid}/teams/{tid}/pay", headers=h_stu, json={
        "transaction_reference": "UPI-REF-9988776655"
    })
    assert r_pay.status_code == 200
    assert r_pay.json()["payment_status"] == "PAID"
    assert r_pay.json()["whatsapp_group_url"] == "https://chat.whatsapp.com/TestGroup2026"

