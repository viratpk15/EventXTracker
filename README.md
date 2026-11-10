# EventXTracker — VVCE College Event & Academic Platform
**Vidyavardhaka College of Engineering (VVCE), Mysuru**
*Enterprise-Grade Institutional Event, Academic Achievement & Governance Platform*

---

## 1. System Overview
EventXTracker is a unified, full-stack college management platform built specifically for Vidyavardhaka College of Engineering (VVCE). It features three completely independent portals:
1. **Student Portal:** Event discovery, dynamic form registration, team formation, invitations, volunteer applications, academic submissions (internships & external events), and achievements.
2. **Faculty Portal:** Event creation, Google Forms-style dynamic form builder, coordinator workflows, Model B academic verification queue, department student directory, and 16 institutional A4 PDF reports.
3. **Authority Portal:** Institutional administration, account lifecycle management, CSV bulk import with downloadable templates, department governance, HOD appointments, Class Teacher assignments, and immutable audit logging.

---

## 2. Core Architectural Highlights
- **Dual-Model Scoping:**
  - **Model A (Events):** College-wide event visibility. Department faculty view their department's event records without needing a Class Teacher assignment. Faculty Event Coordinators have cross-department oversight for their assigned event.
  - **Model B (Academics):** Student submissions for internships and external technical events in `PENDING_REVIEW` are visible **strictly** to the exact assigned Class Teacher (`department + semester + section + academic_year`). Reviewed records become viewable by all faculty within the department; cross-department access is denied.
- **Dynamic Form Builder:** Interactive form builder with immutable versioning (`FormVersion`). Supports short text, long text, email, phone, number bounds, dropdowns, ratings, and sections.
- **Volunteer Governance:** Student application $\rightarrow$ Faculty Coordinator approval $\rightarrow$ Duty allocation $\rightarrow$ Completion verification. Strictly omits shifts, volunteer hours, and QR check-ins by institutional design.
- **16 Institutional A4 PDF Reports:** High-fidelity ReportLab PDF generation covering participants, teams, attendance, volunteers, winners, and Model B academic digests.
- **200 Preserved Development Accounts:** Synthetic development accounts (40 Faculty, 160 Students) across all 7 departments (CSE, ISE, AIML, EC, EEE, ME, CV) preserved with zero duplicate records.

---

## 3. Technology Stack
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2, Argon2id (`passlib`), PyJWT, ReportLab.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router v7.
- **Database:** SQLite for local development (`backend/eventxtracker.db`), PostgreSQL 15+ for production (see `docs/ADR-001-database.md`).

---

## 4. Quick Start (Local Development)

### 4.1 Prerequisites
- Python 3.12+ (or use root `.venv`)
- Node.js 18+ and npm

### 4.2 Start Backend Server
```bash
# From repository root:
cd backend
../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Health Check:* `curl http://127.0.0.1:8000/api/v1/health` $\rightarrow$ `{"status":"ok"}`

### 4.3 Start Frontend Dev Server
```bash
# In a new terminal from repository root:
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
*Access Web App:* [http://localhost:5173](http://localhost:5173)

---

## 5. Portal Access & Credentials

Credentials for all 200 synthetic accounts are stored in `backend/seed_credentials.local.txt`.

### Authority Portal
- **URL:** [http://localhost:5173/authority/login](http://localhost:5173/authority/login)
- **Email:** `authority@vvce.ac.in`
- **Initial Bootstrap:** Configured via `POST /api/v1/bootstrap/authority` using the `BOOTSTRAP_SECRET` in `backend/.env`.

### Faculty Portal
- **URL:** [http://localhost:5173/login](http://localhost:5173/login) (Select **Faculty** tab)
- **Sample CSE HOD:** `fac_cse_01@vvce.ac.in` (Password in `backend/seed_credentials.local.txt`)

### Student Portal
- **URL:** [http://localhost:5173/login](http://localhost:5173/login) (Select **Student** tab)
- **Sample CSE Student:** `vvce23cse0001@vvce.ac.in` (Password in `backend/seed_credentials.local.txt`)

---

## 6. Testing & Build Verification

```bash
# Run backend automated test suite (13 passing tests):
.venv/bin/pytest backend/tests/ -v

# Run frontend production build:
cd frontend && npm run build
```

---

## 7. Institutional Documentation
Detailed documentation is maintained in the `docs/` directory:
- [System Architecture](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/ARCHITECTURE.md)
- [Database Decision (ADR-001)](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/ADR-001-database.md)
- [Database Schema & ERD](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/DATABASE_SCHEMA.md)
- [REST API Reference](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/API_REFERENCE.md)
- [Authorization Matrix](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/AUTHORIZATION_MATRIX.md)
- [Authority Administration Guide](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/AUTHORITY_ADMIN_GUIDE.md)
- [Account Provisioning Standards](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/ACCOUNT_PROVISIONING.md)
- [Bulk Import Guide](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/BULK_IMPORT_GUIDE.md)
- [HOD Assignment Guide](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/HOD_ASSIGNMENT_GUIDE.md)
- [Class Teacher Guide](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/CLASS_TEACHER_GUIDE.md)
- [Event Coordinator Guide](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/EVENT_COORDINATOR_GUIDE.md)
- [Student Leadership (President & VP) Guide](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/PRESIDENT_VP_GUIDE.md)
- [Student Portal Guide](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/STUDENT_GUIDE.md)
- [Dynamic Form Builder Guide](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/DYNAMIC_FORM_BUILDER_GUIDE.md)
- [16 A4 PDF Reporting Guide](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/REPORTING_GUIDE.md)
- [Database Backup & Recovery](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/BACKUP_RESTORE.md)
- [Production Deployment Manual](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/DEPLOYMENT.md)
- [Security Architecture](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/SECURITY.md)
- [Maintenance Guide](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/MAINTENANCE.md)
- [Known Limitations](file:///Users/virat/MyPersonalCloud/eventxtracker%202/docs/KNOWN_LIMITATIONS.md)
- [Master Final Delivery Report](file:///Users/virat/MyPersonalCloud/eventxtracker%202/EVENTXTRACKER_FINAL_DELIVERY_REPORT.md)
