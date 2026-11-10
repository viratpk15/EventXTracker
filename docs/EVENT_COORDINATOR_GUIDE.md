# EventXTracker — Faculty Event Coordinator Manual
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Role Overview
When a faculty member creates an event, they are automatically designated as the Primary Faculty Event Coordinator. Up to three additional faculty coordinators may be appointed (maximum of 4 total per event).

---

## 2. Operational Responsibilities
1. **Dynamic Form Builder:**
   - Configure registration questions (short text, long text, email, phone, number bounds, dropdowns, ratings).
   - Publish forms to create immutable version snapshots (`FormVersion`).
2. **Student Leadership Appointments:**
   - Appoint exactly 1 President, 1 Vice President, and up to 3 Student Volunteer Coordinators via `POST /api/v1/events/{id}/leadership`.
3. **Volunteer Lifecycle:**
   - Review volunteer applicants.
   - Formally approve or reject applications (`POST /volunteer-applications/{id}/approve`).
   - Allocate operational duties (`POST /volunteer-applications/{id}/allocate`).
   - Mark completion status (`POST /volunteer-applications/{id}/complete`).
   - *Note: Shifts, volunteer hours, and QR codes are excluded by design.*
4. **Attendance Oversight & PDF Exports:**
   - Monitor attendance and export all 16 official institutional A4 PDF reports.

