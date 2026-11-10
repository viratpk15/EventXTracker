# EventXTracker — Bulk Account Import Guide
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Overview
The bulk import mechanism enables the Authority to onboard entire cohorts of students or faculty via CSV. Import operations use atomic database transactions: if row-level errors occur, detailed line numbers and failure reasons are reported without creating partial invalid records.

---

## 2. Template Downloads
- **Student Template:** `GET /api/v1/authority/accounts/import-template?kind=STUDENT`
  - Header row: `full_name,usn,email,branch,joining_year,semester,section`
  - Sample row: `Arun Kumar,1VV24CSE001,vvce24cse0001@vvce.ac.in,CSE,2024,1,A`
- **Faculty Template:** `GET /api/v1/authority/accounts/import-template?kind=FACULTY`
  - Header row: `full_name,email,branch,designation`
  - Sample row: `Dr. Ramesh K,ramesh@vvce.ac.in,CSE,Associate Professor`

---

## 3. Validation Rules
- **USN & Email Uniqueness:** Checked against existing database records and duplicates within the CSV.
- **Department Normalization:** Branch codes must belong to `['CSE', 'ISE', 'AIML', 'EC', 'EEE', 'ME', 'CV']`. `ECE` is automatically normalized to `EC`.
- **Atomic Commit:** When the CSV is valid, all user accounts and profile records are inserted within a single database transaction, and an `ImportBatch` log is recorded.

