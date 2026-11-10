# EventXTracker — REST API Reference Manual
**Vidyavardhaka College of Engineering (VVCE), Mysuru**
*Base URL:* `http://127.0.0.1:8000/api/v1`

All requests except login and bootstrap require an `Authorization: Bearer <access_token>` header.

---

## 1. Authentication Endpoints

### Student & Faculty Login
- **`POST /api/v1/auth/login`**
  - **Request:** `{"email": "vvce23cse0001@vvce.ac.in", "password": "..."}`
  - **Response 200:** `{"access_token": "...", "token_type": "bearer", "account_type": "STUDENT", "must_change_password": false}`
  - **Rejection 403:** If an `AUTHORITY` account attempts login here, returns HTTP 403 Forbidden.

### Authority Login
- **`POST /api/v1/authority/auth/login`**
  - **Request:** `{"email": "authority@vvce.ac.in", "password": "..."}`
  - **Response 200:** `{"access_token": "...", "token_type": "bearer", "account_type": "AUTHORITY"}`
  - **Rejection 403:** If a Student or Faculty attempts login here, returns HTTP 403 Forbidden.

### Change Password
- **`POST /api/v1/auth/change-password`**
  - **Request:** `{"old_password": "...", "new_password": "..."}`
  - **Response 200:** `{"ok": true}`

### Current User Profile
- **`GET /api/v1/auth/me`** (Student / Faculty)
- **`GET /api/v1/authority/auth/me`** (Authority)

---

## 2. Authority Administration & Governance

### Account Management
- **`GET /api/v1/authority/accounts`**: List all accounts with pagination and filters (`role`, `status`, `search`).
- **`POST /api/v1/authority/accounts`**: Provision an individual Student or Faculty account.
- **`GET /api/v1/authority/accounts/{id}`**: Detailed user profile.
- **`PATCH /api/v1/authority/accounts/{id}`**: Update permitted account fields.
- **`POST /api/v1/authority/accounts/{id}/suspend`**: Suspend an account.
- **`POST /api/v1/authority/accounts/{id}/reactivate`**: Reactivate a suspended account.
- **`POST /api/v1/authority/accounts/{id}/revoke`**: Revoke access completely.
- **`POST /api/v1/authority/accounts/{id}/password-reset`**: Reset user credentials with an auto-generated temporary password.
- **`GET /api/v1/authority/accounts/{id}/audit`**: Audit history of actions performed on or by the account.

### Bulk Import
- **`GET /api/v1/authority/accounts/import-template?kind=STUDENT|FACULTY`**: Download standard CSV template.
- **`POST /api/v1/authority/accounts/bulk-import?kind=STUDENT|FACULTY`**: Multipart file upload of CSV. Performs row-by-row validation, duplicate USN/email checks, and atomic commit.

### Department & Academic Governance
- **`GET /api/v1/authority/departments`**: List departments with student/faculty/CT counts.
- **`POST /api/v1/authority/hod`**: Appoint active HOD for a department.
- **`GET /api/v1/authority/governance`**: Overview of active HODs and Class Teachers.
- **`GET /api/v1/authority/hods`**: List of all appointed HODs.
- **`GET /api/v1/authority/class-teachers`**: List of all appointed Class Teachers.
- **`POST /api/v1/authority/class-teacher`**: Assign a Class Teacher (`department_id`, `semester`, `section`, `academic_year`, `faculty_user_id`).
- **`DELETE /api/v1/authority/class-teacher/{id}`**: Revoke a Class Teacher assignment.
- **`GET /api/v1/authority/audit-logs`**: Immutable institutional audit trail.

---

## 3. Events & Dynamic Forms

### Event Management
- **`GET /api/v1/events`**: List active and upcoming events matching student eligibility.
- **`POST /api/v1/events`**: Create a new event (Faculty only).
- **`GET /api/v1/events/{id}`**: Get event details.
- **`PATCH /api/v1/events/{id}`**: Update event settings.
- **`GET /api/v1/events/{id}/participants`**: Participants register (Model A scoped: Coordinator sees all; department faculty see own dept).
- **`GET /api/v1/events/{id}/submissions`**: Coordinator view of custom form question responses.

### Dynamic Form Builder
- **`GET /api/v1/events/{id}/form`**: Get currently published form questions and version.
- **`PUT /api/v1/events/{id}/form`**: Publish updated question schema. Increments `FormVersion` immutably.

### Registrations & Teams
- **`POST /api/v1/events/{id}/register`**: Submit individual registration with form answers.
- **`GET /api/v1/events/{id}/my-status`**: Check registration, team, and volunteer status.
- **`POST /api/v1/events/{id}/teams`**: Create a team and send invitations to member USNs.
- **`GET /api/v1/teams/invitations`**: View pending team invitations.
- **`POST /api/v1/teams/invitations/{id}/respond?accept=true|false`**: Accept or decline an invitation.

---

## 4. Governance, Operations & Volunteers

### Event Leadership
- **`POST /api/v1/events/{id}/leadership?student_user_id=X&role=PRESIDENT|VICE_PRESIDENT|VOLUNTEER_COORDINATOR`**: Appoint leadership (Faculty Event Coordinator only).
- **`GET /api/v1/events/{id}/leadership`**: List appointed student leaders.

### Shortlisting
- **`POST /api/v1/events/{id}/shortlist-team/{team_id}`**: Shortlist team (President/VP only).
- **`POST /api/v1/events/{id}/shortlist-participant/{reg_id}`**: Shortlist individual (President/VP only).
- **`POST /api/v1/events/{id}/shortlist/eligible-all`**: Batch shortlist all eligible registrations.

### Volunteer Lifecycle
- **`POST /api/v1/events/{id}/volunteer-apply`**: Submit volunteer application.
- **`GET /api/v1/events/{id}/volunteers`**: List volunteer applications.
- **`POST /api/v1/volunteer-applications/{id}/approve?approve=true|false`**: Formal approval (Faculty Event Coordinator only).
- **`POST /api/v1/volunteer-applications/{id}/allocate?responsibility=...&allocation=...`**: Assign duty.
- **`POST /api/v1/volunteer-applications/{id}/complete?completed=true|false`**: Mark completion.

### Attendance & Winners
- **`POST /api/v1/events/{id}/attendance/{student_id}?status=PRESENT|ABSENT|EXCUSED`**: Mark attendance.
- **`GET /api/v1/events/{id}/attendance`**: View attendance register.
- **`POST /api/v1/events/{id}/winners`**: Add winners (supports multiple at same position).
- **`GET /api/v1/events/{id}/winners`**: View podium records.

---

## 5. Academics (Model B) & Notifications

### Academic Records
- **`POST /api/v1/internships`**: Submit internship record.
- **`GET /api/v1/internships`**: Scoped list (Pending visible ONLY to exact assigned Class Teacher; reviewed visible to same dept).
- **`POST /api/v1/internships/{id}/review?status=VERIFIED|REJECTED|ON_HOLD&evidence_inspected=true`**: Class Teacher verification.
- **`POST /api/v1/external-events`**: Submit external competition record.
- **`GET /api/v1/external-events`**: Scoped list of external technical events.
- **`POST /api/v1/external-events/{id}/review?status=...`**: Class Teacher verification.

### Notifications
- **`GET /api/v1/notifications`**: List user notifications.
- **`POST /api/v1/notifications/{id}/read`**: Mark specific notification read.
- **`POST /api/v1/notifications/mark-all-read`**: Mark all notifications read.

---

## 6. PDF Reports

All report endpoints return `application/pdf` with A4 page formatting:
- **`GET /api/v1/reports/event_executive?event_id=X`**
- **`GET /api/v1/reports/participants?event_id=X`**
- **`GET /api/v1/reports/teams?event_id=X`**
- **`GET /api/v1/reports/attendance?event_id=X`**
- **`GET /api/v1/reports/volunteer_applications?event_id=X`**
- **`GET /api/v1/reports/volunteer_allocations?event_id=X`**
- **`GET /api/v1/reports/volunteer_completion?event_id=X`** *(No volunteer hours)*
- **`GET /api/v1/reports/event_summary?event_id=X`**
- **`GET /api/v1/reports/winners?event_id=X`**
- **`GET /api/v1/reports/semester_register`**
- **`GET /api/v1/reports/section_register`**
- **`GET /api/v1/reports/internships`**
- **`GET /api/v1/reports/verified_internships`**
- **`GET /api/v1/reports/external_events`**
- **`GET /api/v1/reports/external_verification`**
- **`GET /api/v1/reports/comprehensive_extract`**

