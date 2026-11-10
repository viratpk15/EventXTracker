"""Comprehensive test suite for Phase 8: Google Forms-Style Dynamic Event Form Builder."""
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
client = TestClient(app)


@pytest.fixture(scope="module")
def form_test_context():
    import uuid
    ts = uuid.uuid4().hex[:6]

    # Setup test users
    db = SessionLocal()
    existing = db.query(User).filter_by(email="form_admin@vvce.ac.in").first()
    if not existing:
        auth_users = db.query(User).filter_by(account_type=AccountType.AUTHORITY).all()
        if len(auth_users) >= 3:
            db.delete(auth_users[-1])
            db.commit()
    db.close()

    client.post("/api/v1/bootstrap/authority", json={
        "email": "form_admin@vvce.ac.in",
        "password": "AuthoritySuperSecure123!",
        "bootstrap_secret": "test-bootstrap"
    })
    r_auth = client.post("/api/v1/authority/auth/login", json={
        "email": "form_admin@vvce.ac.in",
        "password": "AuthoritySuperSecure123!"
    })
    assert r_auth.status_code == 200, r_auth.text
    auth_token = r_auth.json()["access_token"]
    headers_auth = {"Authorization": f"Bearer {auth_token}"}

    # Provision faculty
    fac_email = f"fac_form_{ts}@vvce.ac.in"
    r_fac = client.post("/api/v1/authority/faculty", headers=headers_auth, json={
        "full_name": "Prof. Form Builder",
        "email": fac_email,
        "branch": "CSE",
        "designation": "Associate Professor"
    })
    assert r_fac.status_code == 200, r_fac.text
    fac_pwd = r_fac.json()["temporary_password"]
    r_fac_login = client.post("/api/v1/auth/login", json={
        "email": fac_email,
        "password": fac_pwd
    })
    assert r_fac_login.status_code == 200, r_fac_login.text
    fac_token = r_fac_login.json()["access_token"]
    headers_fac = {"Authorization": f"Bearer {fac_token}"}

    # Provision student 1
    s1_email = f"vvce23cse{ts[:3]}1@vvce.ac.in"
    s1_usn = f"4VV23CS{ts[:3].upper()}1"
    r_s1 = client.post("/api/v1/authority/students", headers=headers_auth, json={
        "full_name": "Student Alpha Form",
        "email": s1_email,
        "usn": s1_usn,
        "branch": "CSE",
        "semester": 6,
        "section": "A",
        "joining_year": 2023
    })
    assert r_s1.status_code == 200, r_s1.text
    s1_pwd = r_s1.json()["temporary_password"]
    r_s1_login = client.post("/api/v1/auth/login", json={
        "email": s1_email,
        "password": s1_pwd
    })
    assert r_s1_login.status_code == 200, r_s1_login.text
    s1_token = r_s1_login.json()["access_token"]
    headers_s1 = {"Authorization": f"Bearer {s1_token}"}

    # Provision student 2
    s2_email = f"vvce23cse{ts[:3]}2@vvce.ac.in"
    s2_usn = f"4VV23CS{ts[:3].upper()}2"
    r_s2 = client.post("/api/v1/authority/students", headers=headers_auth, json={
        "full_name": "Student Beta Form",
        "email": s2_email,
        "usn": s2_usn,
        "branch": "CSE",
        "semester": 6,
        "section": "A",
        "joining_year": 2023
    })
    assert r_s2.status_code == 200, r_s2.text
    s2_pwd = r_s2.json()["temporary_password"]
    r_s2_login = client.post("/api/v1/auth/login", json={
        "email": s2_email,
        "password": s2_pwd
    })
    assert r_s2_login.status_code == 200, r_s2_login.text
    s2_token = r_s2_login.json()["access_token"]
    headers_s2 = {"Authorization": f"Bearer {s2_token}"}

    # Create event
    r_ev = client.post("/api/v1/events/", headers=headers_fac, json={
        "name": f"Dynamic Form Hackathon {ts}",
        "description": "Multi-round event with custom Google Forms style questions",
        "event_type": "HACKATHON",
        "tier": "COLLEGE",
        "start_at": "2026-11-20T09:00:00Z",
        "end_at": "2026-11-21T18:00:00Z",
        "individual_enabled": True,
        "team_enabled": True,
        "min_team_size": 2,
        "max_team_size": 4,
        "max_participants": 150,
        "department_eligibility": ["CSE", "ISE"],
        "semester_eligibility": [6]
    })
    assert r_ev.status_code == 200, r_ev.text
    event_id = r_ev.json()["id"]

    return {
        "event_id": event_id,
        "headers_fac": headers_fac,
        "headers_s1": headers_s1,
        "headers_s2": headers_s2,
        "s1_usn": s1_usn,
        "s2_usn": s2_usn,
    }


def test_form_builder_draft_and_publish_v1(form_test_context):
    ctx = form_test_context
    ev_id = ctx["event_id"]
    h_fac = ctx["headers_fac"]

    # 1. Faculty saves draft form with 6 diverse question types
    questions_v1 = [
        {
            "id": "q_name",
            "type": "short_text",
            "title": "Full Legal Name",
            "required": True,
            "min_length": 3,
            "max_length": 50
        },
        {
            "id": "q_contact_email",
            "type": "email",
            "title": "Alternate Contact Email",
            "required": True
        },
        {
            "id": "q_track",
            "type": "dropdown",
            "title": "Chosen Hackathon Track",
            "required": True,
            "options": ["AI / Machine Learning", "Web3 / Blockchain", "Cybersecurity", "Cloud Architecture"]
        },
        {
            "id": "q_has_laptop",
            "type": "yes_no",
            "title": "Will you bring your own laptop?",
            "required": True
        },
        {
            "id": "q_laptop_os",
            "type": "single_choice",
            "title": "Laptop Operating System",
            "required": True,
            "options": ["macOS", "Linux", "Windows"],
            "conditional": {
                "depends_on_question_id": "q_has_laptop",
                "operator": "equals",
                "value": "Yes"
            }
        },
        {
            "id": "q_experience_rating",
            "type": "rating",
            "title": "Self-Assessed Coding Experience (1-5)",
            "required": False,
            "rating_max": 5
        }
    ]

    r_draft = client.put(f"/api/v1/events/{ev_id}/form/draft", headers=h_fac, json={
        "title": "Hackathon 2026 Registration Questionnaire",
        "description": "Please complete all mandatory questions for screening.",
        "questions": questions_v1
    })
    assert r_draft.status_code == 200
    assert r_draft.json()["draft_saved"] is True

    # Check that draft is readable by faculty
    r_get_draft = client.get(f"/api/v1/events/{ev_id}/form", headers=h_fac)
    assert r_get_draft.status_code == 200
    assert r_get_draft.json()["has_draft"] is True
    assert len(r_get_draft.json()["questions"]) == 6

    # 2. Publish form v1
    r_pub1 = client.put(f"/api/v1/events/{ev_id}/form", headers=h_fac, json={
        "title": "Hackathon 2026 Registration Questionnaire",
        "description": "Please complete all mandatory questions for screening.",
        "questions": questions_v1
    })
    assert r_pub1.status_code == 200
    assert r_pub1.json()["version"] == 1
    assert r_pub1.json()["published_version"] == 1


def test_student_registration_validation_and_submission(form_test_context):
    ctx = form_test_context
    ev_id = ctx["event_id"]
    h_s1 = ctx["headers_s1"]

    # Student fetches the published form
    r_form = client.get(f"/api/v1/events/{ev_id}/form", headers=h_s1)
    assert r_form.status_code == 200
    form_data = r_form.json()
    assert form_data["version"] == 1
    assert len(form_data["questions"]) == 6

    # Test 1: Missing required field (q_track missing) -> 400
    r_invalid_req = client.post(f"/api/v1/events/{ev_id}/register", headers=h_s1, json={
        "answers": {
            "q_name": "Student Alpha",
            "q_contact_email": "alpha@example.com",
            "q_has_laptop": "No"
        }
    })
    assert r_invalid_req.status_code == 400
    assert "Required question unanswered" in r_invalid_req.json()["detail"]

    # Test 2: Invalid email format -> 400
    r_invalid_email = client.post(f"/api/v1/events/{ev_id}/register", headers=h_s1, json={
        "answers": {
            "q_name": "Student Alpha",
            "q_contact_email": "not-an-email",
            "q_track": "AI / Machine Learning",
            "q_has_laptop": "No"
        }
    })
    assert r_invalid_email.status_code == 400
    assert "Invalid email answer" in r_invalid_email.json()["detail"]

    # Test 3: Conditional validation
    # If q_has_laptop == 'Yes', q_laptop_os is required and must be in options
    r_invalid_cond = client.post(f"/api/v1/events/{ev_id}/register", headers=h_s1, json={
        "answers": {
            "q_name": "Student Alpha",
            "q_contact_email": "alpha@example.com",
            "q_track": "AI / Machine Learning",
            "q_has_laptop": "Yes",
            "q_laptop_os": "InvalidOS"
        }
    })
    assert r_invalid_cond.status_code == 400
    assert "Must be one of" in r_invalid_cond.json()["detail"]

    # Test 4: Valid submission (with q_has_laptop == 'Yes' and valid q_laptop_os)
    r_valid = client.post(f"/api/v1/events/{ev_id}/register", headers=h_s1, json={
        "answers": {
            "q_name": "Student Alpha Form",
            "q_contact_email": "alpha.valid@example.com",
            "q_track": "AI / Machine Learning",
            "q_has_laptop": "Yes",
            "q_laptop_os": "macOS",
            "q_experience_rating": 4
        }
    })
    assert r_valid.status_code == 200
    assert "registration_id" in r_valid.json()
    reg_id = r_valid.json()["registration_id"]
    assert reg_id.startswith("REG")


def test_form_versioning_and_submission_immutability(form_test_context):
    ctx = form_test_context
    ev_id = ctx["event_id"]
    h_fac = ctx["headers_fac"]
    h_s2 = ctx["headers_s2"]

    # Faculty updates the form: reorders questions, adds a new question, and publishes v2
    questions_v2 = [
        {
            "id": "q_name",
            "type": "short_text",
            "title": "Full Legal Name",
            "required": True
        },
        {
            "id": "q_github_profile",
            "type": "url",
            "title": "GitHub Profile URL",
            "required": True
        },
        {
            "id": "q_track",
            "type": "dropdown",
            "title": "Chosen Hackathon Track",
            "required": True,
            "options": ["AI / Machine Learning", "Web3 / Blockchain", "Cybersecurity", "Cloud Architecture"]
        },
        {
            "id": "q_stipend_expectation",
            "type": "currency",
            "title": "Expected Stipend Requirement",
            "currency_symbol": "₹",
            "required": False,
            "min": 0,
            "max": 50000
        }
    ]

    r_pub2 = client.put(f"/api/v1/events/{ev_id}/form", headers=h_fac, json={
        "title": "Hackathon 2026 - Revised v2 Form",
        "description": "Updated questionnaire including GitHub verification.",
        "questions": questions_v2
    })
    assert r_pub2.status_code == 200
    assert r_pub2.json()["version"] == 2
    assert r_pub2.json()["published_version"] == 2

    # Check form version history endpoint
    r_history = client.get(f"/api/v1/events/{ev_id}/form/versions", headers=h_fac)
    assert r_history.status_code == 200
    history = r_history.json()
    assert len(history) == 2
    assert history[0]["version"] == 2
    assert history[0]["is_current"] is True
    assert history[1]["version"] == 1
    assert history[1]["submissions_count"] == 1  # Student Alpha submitted under v1!

    # Student 2 registers under version 2
    r_reg_s2 = client.post(f"/api/v1/events/{ev_id}/register", headers=h_s2, json={
        "answers": {
            "q_name": "Student Beta Form",
            "q_github_profile": "https://github.com/studentbeta",
            "q_track": "Cybersecurity",
            "q_stipend_expectation": 15000
        }
    })
    assert r_reg_s2.status_code == 200

    # Faculty inspects submissions: Student Alpha remains bound to v1, Student Beta is bound to v2
    r_subs = client.get(f"/api/v1/events/{ev_id}/submissions", headers=h_fac)
    assert r_subs.status_code == 200
    subs = r_subs.json()
    s1_record = next(s for s in subs if s["usn"] == ctx["s1_usn"])
    s2_record = next(s for s in subs if s["usn"] == ctx["s2_usn"])

    # Immutability check:
    assert s1_record["form_version"] == 1
    assert "q_laptop_os" in s1_record["answers"]
    assert s1_record["answers"]["q_laptop_os"] == "macOS"

    assert s2_record["form_version"] == 2
    assert "q_github_profile" in s2_record["answers"]
    assert s2_record["answers"]["q_github_profile"] == "https://github.com/studentbeta"


def test_three_form_creation_options_and_ppt_template(form_test_context):
    """Test event creation with team_default, individual_default, and inline custom questions."""
    ctx = form_test_context
    h_fac = ctx["headers_fac"]

    # Option 1: Team Default with PPT Template URL
    r_team = client.post("/api/v1/events", headers=h_fac, json={
        "name": "State Hackathon 2026",
        "description": "24hr technical hackathon",
        "category": "Hackathon",
        "venue": "CSE Auditorium",
        "start_at": "2026-11-20T09:00:00Z",
        "end_at": "2026-11-21T09:00:00Z",
        "team_enabled": True,
        "individual_enabled": False,
        "min_team_size": 2,
        "max_team_size": 4,
        "require_same_department": True,
        "registration_fee": 500.0,
        "whatsapp_group_url": "https://chat.whatsapp.com/StateHack2026",
        "payment_qr_url": "https://storage.vvce.ac.in/qr/hack2026.png",
        "payment_instructions": "Pay via UPI and enter UTR reference",
        "ppt_template_url": "https://storage.vvce.ac.in/templates/VVCE_Hack_Template.pptx",
        "initial_form_template": "team_default"
    })
    assert r_team.status_code == 200
    res_team = r_team.json()
    assert res_team["version"] == 1
    ev_id = res_team["id"]

    # Verify event details include ppt_template_url
    r_ev = client.get(f"/api/v1/events/{ev_id}", headers=h_fac)
    assert r_ev.status_code == 200
    ev_data = r_ev.json()
    assert ev_data["ppt_template_url"] == "https://storage.vvce.ac.in/templates/VVCE_Hack_Template.pptx"
    assert ev_data["require_same_department"] is True

    # Option 2: Individual Default
    r_indiv = client.post("/api/v1/events", headers=h_fac, json={
        "name": "Cloud Computing Workshop",
        "category": "Workshop",
        "start_at": "2026-11-25T10:00:00Z",
        "end_at": "2026-11-25T16:00:00Z",
        "team_enabled": False,
        "individual_enabled": True,
        "initial_form_template": "individual_default"
    })
    assert r_indiv.status_code == 200
    assert r_indiv.json()["version"] == 1

    # Option 3: Custom Form with custom_questions array
    custom_qs = [
        {"id": "q_domain", "type": "dropdown", "title": "Track", "required": True, "options": ["Web", "AI", "Cloud"]},
        {"id": "q_summary", "type": "long_text", "title": "Project Summary", "required": True},
        {"id": "q_deck", "type": "file", "title": "Upload Slide Deck", "required": True, "file_types": ["pdf", "pptx"]}
    ]
    r_custom = client.post("/api/v1/events", headers=h_fac, json={
        "name": "Design Thinking Expo",
        "category": "Technical",
        "start_at": "2026-11-28T09:00:00Z",
        "end_at": "2026-11-28T17:00:00Z",
        "team_enabled": True,
        "individual_enabled": False,
        "initial_form_template": "custom",
        "custom_questions": custom_qs
    })
    assert r_custom.status_code == 200
    res_custom = r_custom.json()
    assert res_custom["version"] == 1

    # Verify custom questions were published
    r_form = client.get(f"/api/v1/events/{res_custom['id']}/form", headers=h_fac)
    assert r_form.status_code == 200
    form_data = r_form.json()
    assert len(form_data["questions"]) == 3
    assert form_data["questions"][0]["id"] == "q_domain"


def test_dedicated_class_teacher_endpoints(form_test_context):
    """Test /api/v1/faculty/class-teacher/... endpoints and me profile enrichment."""
    ctx = form_test_context
    h_fac = ctx["headers_fac"]

    # 1. Verify GET /api/v1/auth/me returns class teacher and hod profile flags
    r_me = client.get("/api/v1/auth/me", headers=h_fac)
    assert r_me.status_code == 200
    profile = r_me.json()["profile"]
    assert "is_class_teacher" in profile
    assert "class_teacher_assignments" in profile
    assert "is_hod" in profile

    # 2. Check dedicated assigned-class endpoint
    r_classes = client.get("/api/v1/faculty/class-teacher/assigned-class", headers=h_fac)
    assert r_classes.status_code == 200
    assert isinstance(r_classes.json(), list)

    # 3. Check dedicated students endpoint
    r_students = client.get("/api/v1/faculty/class-teacher/students", headers=h_fac)
    assert r_students.status_code == 200
    assert isinstance(r_students.json(), list)

    # 4. Check dedicated reviews endpoint
    r_reviews = client.get("/api/v1/faculty/class-teacher/reviews", headers=h_fac)
    assert r_reviews.status_code == 200
    rev_data = r_reviews.json()
    assert "internships" in rev_data
    assert "external_events" in rev_data
    assert "total_pending" in rev_data

