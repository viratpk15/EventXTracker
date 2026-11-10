# EventXTracker — Institutional 16 A4 PDF Reporting Guide
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Specifications
All 16 reports are compiled on demand into formal A4 PDF format via ReportLab (`reportlab.platypus` SimpleDocTemplate):
- Proper page numbering (e.g. `Page X of Y`).
- Formal VVCE institutional header block.
- Generation timestamp with timezone (`Asia/Kolkata`).
- Scoped data access adhering strictly to Model A (events) and Model B (academics).
- **Report 8 Rule:** Explicit absence of volunteer hours, hourly tracking, or shift logs.

---

## 2. Report Catalog

### Event-Level Reports
1. **Report 1 — Event Executive Summary (`/reports/event_executive?event_id=X`):** High-level briefing on participant count, categories, and winners.
2. **Report 2 — Official Participant Directory (`/reports/participants?event_id=X`):** Participant rosters with USNs, departments, and registration IDs.
3. **Report 3 — Team Allocation & Project Matrix (`/reports/teams?event_id=X`):** Team rosters, members, and project statements.
4. **Report 4 — Official Attendance Register (`/reports/attendance?event_id=X`):** Shortlisted participants with Present/Absent/Excused statuses.
5. **Report 5 — Volunteer Applications Dossier (`/reports/volunteer_applications?event_id=X`):** Volunteer applicant skills and areas.
6. **Report 6 — Volunteer Duty Allocation Ledger (`/reports/volunteer_allocations?event_id=X`):** Officially assigned responsibilities and desk allocations.
7. **Report 7 — Winners Podium & Recognition Docket (`/reports/winners?event_id=X`):** Ranked winners, cash prizes, and medal allocations.
8. **Report 8 — Volunteer Duty Completion Register (`/reports/volunteer_completion?event_id=X`):** Verified duties completed by student volunteers without hourly counts.
9. **Report 9 — Consolidated Event Ledger (`/reports/event_summary?event_id=X`):** Complete end-to-end event dossier.

### Department & Academic Reports
10. **Report 10 — Department Semester Event Register (`/reports/semester_register`):** Semester-wise event participation counts.
11. **Report 11 — Class Section Event Register (`/reports/section_register`):** Section-level student event involvement.
12. **Report 12 — Department Student Internship Master Ledger (`/reports/internships`):** All student internship filings.
13. **Report 13 — Verified Internship Docket (`/reports/verified_internships`):** Class Teacher-verified internships with evidence inspection flag.
14. **Report 14 — External Technical Event Submissions (`/reports/external_events`):** External symposium, competition, and paper presentations.
15. **Report 15 — External Technical Event Verification Register (`/reports/external_verification`):** Class Teacher verified external events.
16. **Report 16 — Comprehensive Academic Activity Extract (`/reports/comprehensive_extract`):** Consolidated departmental audit extract.

