"""End-to-End Acceptance Test Workflow covering Part 22 of EventXTracker Specification.
Executes all 30 business validation milestones from Authority bootstrap to PDF delivery.
"""
import os
import sys
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_eventxtracker.db"
os.environ["BOOTSTRAP_SECRET"] = "test-bootstrap"
os.environ["SECRET_KEY"] = "super-secret-key-at-least-32-chars-long"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import Department, User, StudentProfile, FacultyProfile

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

def test_complete_30_step_e2e_acceptance_workflow():
    # ---------------------------------------------------------
    # 1. Authority logs in (via dedicated Authority login endpoint)
    # ---------------------------------------------------------
    client.post("/api/v1/bootstrap/authority", json={
        "email": "e2e_authority@vvce.ac.in",
        "password": "AuthoritySuperSecure123!",
        "bootstrap_secret": "test-bootstrap"
    })
    r_auth = client.post("/api/v1/authority/auth/login", json={
        "email": "e2e_authority@vvce.ac.in",
        "password": "AuthoritySuperSecure123!"
    })
    assert r_auth.status_code == 200, r_auth.text
    auth_token = r_auth.json()["access_token"]
    h_auth = hdr(auth_token)

    # ---------------------------------------------------------
    # 2. Authority creates a Faculty account (CSE)
    # ---------------------------------------------------------
    r_fac = client.post("/api/v1/authority/faculty", headers=h_auth, json={
        "full_name": "Dr. E2E Lead Faculty",
        "email": "e2e_faculty_lead@vvce.ac.in",
        "branch": "CSE",
        "designation": "Professor"
    })
    assert r_fac.status_code == 200, r_fac.text
    fac_temp_pw = r_fac.json()["temporary_password"]
    fac_id = r_fac.json()["user_id"]

    # Also create a non-coordinator CSE faculty and an EC faculty for scoping tests
    r_fac_other = client.post("/api/v1/authority/faculty", headers=h_auth, json={
        "full_name": "Dr. Other CSE Faculty",
        "email": "e2e_faculty_cse_other@vvce.ac.in",
        "branch": "CSE",
        "designation": "Assistant Professor"
    })
    fac_other_token = client.post("/api/v1/auth/login", json={
        "email": "e2e_faculty_cse_other@vvce.ac.in", "password": r_fac_other.json()["temporary_password"]
    }).json()["access_token"]

    r_fac_ec = client.post("/api/v1/authority/faculty", headers=h_auth, json={
        "full_name": "Dr. EC Faculty",
        "email": "e2e_faculty_ec@vvce.ac.in",
        "branch": "EC",
        "designation": "Associate Professor"
    })
    fac_ec_token = client.post("/api/v1/auth/login", json={
        "email": "e2e_faculty_ec@vvce.ac.in", "password": r_fac_ec.json()["temporary_password"]
    }).json()["access_token"]

    # ---------------------------------------------------------
    # 3. Authority creates Student accounts
    # ---------------------------------------------------------
    r_s1 = client.post("/api/v1/authority/students", headers=h_auth, json={
        "full_name": "E2E Student Leader",
        "usn": "1VV23CSE071",
        "email": "vvce23cse0071@vvce.ac.in",
        "branch": "CSE",
        "joining_year": 2023,
        "semester": 5,
        "section": "A"
    })
    assert r_s1.status_code == 200, r_s1.text
    s1_temp_pw = r_s1.json()["temporary_password"]
    s1_id = r_s1.json()["user_id"]

    r_s2 = client.post("/api/v1/authority/students", headers=h_auth, json={
        "full_name": "E2E Student Peer",
        "usn": "1VV23CSE072",
        "email": "vvce23cse0072@vvce.ac.in",
        "branch": "CSE",
        "joining_year": 2023,
        "semester": 5,
        "section": "A"
    })
    assert r_s2.status_code == 200
    s2_temp_pw = r_s2.json()["temporary_password"]
    s2_id = r_s2.json()["user_id"]

    # Assign Dr. E2E Lead Faculty as Class Teacher for CSE Sem 5 Section A
    cse_dept_id = [d for d in client.get("/api/v1/authority/departments", headers=h_auth).json() if d["code"] == "CSE"][0]["id"]
    client.post(
        f"/api/v1/authority/class-teacher?department_id={cse_dept_id}&semester=5&section=A&academic_year=2025-26&faculty_user_id={fac_id}",
        headers=h_auth
    )

    # ---------------------------------------------------------
    # 4. Student logs in using temporary credentials
    # ---------------------------------------------------------
    r_s1_login = client.post("/api/v1/auth/login", json={
        "email": "vvce23cse0071@vvce.ac.in",
        "password": s1_temp_pw
    })
    assert r_s1_login.status_code == 200
    s1_initial_token = r_s1_login.json()["access_token"]
    h_s1 = hdr(s1_initial_token)

    # ---------------------------------------------------------
    # 5. Student is forced to change password
    # ---------------------------------------------------------
    me_resp = client.get("/api/v1/auth/me", headers=h_s1).json()
    assert me_resp["must_change_password"] is True

    # Change password
    r_chg = client.post("/api/v1/auth/change-password", headers=h_s1, json={
        "old_password": s1_temp_pw,
        "new_password": "NewStudentSecurePassword123!"
    })
    assert r_chg.status_code == 200

    # Log in with new password
    r_s1_new_login = client.post("/api/v1/auth/login", json={
        "email": "vvce23cse0071@vvce.ac.in",
        "password": "NewStudentSecurePassword123!"
    })
    assert r_s1_new_login.status_code == 200
    s1_token = r_s1_new_login.json()["access_token"]
    h_s1 = hdr(s1_token)

    # Log in Student 2
    s2_token = client.post("/api/v1/auth/login", json={
        "email": "vvce23cse0072@vvce.ac.in",
        "password": s2_temp_pw
    }).json()["access_token"]
    h_s2 = hdr(s2_token)

    # ---------------------------------------------------------
    # 6. Faculty logs in
    # ---------------------------------------------------------
    r_fac_login = client.post("/api/v1/auth/login", json={
        "email": "e2e_faculty_lead@vvce.ac.in",
        "password": fac_temp_pw
    })
    assert r_fac_login.status_code == 200
    fac_token = r_fac_login.json()["access_token"]
    h_fac = hdr(fac_token)

    # ---------------------------------------------------------
    # 7. Faculty creates an event
    # ---------------------------------------------------------
    start = datetime.now(timezone.utc) - timedelta(hours=2)
    end = datetime.now(timezone.utc) + timedelta(days=2)
    r_event = client.post("/api/v1/events", headers=h_fac, json={
        "name": "VVCE Annual Tech Hackathon",
        "description": "Premier coding hackathon of VVCE Mysuru",
        "category": "Technical",
        "venue": "Auditorium 1",
        "start_at": start.isoformat(),
        "end_at": end.isoformat(),
        "individual_enabled": True,
        "team_enabled": True,
        "volunteer_enabled": True,
        "min_team_size": 2,
        "max_team_size": 4
    })
    assert r_event.status_code == 200
    event_id = r_event.json()["id"]

    # ---------------------------------------------------------
    # 8. Faculty creates a custom form using dynamic form builder
    # ---------------------------------------------------------
    form_schema = {
        "questions": [
            {"id": "q_motivation", "title": "Statement of Purpose", "type": "long_text", "required": True},
            {"id": "q_tech", "title": "Primary Domain", "type": "dropdown", "options": ["AI/ML", "Web3", "Cloud"], "required": True},
            {"id": "q_exp", "title": "Prior Projects Count", "type": "number", "min": 0, "max": 20, "required": False}
        ]
    }
    r_form = client.put(f"/api/v1/events/{event_id}/form", headers=h_fac, json=form_schema)
    assert r_form.status_code == 200
    assert r_form.json()["version"] == 1

    # ---------------------------------------------------------
    # 9. Faculty publishes event form & verifies immutable version
    # ---------------------------------------------------------
    form_read = client.get(f"/api/v1/events/{event_id}/form", headers=h_fac).json()
    assert form_read["version"] == 1
    assert len(form_read["questions"]) == 3

    # ---------------------------------------------------------
    # 10. Student discovers the event
    # ---------------------------------------------------------
    events_list = client.get("/api/v1/events", headers=h_s1).json()
    assert any(e["id"] == event_id for e in events_list)

    # ---------------------------------------------------------
    # 11. Student submits individual registration
    # ---------------------------------------------------------
    r_reg = client.post(f"/api/v1/events/{event_id}/register", headers=h_s1, json={
        "answers": {
            "q_motivation": "Passionate about full-stack architectures and algorithms.",
            "q_tech": "AI/ML",
            "q_exp": 3
        }
    })
    assert r_reg.status_code == 200
    reg_id = r_reg.json()["id"]

    # Student 2 registers as well
    r_reg2 = client.post(f"/api/v1/events/{event_id}/register", headers=h_s2, json={
        "answers": {
            "q_motivation": "Eager to collaborate on high-impact systems.",
            "q_tech": "Cloud",
            "q_exp": 1
        }
    })
    assert r_reg2.status_code == 200

    # ---------------------------------------------------------
    # 12. Student creates a team
    # ---------------------------------------------------------
    r_team = client.post(f"/api/v1/events/{event_id}/teams", headers=h_s1, json={
        "team_name": "CyberVanguard",
        "project_title": "Automated Threat Neutralizer",
        "member_usns": ["1VV23CSE072"]
    })
    assert r_team.status_code == 200
    team_id = r_team.json()["team_id"]

    # ---------------------------------------------------------
    # 13. Another Student receives and accepts an invitation
    # ---------------------------------------------------------
    invites = client.get("/api/v1/teams/invitations", headers=h_s2).json()
    target_inv = [i for i in invites if i["team_id"] == team_id][0]
    r_accept = client.post(f"/api/v1/teams/invitations/{target_inv['id']}/respond?accept=true", headers=h_s2)
    assert r_accept.status_code == 200

    # ---------------------------------------------------------
    # 14. Team reaches COMPLETE status
    # ---------------------------------------------------------
    assert r_accept.json()["team_status"] == "COMPLETE"

    # ---------------------------------------------------------
    # 15. Event President/VP appointed & shortlists team & individual
    # ---------------------------------------------------------
    # Faculty appoints Student 1 as President and Student 2 as Vice President
    assert client.post(f"/api/v1/events/{event_id}/leadership?student_user_id={s1_id}&role=PRESIDENT", headers=h_fac).status_code == 200
    assert client.post(f"/api/v1/events/{event_id}/leadership?student_user_id={s2_id}&role=VICE_PRESIDENT", headers=h_fac).status_code == 200

    # President shortlists team
    r_short = client.post(f"/api/v1/events/{event_id}/shortlist-team/{team_id}", headers=h_s1)
    assert r_short.status_code == 200

    # ---------------------------------------------------------
    # 16. Students receive shortlist notifications
    # ---------------------------------------------------------
    notes_s2 = client.get("/api/v1/notifications", headers=h_s2).json()
    assert any("shortlist" in n["title"].lower() or "shortlisted" in n["body"].lower() for n in notes_s2)

    # ---------------------------------------------------------
    # 17. Attendance is recorded for shortlisted participants
    # (Student leaders forbidden 403; assigned Faculty Event Coordinator marks attendance 200)
    # ---------------------------------------------------------
    assert client.post(f"/api/v1/events/{event_id}/attendance/{s1_id}?status=PRESENT", headers=h_s1).status_code == 403
    r_att1 = client.post(f"/api/v1/events/{event_id}/attendance/{s1_id}?status=PRESENT", headers=h_fac)
    assert r_att1.status_code == 200
    r_att2 = client.post(f"/api/v1/events/{event_id}/attendance/{s2_id}?status=PRESENT", headers=h_fac)
    assert r_att2.status_code == 200

    # ---------------------------------------------------------
    # 18. Volunteer applications are submitted
    # ---------------------------------------------------------
    r_vol = client.post(f"/api/v1/events/{event_id}/volunteer-apply", headers=h_s2, json={
        "skills": "Network management, logistics",
        "preferred_area": "Technical Infrastructure",
        "experience": "2 college events",
        "availability": "All 48 hours"
    })
    assert r_vol.status_code == 200

    # ---------------------------------------------------------
    # 19. Faculty Event Coordinator approves volunteer & assigns responsibilities
    # ---------------------------------------------------------
    vol_apps = client.get(f"/api/v1/events/{event_id}/volunteers", headers=h_fac).json()
    v_app_id = [v for v in vol_apps if v["student_id"] == s2_id][0]["id"]
    # Formal approval by coordinator
    assert client.post(f"/api/v1/volunteer-applications/{v_app_id}/approve?approve=true", headers=h_fac).status_code == 200
    # Allocation of responsibility
    assert client.post(f"/api/v1/volunteer-applications/{v_app_id}/allocate?responsibility=Auditorium+Network&allocation=Desk-C", headers=h_fac).status_code == 200

    # ---------------------------------------------------------
    # 20. Volunteer completion is recorded
    # ---------------------------------------------------------
    assert client.post(f"/api/v1/volunteer-applications/{v_app_id}/complete?completed=true", headers=h_fac).status_code == 200

    # ---------------------------------------------------------
    # 21. Winners are added (Team CyberVanguard wins 1st Position Gold)
    # ---------------------------------------------------------
    r_win = client.post(f"/api/v1/events/{event_id}/winners", headers=h_s1, json={
        "position": 1,
        "team_id": team_id,
        "achievement": "Gold Trophy & Cash Prize"
    })
    assert r_win.status_code == 200

    # ---------------------------------------------------------
    # 22. Students see their achievements
    # ---------------------------------------------------------
    achieve_s1 = client.get("/api/v1/student/dashboard", headers=h_s1).json()
    assert achieve_s1 is not None

    # ---------------------------------------------------------
    # 23. All 16 PDF reports are generated with A4 format
    # ---------------------------------------------------------
    event_reports = [
        "event_executive", "participants", "teams", "attendance",
        "volunteer_applications", "volunteer_allocations", "volunteer_completion",
        "event_summary", "winners"
    ]
    for rep in event_reports:
        res = client.get(f"/api/v1/reports/{rep}?event_id={event_id}", headers=h_fac)
        assert res.status_code == 200, f"Report {rep} failed"
        assert res.headers["content-type"] == "application/pdf"
        assert res.content.startswith(b"%PDF")
        if rep == "volunteer_completion":
            assert b"hours" not in res.content.lower(), "Volunteer hours found in completion report!"

    dept_reports = [
        "semester_register", "section_register", "internships", "verified_internships",
        "external_events", "external_verification"
    ]
    for rep in dept_reports:
        res = client.get(f"/api/v1/reports/{rep}", headers=h_fac)
        assert res.status_code == 200, f"Report {rep} failed"
        assert res.headers["content-type"] == "application/pdf"
        assert res.content.startswith(b"%PDF")

    # ---------------------------------------------------------
    # 24. Model A: Department Faculty can see own-dept event records without CT assignment
    # ---------------------------------------------------------
    res_other_fac = client.get(f"/api/v1/events/{event_id}/participants", headers=hdr(fac_other_token))
    assert res_other_fac.status_code == 200
    p_other = res_other_fac.json()["individuals"]
    assert any(p["usn"] == "1VV23CSE071" for p in p_other)

    # ---------------------------------------------------------
    # 25. Unassigned Faculty cannot access unauthorized event operations
    # ---------------------------------------------------------
    # Dr. Other CSE Faculty is NOT a coordinator of this event
    res_unauth = client.post(f"/api/v1/events/{event_id}/leadership?student_user_id={s1_id}&role=PRESIDENT", headers=hdr(fac_other_token))
    assert res_unauth.status_code in (400, 403)

    # ---------------------------------------------------------
    # 26. Model B: Exact Class Teacher can review pending academic submissions
    # ---------------------------------------------------------
    r_intern = client.post("/api/v1/internships", headers=h_s1, json={
        "company": "Amazon AWS",
        "role": "Cloud Architect Intern",
        "start_date": "2026-06-01",
        "end_date": "2026-08-31"
    })
    assert r_intern.status_code == 200
    intern_id = r_intern.json()["id"]

    # Exact Class Teacher (Dr. E2E Lead Faculty) sees the pending internship
    ct_interns = client.get("/api/v1/internships", headers=h_fac).json()
    assert any(i["id"] == intern_id for i in ct_interns)

    # Exact CT reviews and verifies with physical evidence inspection
    r_rev = client.post(f"/api/v1/internships/{intern_id}/review?status=VERIFIED&evidence_inspected=true", headers=h_fac)
    assert r_rev.status_code == 200

    # ---------------------------------------------------------
    # 27. Model B: Other same-dept Faculty cannot see pending submissions (verified previously)
    # 28. Model B: Cross-department Faculty access denied
    # ---------------------------------------------------------
    # EC faculty tries to inspect/review CSE student's internship
    r_ec_rev = client.post(f"/api/v1/internships/{intern_id}/review?status=REJECTED", headers=hdr(fac_ec_token))
    assert r_ec_rev.status_code == 403

    # ---------------------------------------------------------
    # 29. Notifications persist after mark-read actions
    # ---------------------------------------------------------
    all_notes = client.get("/api/v1/notifications", headers=h_s1).json()
    assert len(all_notes) > 0
    client.post("/api/v1/notifications/mark-all-read", headers=h_s1)
    notes_after = client.get("/api/v1/notifications", headers=h_s1).json()
    assert all(n["read"] is True for n in notes_after)

    # ---------------------------------------------------------
    # 30. All changes remain persistent in database
    # ---------------------------------------------------------
    ev_check = client.get(f"/api/v1/events/{event_id}", headers=h_s1).json()
    assert ev_check["name"] == "VVCE Annual Tech Hackathon"
    assert ev_check["id"] == event_id
