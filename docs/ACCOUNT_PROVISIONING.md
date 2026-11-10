# EventXTracker — Account Provisioning & Identity Verification
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Student Identity Standards
Student accounts adhere to strict institutional formatting rules:
- **Email Structure:** `vvce{YY}{BRANCH}{NUMBER}@vvce.ac.in`
  - `YY`: 2-digit joining year (e.g., `23` for 2023)
  - `BRANCH`: 3-digit normalized department code (`cse`, `ise`, `aiml`, `ec`, `eee`, `me`, `cv`)
  - `NUMBER`: 4-digit sequence number (`0001` to `9999`)
  - *Example:* `vvce23cse0001@vvce.ac.in`
- **USN Structure:** VTU/VVCE standard format: `1VV{YY}{BRANCH}{NUMBER}` (e.g., `1VV23CSE001`).
- **Immutability:** Institutional identity fields (`usn`, `department`, `joining_year`) cannot be altered by students.

---

## 2. Faculty Identity Standards
- **Email Structure:** Institutional faculty email format (`fac_{branch}_{id}@vvce.ac.in` or official college format).
- **Profile Fields:** Full name, department affiliation, and academic designation (Assistant Professor, Associate Professor, Professor, HOD).

---

## 3. Activation & Password Lifecycle
1. Accounts are created in `PENDING_ACTIVATION` state.
2. Authority receives an initial temporary password generated via `generate_temp_password()`.
3. On first login, `must_change_password` is flagged as `true`.
4. The user must call `POST /api/v1/auth/change-password` with their old temporary password and a new strong password before accessing standard portal features.

