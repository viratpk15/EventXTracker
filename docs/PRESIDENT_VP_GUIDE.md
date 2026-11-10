# EventXTracker — Student Event Leadership (President & VP) Manual
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Leadership Appointments
- Appointed directly by the Faculty Event Coordinator.
- Exactly 1 Student President and 1 Student Vice President per event (must be distinct individuals).
- Grants an event-specific leadership banner and workspace in `/student/dashboard` and `/events/:id`.

---

## 2. Permitted Actions
1. **Shortlisting:**
   - Review registered participants and complete teams.
   - Shortlist individual registrations (`POST /api/v1/events/{id}/shortlist-participant/{id}`).
   - Shortlist complete teams (`POST /api/v1/events/{id}/shortlist-team/{id}`).
   - Batch shortlist all eligible complete registrations (`POST /api/v1/events/{id}/shortlist/eligible-all`).
2. **Attendance Marking:**
   - Mark attendance for shortlisted participants (`PRESENT`, `ABSENT`, `EXCUSED`).
3. **Winners Podium:**
   - Record winners, position rankings (1, 2, 3), and medal/trophy achievement details (`POST /api/v1/events/{id}/winners`).
   - Multiple winners at the same position are fully supported.
4. **Volunteer Recommendations:**
   - May review applications and recommend candidates. Formal approval and duty allocation remain exclusive to the Faculty Event Coordinator.

