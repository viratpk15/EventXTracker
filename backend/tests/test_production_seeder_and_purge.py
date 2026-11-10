"""Tests for production demo auto-seeder, credentials check, and safe purge mechanism."""
import os
import sys
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_eventxtracker.db"
os.environ["BOOTSTRAP_SECRET"] = "test-bootstrap"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import User, Event, Department
from app.seeder import seed_demo_dataset, purge_demo_dataset, get_demo_status

Base.metadata.create_all(bind=engine)
client = TestClient(app)


def test_public_demo_credentials_endpoint():
    r = client.get("/api/v1/demo/credentials")
    assert r.status_code == 200
    data = r.json()
    assert "demo_accounts" in data
    assert any(a["role"] == "Authority" for a in data["demo_accounts"])


def test_seed_and_purge_cycle():
    db = SessionLocal()

    # 1. Run seeder
    res = seed_demo_dataset(db, force=True)
    assert res["status"] in ("success", "already_seeded")

    # Verify seeded counts
    seeded_events = db.query(Event).filter_by(is_seeded=True).count()
    assert seeded_events == 5, f"Expected 5 seeded events, found {seeded_events}"

    # Verify key accounts exist with working password hash
    auth_user = db.query(User).filter_by(email="authority@vvce.ac.in").first()
    assert auth_user is not None

    fac_user = db.query(User).filter_by(email="faccse01@vvce.ac.in").first()
    assert fac_user is not None

    stu_pres = db.query(User).filter_by(email="vvcecse0001@vvce.ac.in").first()
    assert stu_pres is not None

    # Test login with demo passwords via API
    r_auth = client.post("/api/v1/authority/auth/login", json={"email": "authority@vvce.ac.in", "password": "authority123"})
    assert r_auth.status_code == 200, r_auth.text
    token = r_auth.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r_fac = client.post("/api/v1/auth/faculty/login", json={"email": "faccse01@vvce.ac.in", "password": "faculty123"})
    assert r_fac.status_code == 200, r_fac.text

    r_stu = client.post("/api/v1/auth/student/login", json={"email": "vvcecse0001@vvce.ac.in", "password": "student123"})
    assert r_stu.status_code == 200, r_stu.text

    # Test authority demo status endpoint
    r_st = client.get("/api/v1/authority/demo-status", headers=headers)
    assert r_st.status_code == 200
    st_data = r_st.json()
    assert st_data["is_demo_active"] is True
    assert st_data["seeded_events_count"] == 5

    # 2. Test safe purge mechanism
    r_purge = client.post("/api/v1/authority/purge-seed-data", headers=headers)
    assert r_purge.status_code == 200
    purge_data = r_purge.json()
    assert purge_data["status"] == "success"
    assert purge_data["purged_events"] == 5

    # Verify zero seeded events remain
    assert db.query(Event).filter_by(is_seeded=True).count() == 0

    # 3. Test reseed endpoint
    r_reseed = client.post("/api/v1/authority/reseed-demo-data", headers=headers)
    assert r_reseed.status_code == 200
    assert db.query(Event).filter_by(is_seeded=True).count() == 5

    # Purge again to leave clean state for any subsequent tests
    purge_demo_dataset(db)
    db.close()
