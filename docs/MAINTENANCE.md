# EventXTracker — Operational Maintenance Manual
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Routine Maintenance Tasks
1. **Log Rotation:** Rotate Uvicorn access logs and systemd journal logs weekly to preserve disk space.
2. **Audit Log Archival:** Audit records older than 365 days can be archived using `pg_dump` with an active date filter.
3. **Database Index Optimization:** Run `VACUUM ANALYZE` on PostgreSQL monthly to maintain query planner performance on `users`, `events`, `registrations`, and `audit_logs`.

---

## 2. Academic Year Rollover
1. At the conclusion of an academic year (e.g. July 2026), the Authority administrator assigns new Class Teachers for the incoming academic year via `/authority/departments`.
2. Existing Class Teacher records remain in `class_teacher_assignments` with `active=False` and preserved `revoked_at` timestamps for historical accreditation reporting (NBA/NAAC).
3. Student semester promotions (e.g. Sem 5 to Sem 6) can be updated via bulk CSV import or individual profile patches.

