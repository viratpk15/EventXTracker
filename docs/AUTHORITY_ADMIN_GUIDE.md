# EventXTracker — Authority Administration Manual
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Overview
The Authority Portal is the central administrative hub for VVCE institutional governance. It controls user account provisioning, lifecycle state transitions, department appointments, and audit log analysis.

---

## 2. Access & Authentication
- **Portal URL:** `http://localhost:5173/authority/login`
- **Backend API:** `POST /api/v1/authority/auth/login`
- **Initial Bootstrap:** Configured via `POST /api/v1/bootstrap/authority` using the high-entropy `BOOTSTRAP_SECRET`.
- **Account Limit:** Strictly capped at a maximum of 3 accounts (`AUTHORITY_MAX_ACCOUNTS=3`).
- **Security Boundary:** Authority accounts are barred from logging in through `/login`.

---

## 3. Account Lifecycle Management
Authority administrators can manage Student and Faculty accounts from `/authority/accounts`:
1. **Single Account Provisioning:**
   - Supports both Student and Faculty onboarding.
   - Enforces institutional email format (`vvce{YY}{BRANCH}{NUMBER}@vvce.ac.in`).
   - Automatically generates a cryptographically secure temporary password.
   - Flags account with `must_change_password=True`.
2. **Account Suspension & Reactivation:**
   - `POST /api/v1/authority/accounts/{id}/suspend` immediately revokes active login access.
   - `POST /api/v1/authority/accounts/{id}/reactivate` restores active status.
3. **Account Revocation:**
   - `POST /api/v1/authority/accounts/{id}/revoke` locks the account permanently.
4. **Credential Reset:**
   - `POST /api/v1/authority/accounts/{id}/password-reset` generates a new activation secret. The administrator is given the token/password for handover, but the hash is updated securely in the database.

---

## 4. Institutional Governance
From `/authority/departments`:
1. **HOD Appointments:** Exactly one active HOD per department. Prior assignments are preserved with timestamps.
2. **Class Teacher Assignments:** Assigned per department, academic year (e.g., 2025-26), semester (1–8), and section (A/B/C).
3. **Audit Trail:** `/authority/audit-logs` provides real-time traceability of all administrative actions.

