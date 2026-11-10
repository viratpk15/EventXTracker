# EventXTracker — Class Teacher Assignment & Academic Verification Manual
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Class Teacher Role & Model B Scoping
In EventXTracker, a **Class Teacher** is a faculty member assigned to a specific student cohort defined by:
1. `department_id` (e.g., CSE)
2. `academic_year` (e.g., 2025-26)
3. `semester` (e.g., 5)
4. `section` (e.g., A)

### Scoping Rules
- The assigned Class Teacher is the **sole authority** permitted to review pending student submissions for:
  - Internships (`POST /api/v1/internships/{id}/review`)
  - External Technical Events (`POST /api/v1/external-events/{id}/review`)
- Unreviewed records remain completely hidden from all other faculty members.
- Cross-department access is strictly barred.

---

## 2. Review Procedure
1. Navigate to `/faculty/academic-reviews` in the Faculty Portal.
2. Inspect student submission details: organization, role, dates, description, and attached proof.
3. Check the **Physical Certificate Inspected** checkbox if original hard-copy evidence has been inspected.
4. Record status:
   - `VERIFIED`: Formally confirms institutional academic credit.
   - `REJECTED`: Declines submission with required feedback comments.
   - `ON_HOLD`: Requests resubmission or further clarification.

