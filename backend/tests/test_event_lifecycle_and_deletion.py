"""Tests for Event Deletion, Dynamic Form Editing Post-Creation, and Ended Event Lifecycle Permissions."""
import os
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_eventxtracker.db"
os.environ["BOOTSTRAP_SECRET"] = "test-bootstrap"
os.environ["SECRET_KEY"] = "super-secret-key-at-least-32-chars-long"

from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import User, AccountType, Event, EventStatus

Base.metadata.create_all(bind=engine)
client = TestClient(app)


@pytest.fixture(scope="module")
def lifecycle_context():
    ts = uuid.uuid4().hex[:6]
    db = SessionLocal()
    existing = db.query(User).filter_by(email="lifecycle_admin@vvce.ac.in").first()
    if not existing:
        auth_users = db.query(User).filter_by(account_type=AccountType.AUTHORITY).all()
        if len(auth_users) >= 3:
            db.delete(auth_users[-1])
            db.commit()
    db.close()

    client.post("/api/v1/bootstrap/authority", json={
        "email": "lifecycle_admin@vvce.ac.in",
        "password": "AuthoritySuperSecure123!",
        "bootstrap_secret": "test-bootstrap"
    })
    r_auth = client.post("/api/v1/authority/auth/login", json={
        "email": "lifecycle_admin@vvce.ac.in",
        "password": "AuthoritySuperSecure123!"
    })
    auth_token = r_auth.json()["access_token"]
    headers_auth = {"Authorization": f"Bearer {auth_token}"}

    # Faculty 1 (Creator)
    fac_email = f"fac_life_{ts}@vvce.ac.in"
    r_fac = client.post("/api/v1/authority/faculty", headers=headers_auth, json={
        "full_name": "Dr. Lifecycle",
        "email": fac_email,
        "branch": "CSE",
        "designation": "Professor"
    })
    fac_pwd = r_fac.json()["temporary_password"]
    r_fac_login = client.post("/api/v1/auth/login", json={"email": fac_email, "password": fac_pwd})
    headers_fac = {"Authorization": f"Bearer {r_fac_login.json()['access_token']}"}

    # Student 1
    s1_email = f"vvce23cse_life_{ts}1@vvce.ac.in"
    s1_usn = f"4VV23LC{ts[:3].upper()}1"
    r_s1 = client.post("/api/v1/authority/students", headers=headers_auth, json={
        "full_name": "Student Life One",
        "email": s1_email,
        "usn": s1_usn,
        "branch": "CSE",
        "semester": 6,
        "section": "A",
        "joining_year": 2023
    })
    s1_pwd = r_s1.json()["temporary_password"]
    r_s1_login = client.post("/api/v1/auth/login", json={"email": s1_email, "password": s1_pwd})
    headers_s1 = {"Authorization": f"Bearer {r_s1_login.json()['access_token']}"}
    s1_id = r_s1_login.json()["user_id"]

    return {
        "headers_fac": headers_fac,
        "headers_s1": headers_s1,
        "s1_id": s1_id,
        "s1_usn": s1_usn,
    }


def test_form_editing_post_creation_and_draft_saving(lifecycle_context):
    headers_fac = lifecycle_context["headers_fac"]

    # 1. Create an event
    now = datetime.now(timezone.utc)
    ev_payload = {
        "name": "Hack Innovation 2026",
        "description": "Annual flagship hackathon",
        "start_at": (now + timedelta(days=2)).isoformat(),
        "end_at": (now + timedelta(days=3)).isoformat(),
        "individual_enabled": True,
        "team_enabled": True,
        "volunteer_enabled": True,
        "min_team_size": 2,
        "max_team_size": 4,
    }
    r = client.post("/api/v1/events", headers=headers_fac, json=ev_payload)
    assert r.status_code == 200, r.text
    event_id = r.json()["id"]

    # 2. Save Draft via POST and PUT
    draft_questions = [
        {"id": "q1", "type": "short_text", "title": "GitHub Username", "required": True},
        {"id": "q2", "type": "dropdown", "title": "Experience Level", "required": True, "options": ["Beginner", "Intermediate", "Advanced"]},
    ]
    r_draft = client.post(f"/api/v1/events/{event_id}/form/draft", headers=headers_fac, json={
        "title": "Custom Draft Form",
        "description": "Draft instructions",
        "questions": draft_questions,
    })
    assert r_draft.status_code == 200
    assert r_draft.json()["draft_saved"] is True

    # 3. Fetch form - faculty should see draft questions
    r_get = client.get(f"/api/v1/events/{event_id}/form", headers=headers_fac)
    assert r_get.status_code == 200
    assert len(r_get.json()["questions"]) == 2
    assert r_get.json()["questions"][0]["title"] == "GitHub Username"

    # 4. Publish via POST
    published_questions = draft_questions + [
        {"id": "q3", "type": "long_text", "title": "Past Project Links", "required": False}
    ]
    r_pub = client.post(f"/api/v1/events/{event_id}/form", headers=headers_fac, json={
        "title": "Published Form v1",
        "description": "Please fill out completely",
        "questions": published_questions,
    })
    assert r_pub.status_code == 200
    assert r_pub.json()["published_version"] == 1

    # 5. Faculty edits again and publishes v2 via PUT /form/publish
    v2_questions = published_questions + [
        {"id": "q4", "type": "phone", "title": "Emergency Phone Number", "required": True}
    ]
    r_v2 = client.post(f"/api/v1/events/{event_id}/form/publish", headers=headers_fac, json={
        "title": "Published Form v2",
        "description": "Updated questions",
        "questions": v2_questions,
    })
    assert r_v2.status_code == 200
    assert r_v2.json()["published_version"] == 2


def test_ended_event_restrictions(lifecycle_context):
    headers_fac = lifecycle_context["headers_fac"]
    headers_s1 = lifecycle_context["headers_s1"]
    s1_id = lifecycle_context["s1_id"]

    # Create an event that is already ended (end_at in the past)
    past_start = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
    past_end = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    r = client.post("/api/v1/events", headers=headers_fac, json={
        "name": "Past Finished Symposium",
        "description": "A symposium that has concluded",
        "start_at": past_start,
        "end_at": past_end,
        "individual_enabled": True,
        "team_enabled": True,
        "volunteer_enabled": True,
    })
    assert r.status_code == 200
    event_id = r.json()["id"]

    # 1. Verify status is ENDED
    r_ev = client.get(f"/api/v1/events/{event_id}", headers=headers_fac)
    assert r_ev.status_code == 200
    assert r_ev.json()["status"] == "ENDED"
    assert r_ev.json()["reg_open"] is False

    # 2. Student cannot register for ended event
    r_reg = client.post(f"/api/v1/events/{event_id}/register", headers=headers_s1, json={
        "answers": {"q1": "val"}
    })
    assert r_reg.status_code == 400
    assert "ended" in r_reg.json()["detail"].lower()

    # 3. Student cannot create team for ended event
    r_team = client.post(f"/api/v1/events/{event_id}/teams", headers=headers_s1, json={
        "team_name": "Late Hackers",
        "member_usns": [],
        "answers": {},
    })
    assert r_team.status_code == 400
    assert "ended" in r_team.json()["detail"].lower()

    # 4. Student cannot apply as volunteer for ended event
    r_vol = client.post(f"/api/v1/events/{event_id}/volunteer-apply", headers=headers_s1, json={
        "skills": "Logistics",
        "preferred_area": "Registration desk",
    })
    assert r_vol.status_code == 400
    assert "ended" in r_vol.json()["detail"].lower()

    # 5. Coordinator cannot appoint leadership for ended event
    r_lead = client.post(f"/api/v1/events/{event_id}/leadership?student_user_id={s1_id}&role=PRESIDENT", headers=headers_fac)
    assert r_lead.status_code == 400
    assert "ended" in r_lead.json()["detail"].lower()

    # 6. Post-event allowed action: can announce/record winners
    r_win = client.post(f"/api/v1/events/{event_id}/winners", headers=headers_fac, json={
        "position": 1,
        "student_user_id": s1_id,
        "achievement": "First Prize Winner",
    })
    assert r_win.status_code == 200
    assert r_win.json()["ok"] is True


def test_event_deletion_cascade(lifecycle_context):
    headers_fac = lifecycle_context["headers_fac"]
    headers_s1 = lifecycle_context["headers_s1"]
    s1_id = lifecycle_context["s1_id"]

    now = datetime.now(timezone.utc)
    # Create event
    r = client.post("/api/v1/events", headers=headers_fac, json={
        "name": "Temporary Event To Delete",
        "description": "Will be permanently deleted",
        "start_at": (now + timedelta(days=1)).isoformat(),
        "end_at": (now + timedelta(days=2)).isoformat(),
        "individual_enabled": True,
        "volunteer_enabled": True,
        "initial_form_template": "individual_default",
    })
    assert r.status_code == 200
    event_id = r.json()["id"]

    # Student registers
    r_reg = client.post(f"/api/v1/events/{event_id}/register", headers=headers_s1, json={
        "answers": {"phone_num": "9876543210"}
    })
    assert r_reg.status_code == 200

    # Delete event
    r_del = client.delete(f"/api/v1/events/{event_id}", headers=headers_fac)
    assert r_del.status_code == 200
    assert r_del.json()["ok"] is True

    # Check event no longer exists
    r_get = client.get(f"/api/v1/events/{event_id}", headers=headers_fac)
    assert r_get.status_code == 404


def test_form_templates_and_deletion_endpoints(lifecycle_context):
    headers_fac = lifecycle_context["headers_fac"]

    # 1. Create event
    now = datetime.now(timezone.utc)
    r = client.post("/api/v1/events", headers=headers_fac, json={
        "name": "Template & Deletion Test Event",
        "description": "Form builder endpoint test",
        "start_at": (now + timedelta(days=2)).isoformat(),
        "end_at": (now + timedelta(days=4)).isoformat(),
        "individual_enabled": True,
        "team_enabled": True,
    })
    assert r.status_code == 200
    event_id = r.json()["id"]

    # 2. Test GET /events/{id}/form/templates
    r_tmpls = client.get(f"/api/v1/events/{event_id}/form/templates", headers=headers_fac)
    assert r_tmpls.status_code == 200
    templates = r_tmpls.json()
    assert len(templates) >= 5
    tmpl_keys = [t["key"] for t in templates]
    assert "hackathon" in tmpl_keys
    assert "project_expo" in tmpl_keys
    assert "workshop" in tmpl_keys
    assert "cultural" in tmpl_keys
    assert "empty" in tmpl_keys

    # 3. Test POST /events/{id}/form/reset with hackathon template
    r_reset = client.post(f"/api/v1/events/{event_id}/form/reset", headers=headers_fac, json={
        "template": "hackathon"
    })
    assert r_reset.status_code == 200
    assert r_reset.json()["ok"] is True
    assert r_reset.json()["template"] == "hackathon"
    assert r_reset.json()["questions_count"] == 7

    # Verify form now has hackathon questions
    r_get = client.get(f"/api/v1/events/{event_id}/form", headers=headers_fac)
    assert r_get.status_code == 200
    assert len(r_get.json()["questions"]) == 7
    assert any("Pitch Deck" in q["title"] for q in r_get.json()["questions"])

    # 4. Test DELETE /events/{id}/form (clearing old form questions)
    r_del = client.delete(f"/api/v1/events/{event_id}/form", headers=headers_fac)
    assert r_del.status_code == 200
    assert r_del.json()["ok"] is True
    assert r_del.json()["questions_count"] == 0

    # Verify form is now empty
    r_get2 = client.get(f"/api/v1/events/{event_id}/form", headers=headers_fac)
    assert r_get2.status_code == 200
    assert len(r_get2.json()["questions"]) == 0

    # 5. Test resetting with workshop template based on current needs
    r_reset_ws = client.post(f"/api/v1/events/{event_id}/form/reset", headers=headers_fac, json={
        "template": "workshop",
        "custom_title": "AI & Deep Learning Bootcamp"
    })
    assert r_reset_ws.status_code == 200
    assert r_reset_ws.json()["questions_count"] == 5
    assert r_reset_ws.json()["title"] == "AI & Deep Learning Bootcamp"


def test_candidate_submission_inspection_endpoint(lifecycle_context):
    headers_fac = lifecycle_context["headers_fac"]
    headers_s1 = lifecycle_context["headers_s1"]
    s1_id = lifecycle_context["s1_id"]

    # 1. Create an event and publish a dynamic form
    now = datetime.now(timezone.utc)
    r_ev = client.post("/api/v1/events", headers=headers_fac, json={
        "name": "Candidate Inspection Test Event",
        "description": "Inspecting filled form responses",
        "start_at": (now + timedelta(days=2)).isoformat(),
        "end_at": (now + timedelta(days=5)).isoformat(),
        "individual_enabled": True,
    })
    assert r_ev.status_code == 200
    event_id = r_ev.json()["id"]

    # Reset with hackathon template and publish v1
    r_reset = client.post(f"/api/v1/events/{event_id}/form/reset", headers=headers_fac, json={
        "template": "hackathon"
    })
    assert r_reset.status_code == 200

    r_pub = client.post(f"/api/v1/events/{event_id}/form/publish", headers=headers_fac, json={
        "title": "Hackathon Registration v1",
        "questions": r_reset.json()["questions"]
    })
    assert r_pub.status_code == 200
    assert r_pub.json()["published_version"] == 1

    # 2. Student registers with answers to hackathon questions
    answers_payload = {
        "q_hack_track": "AI & Intelligent Systems",
        "q_hack_title": "Autonomous Campus Navigation",
        "q_hack_problem": "Optimizing campus shuttles using edge AI computer vision",
        "q_hack_stack": "React, FastAPI, PyTorch",
        "q_hack_repo": "https://github.com/student/campus-nav",
        "q_hack_deck": {"file_url": "https://storage.vvce.ac.in/decks/pitch.pdf", "file_name": "pitch.pdf"},
        "q_hack_id": {"file_url": "https://storage.vvce.ac.in/proofs/id.jpg", "file_name": "id.jpg"}
    }
    r_reg = client.post(f"/api/v1/events/{event_id}/register", headers=headers_s1, json={
        "answers": answers_payload
    })
    assert r_reg.status_code == 200
    reg_id = r_reg.json()["registration_id"]

    # 3. Faculty coordinator calls whole-page inspection endpoint
    r_inspect = client.get(f"/api/v1/events/{event_id}/submissions/{reg_id}", headers=headers_fac)
    assert r_inspect.status_code == 200
    sub_data = r_inspect.json()

    assert sub_data["registration_id"] == reg_id
    assert sub_data["student"]["id"] == s1_id
    assert sub_data["form_version"] == 1
    assert sub_data["form_title"] == "Hackathon Registration v1"
    assert len(sub_data["detailed_fields"]) >= 7

    # Check that answers matched question definitions properly
    track_field = next(f for f in sub_data["detailed_fields"] if f["id"] == "q_hack_track")
    assert track_field["value"] == "AI & Intelligent Systems"
    assert track_field["type"] == "dropdown"

    title_field = next(f for f in sub_data["detailed_fields"] if f["id"] == "q_hack_title")
    assert title_field["value"] == "Autonomous Campus Navigation"

    deck_field = next(f for f in sub_data["detailed_fields"] if f["id"] == "q_hack_deck")
    assert deck_field["type"] == "file"
    assert deck_field["value"]["file_name"] == "pitch.pdf"

    # 4. Student can inspect their own registration form
    r_self = client.get(f"/api/v1/events/{event_id}/submissions/{reg_id}", headers=headers_s1)
    assert r_self.status_code == 200
    assert r_self.json()["registration_id"] == reg_id

    # 5. Invalid registration returns 404
    r_404 = client.get(f"/api/v1/events/{event_id}/submissions/REGNONEXISTENT", headers=headers_fac)
    assert r_404.status_code == 404



