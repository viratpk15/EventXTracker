"""Core workflow and authorization tests against a real SQLite file DB."""
import os
import sys
import secrets
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_eventxtracker.db"
os.environ["BOOTSTRAP_SECRET"] = "test-bootstrap"
if os.path.exists("./test_eventxtracker.db"):
    os.remove("./test_eventxtracker.db")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402
from app.db import Base, engine, SessionLocal  # noqa: E402
from app.models import Department  # noqa: E402

Base.metadata.create_all(bind=engine)
db = SessionLocal()
for code in ["CSE", "ISE", "AIML", "EC", "EEE", "ME", "CV"]:
    if not db.query(Department).filter_by(code=code).first():
        db.add(Department(code=code, name=code))
db.commit()
db.close()

client = TestClient(app)


def login(email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def authority_login(email, password):
    r = client.post("/api/v1/authority/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def hdr(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def authority_token():
    r = client.post("/api/v1/bootstrap/authority",
                    json={"email": "authority@vvce.ac.in", "password": "authority-secret-123",
                          "bootstrap_secret": "test-bootstrap"})
    assert r.status_code == 200
    # Verify ordinary /api/v1/auth/login rejects Authority accounts
    rejected = client.post("/api/v1/auth/login", json={"email": "authority@vvce.ac.in", "password": "authority-secret-123"})
    assert rejected.status_code == 403
    return authority_login("authority@vvce.ac.in", "authority-secret-123")



@pytest.fixture(scope="session")
def provisioned(authority_token):
    a = hdr(authority_token)
    r = client.post("/api/v1/authority/faculty", headers=a, json={
        "full_name": "Faculty One", "email": "facx@vvce.ac.in", "branch": "CSE", "designation": "AP"})
    assert r.status_code == 200
    fac_pw = r.json()["temporary_password"]
    r = client.post("/api/v1/authority/students", headers=a, json={
        "full_name": "Student One", "usn": "1VV23CSE001", "email": "vvce23cse0001@vvce.ac.in",
        "branch": "CSE", "joining_year": 2023, "semester": 5, "section": "A"})
    assert r.status_code == 200, r.text
    stu_pw = r.json()["temporary_password"]
    r = client.post("/api/v1/authority/students", headers=a, json={
        "full_name": "Student Two", "usn": "1VV23CSE002", "email": "vvce23cse0002@vvce.ac.in",
        "branch": "CSE", "joining_year": 2023, "semester": 5, "section": "A"})
    stu2_pw = r.json()["temporary_password"]
    # class teacher assignment for CSE sem5 A
    fac_id = client.get("/api/v1/authority/accounts", headers=a).json()
    fac_user_id = [u for u in fac_id if u["email"] == "facx@vvce.ac.in"][0]["id"]
    dept_id = db_dept_id("CSE")
    r = client.post(f"/api/v1/authority/class-teacher?department_id={dept_id}&semester=5&section=A&academic_year=2025-26&faculty_user_id={fac_user_id}", headers=a)
    assert r.status_code == 200
    return {"fac_token": login("facx@vvce.ac.in", fac_pw),
            "stu_token": login("vvce23cse0001@vvce.ac.in", stu_pw),
            "stu2_token": login("vvce23cse0002@vvce.ac.in", stu2_pw),
            "auth_token": authority_token}


def db_dept_id(code):
    d = SessionLocal()
    i = d.query(Department).filter_by(code=code).first().id
    d.close()
    return i


def test_no_public_signup():
    assert client.post("/api/v1/auth/signup", json={}).status_code == 404
    assert client.post("/api/v1/authority/signup", json={}).status_code == 404


def test_first_login_password_change(provisioned):
    t = provisioned["stu_token"]
    me = client.get("/api/v1/auth/me", headers=hdr(t)).json()
    assert me["must_change_password"] is True
    r = client.post("/api/v1/auth/change-password", headers=hdr(t),
                    json={"old_password": "x", "new_password": "newpassword1"})
    # old password was the temp one, so this should fail
    assert r.status_code == 400


@pytest.fixture(scope="session")
def event_id(provisioned):
    fac, stu, stu2 = hdr(provisioned["fac_token"]), hdr(provisioned["stu_token"]), hdr(provisioned["stu2_token"])
    start = datetime.now(timezone.utc) - timedelta(hours=1)
    end = datetime.now(timezone.utc) + timedelta(days=2)
    r = client.post("/api/v1/events", headers=fac, json={
        "name": "Hackathon", "start_at": start.isoformat(), "end_at": end.isoformat(),
        "team_enabled": True, "volunteer_enabled": True})
    assert r.status_code == 200
    eid = r.json()["id"]
    # dynamic form
    r = client.put(f"/api/v1/events/{eid}/form", headers=fac, json={"questions": [
        {"id": "q1", "type": "long_text", "title": "Why do you want to participate?", "required": True}]})
    assert r.json()["version"] == 1
    # student registers
    r = client.post(f"/api/v1/events/{eid}/register", headers=stu,
                    json={"answers": {"q1": "Because I love building things."}})
    assert r.status_code == 200
    reg_id = client.get(f"/api/v1/events/{eid}/my-status", headers=stu).json()["registration"]
    # duplicate registration blocked
    r = client.post(f"/api/v1/events/{eid}/register", headers=stu, json={"answers": {"q1": "again"}})
    assert r.status_code == 400
    # team flow
    r = client.post(f"/api/v1/events/{eid}/teams", headers=stu2, json={
        "team_name": "Team Alpha", "member_usns": ["1VV23CSE001"]})
    assert r.status_code == 200
    team_id = r.json()["team_id"]
    invs = client.get("/api/v1/teams/invitations", headers=stu).json()
    inv_id = [i for i in invs if i["team_id"] == team_id][0]["id"]
    r = client.post(f"/api/v1/teams/invitations/{inv_id}/respond?accept=true", headers=stu)
    assert r.json()["team_status"] == "COMPLETE"
    # faculty appoints leadership
    stu_id = client.get("/api/v1/auth/me", headers=stu).json()["id"]
    stu2_id = client.get("/api/v1/auth/me", headers=stu2).json()["id"]
    assert client.post(f"/api/v1/events/{eid}/leadership?student_user_id={stu_id}&role=PRESIDENT", headers=fac).status_code == 200
    assert client.post(f"/api/v1/events/{eid}/leadership?student_user_id={stu2_id}&role=VICE_PRESIDENT", headers=fac).status_code == 200
    # shortlist
    regs = client.get(f"/api/v1/reports/participants?event_id={eid}", headers=fac)  # 200 = authorized
    assert regs.status_code == 200
    # president shortlists team
    r = client.post(f"/api/v1/events/{eid}/shortlist-team/{team_id}", headers=stu)
    assert r.status_code == 200
    # attendance: student leaders forbidden (403), only faculty coordinator allowed (200)
    assert client.post(f"/api/v1/events/{eid}/attendance/{stu2_id}?status=PRESENT", headers=stu).status_code == 403
    r = client.post(f"/api/v1/events/{eid}/attendance/{stu2_id}?status=PRESENT", headers=fac)
    assert r.status_code == 200
    # winners
    r = client.post(f"/api/v1/events/{eid}/winners", headers=stu, json={
        "position": 1, "team_id": team_id, "achievement": "Gold"})
    assert r.status_code == 200
    # notifications persisted
    notes = client.get("/api/v1/notifications", headers=stu).json()
    assert any("invitation" in n["title"].lower() or "shortlist" in n["title"].lower() for n in notes)
    return eid


def test_event_flow(event_id):
    assert event_id > 0


def test_model_b_visibility(provisioned, event_id):
    fac, stu = hdr(provisioned["fac_token"]), hdr(provisioned["stu_token"])
    r = client.post("/api/v1/internships", headers=stu, json={"company": "Acme Corp", "role": "SDE Intern"})
    assert r.status_code == 200
    # assigned class teacher sees pending
    internships = client.get("/api/v1/internships", headers=fac).json()
    assert len(internships) == 1
    rec_id = internships[0]["id"]
    # review by class teacher
    r = client.post(f"/api/v1/internships/{rec_id}/review?status=VERIFIED&evidence_inspected=true", headers=fac)
    assert r.status_code == 200
    # PDF report respects model B
    r = client.get("/api/v1/reports/verified_internships", headers=fac)
    assert r.status_code == 200 and r.headers["content-type"] == "application/pdf"


def test_pdf_reports_generate(provisioned, event_id):
    fac = hdr(provisioned["fac_token"])
    for rt in ["event_executive", "participants", "teams", "attendance", "volunteer_applications",
               "volunteer_allocations", "volunteer_completion", "event_summary", "winners"]:
        r = client.get(f"/api/v1/reports/{rt}?event_id={event_id}", headers=fac)
        assert r.status_code == 200 and r.content.startswith(b"%PDF"), rt
    for rt in ["semester_register", "section_register", "internships", "verified_internships",
               "external_events", "external_verification"]:
        r = client.get(f"/api/v1/reports/{rt}", headers=fac)
        assert r.status_code == 200 and r.content.startswith(b"%PDF"), rt


def test_authorization_denials(provisioned):
    stu = hdr(provisioned["stu_token"])
    # student cannot access authority endpoints
    assert client.get("/api/v1/authority/dashboard", headers=stu).status_code == 403
    # student cannot create events
    assert client.post("/api/v1/events", headers=stu, json={"name": "x"}).status_code in (400, 403, 422)


def test_volunteer_shortlisting_and_winners_governance(provisioned, event_id):
    fac = hdr(provisioned["fac_token"])
    stu2 = hdr(provisioned["stu2_token"])
    s2_id = client.get("/api/v1/auth/me", headers=stu2).json()["id"]

    # 1. Attempting to appoint student 2 as SHORTLISTER_VOLUNTEER before applying as volunteer MUST fail
    r_sl_fail = client.post(f"/api/v1/events/{event_id}/leadership?student_user_id={s2_id}&role=SHORTLISTER_VOLUNTEER", headers=fac)
    assert r_sl_fail.status_code == 400
    assert "volunteer" in r_sl_fail.json()["detail"].lower()

    # 2. Student 2 applies as volunteer
    r_vol = client.post(f"/api/v1/events/{event_id}/volunteer-apply", json={"skills": "Stage Lead"}, headers=stu2)
    assert r_vol.status_code == 200

    # 3. Now appointing student 2 as SHORTLISTER_VOLUNTEER MUST succeed
    r_sl_ok = client.post(f"/api/v1/events/{event_id}/leadership?student_user_id={s2_id}&role=SHORTLISTER_VOLUNTEER", headers=fac)
    assert r_sl_ok.status_code == 200

    # 4. Shortlisting volunteer / President can view submissions
    r_subs = client.get(f"/api/v1/events/{event_id}/submissions", headers=stu2)
    assert r_subs.status_code == 200

    # 5. Add winner and verify deletion
    r_win = client.post(
        f"/api/v1/events/{event_id}/winners",
        json={"position": 1, "student_user_id": s2_id, "achievement": "Champion"},
        headers=fac
    )
    assert r_win.status_code == 200
    win_id = r_win.json()["id"]

    r_list = client.get(f"/api/v1/events/{event_id}/winners", headers=fac)
    assert r_list.status_code == 200
    w_match = [w for w in r_list.json() if w["id"] == win_id][0]
    assert w_match["student"] is not None
    assert w_match["student"]["name"] != "-"

    # 6. Delete winner
    r_del = client.delete(f"/api/v1/events/{event_id}/winners/{win_id}", headers=fac)
    assert r_del.status_code == 200


def test_leadership_and_volunteer_reapply_governance(provisioned, event_id):
    fac, stu = hdr(provisioned["fac_token"]), hdr(provisioned["stu_token"])
    stu_id = client.get("/api/v1/auth/me", headers=stu).json()["id"]

    # 1. Create a fresh event with poster_url
    ev_payload = {
        "name": "HackVision Poster Event",
        "description": "Poster showcase event",
        "category": "Technical",
        "start_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        "end_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "poster_url": "https://example.com/poster.jpg",
        "individual_enabled": True,
        "team_enabled": True,
        "volunteer_enabled": True,
    }
    r_ev = client.post("/api/v1/events", json=ev_payload, headers=fac)
    assert r_ev.status_code == 200
    eid = r_ev.json()["id"]

    # Verify poster_url persisted in get_event and list_events
    r_get = client.get(f"/api/v1/events/{eid}", headers=fac)
    assert r_get.status_code == 200
    assert r_get.json()["poster_url"] == "https://example.com/poster.jpg"

    r_list = client.get("/api/v1/events", headers=fac)
    assert r_list.status_code == 200
    ev_match = [e for e in r_list.json() if e["id"] == eid][0]
    assert ev_match["poster_url"] == "https://example.com/poster.jpg"

    # Appoint student 1 as President for eid
    assert client.post(f"/api/v1/events/{eid}/leadership?student_user_id={stu_id}&role=PRESIDENT", headers=fac).status_code == 200

    # President MUST be strictly forbidden from registering individually or creating teams
    r_reg_fail = client.post(f"/api/v1/events/{eid}/register", json={"answers": {}}, headers=stu)
    assert r_reg_fail.status_code == 400
    assert "leadership" in r_reg_fail.json()["detail"].lower() or "leader" in r_reg_fail.json()["detail"].lower()

    r_team_fail = client.post(f"/api/v1/events/{eid}/teams", json={"team_name": "PresTeam", "member_usns": []}, headers=stu)
    assert r_team_fail.status_code == 400
    assert "leadership" in r_team_fail.json()["detail"].lower() or "leader" in r_team_fail.json()["detail"].lower()

    # 2. Create a fresh student for volunteer rejection & re-application flow
    auth_hdr = hdr(provisioned["auth_token"])
    rand_num = secrets.randbelow(8999) + 1000
    new_stu_email = f"vvce23cse{rand_num}@vvce.ac.in"
    new_usn = f"1VV23CS{rand_num}"
    r_prov = client.post("/api/v1/authority/students", json={
        "email": new_stu_email, "full_name": "Test Volunteer Student", "usn": new_usn, "branch": "CSE",
        "joining_year": 2023, "semester": 5, "section": "A"
    }, headers=auth_hdr)
    assert r_prov.status_code == 200
    temp_pw = r_prov.json()["temporary_password"]
    r_login = client.post("/api/v1/auth/login", json={"email": new_stu_email, "password": temp_pw})
    assert r_login.status_code == 200
    new_stu_hdr = hdr(r_login.json()["access_token"])

    # Fresh student applies as volunteer
    r_vol = client.post(f"/api/v1/events/{eid}/volunteer-apply", json={"skills": "Logistics"}, headers=new_stu_hdr)
    assert r_vol.status_code == 200

    # Applying volunteer a second time MUST fail
    r_vol_again = client.post(f"/api/v1/events/{eid}/volunteer-apply", json={"skills": "Logistics"}, headers=new_stu_hdr)
    assert r_vol_again.status_code == 400
    assert "already submitted" in r_vol_again.json()["detail"].lower()

    # While volunteer application is pending, participant registration MUST fail
    r_reg_pending = client.post(f"/api/v1/events/{eid}/register", json={"answers": {}}, headers=new_stu_hdr)
    assert r_reg_pending.status_code == 400
    assert "volunteer application is currently pending" in r_reg_pending.json()["detail"].lower()

    # Faculty coordinator rejects volunteer application
    vol_apps = client.get(f"/api/v1/events/{eid}/volunteers", headers=fac).json()
    vol_app_id = [v for v in vol_apps if v["usn"] == new_usn][0]["id"]
    r_rej = client.post(f"/api/v1/volunteer-applications/{vol_app_id}/approve?approve=false", headers=fac)
    assert r_rej.status_code == 200

    # After volunteer application is REJECTED, student CAN register for participation if deadline allows!
    r_reg_ok = client.post(f"/api/v1/events/{eid}/register", json={"answers": {}}, headers=new_stu_hdr)
    assert r_reg_ok.status_code == 200
    assert "registration_id" in r_reg_ok.json()

    # Re-registering after participation registered MUST fail
    r_reg_twice = client.post(f"/api/v1/events/{eid}/register", json={"answers": {}}, headers=new_stu_hdr)
    assert r_reg_twice.status_code == 400

    # Inviting President stu (1VV23CSE001) as team member MUST fail
    stu2 = hdr(provisioned["stu2_token"])
    r_inv_pres = client.post(f"/api/v1/events/{eid}/teams", json={
        "team_name": "InvitePresTeam", "member_usns": ["1VV23CSE001"]
    }, headers=stu2)
    assert r_inv_pres.status_code == 400
    assert "appointed student leader" in r_inv_pres.json()["detail"].lower() or "leader" in r_inv_pres.json()["detail"].lower()

    # Appoint another volunteer student as VICE_PRESIDENT
    rand2 = secrets.randbelow(8999) + 1000
    vol_vp_email = f"vvce23ise{rand2}@vvce.ac.in"
    vol_vp_usn = f"1VV23IS{rand2}"
    r_vp = client.post("/api/v1/authority/students", json={
        "email": vol_vp_email, "full_name": "Volunteer Then VP", "usn": vol_vp_usn, "branch": "ISE",
        "joining_year": 2023, "semester": 5, "section": "A"
    }, headers=auth_hdr)
    assert r_vp.status_code == 200
    vp_pw = r_vp.json()["temporary_password"]
    r_vp_login = client.post("/api/v1/auth/login", json={"email": vol_vp_email, "password": vp_pw})
    assert r_vp_login.status_code == 200
    vp_hdr = hdr(r_vp_login.json()["access_token"])
    vp_user_id = r_vp.json()["user_id"]

    # Student first volunteers
    r_vol_vp = client.post(f"/api/v1/events/{eid}/volunteer-apply", json={"skills": "Stage"}, headers=vp_hdr)
    assert r_vol_vp.status_code == 200

    # Faculty appoints this volunteer as VICE_PRESIDENT
    r_app_vp = client.post(f"/api/v1/events/{eid}/leadership?student_user_id={vp_user_id}&role=VICE_PRESIDENT", headers=fac)
    assert r_app_vp.status_code == 200

    # Once appointed VP, they CANNOT create a team and dispatch invitations
    r_vp_team = client.post(f"/api/v1/events/{eid}/teams", json={
        "team_name": "VPDispatchedTeam", "member_usns": []
    }, headers=vp_hdr)
    assert r_vp_team.status_code == 400
    assert "leadership" in r_vp_team.json()["detail"].lower() or "leader" in r_vp_team.json()["detail"].lower()

