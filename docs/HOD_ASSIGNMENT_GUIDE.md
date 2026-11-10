# EventXTracker — HOD Assignment & Department Governance
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Governance Rules
- Each of the 7 academic departments (`CSE`, `ISE`, `AIML`, `EC`, `EEE`, `ME`, `CV`) must have exactly one active Head of Department (HOD).
- An HOD must be an existing Faculty account belonging to that department.
- When a new HOD is appointed, the previous assignment is deactivated and its historical tenure is preserved.

---

## 2. API Operations
- **Appoint HOD:**
  `POST /api/v1/authority/hod`
  - Parameters: `department_id`, `faculty_user_id`
  - Validates that the faculty belongs to the designated department.
  - Revokes active HOD if present and records `assigned_at` timestamp.
- **List HODs:**
  `GET /api/v1/authority/hods` or `GET /api/v1/authority/departments`

