# ADR-001 — Database Selection

## Decision
Use **SQLAlchemy ORM over a configurable `DATABASE_URL`**: SQLite for local development and
tests, **PostgreSQL recommended for production** (`postgresql+psycopg://...`). All data access
sits behind the ORM + repository-style routers; no business logic depends on a specific engine.

## Alternatives evaluated
- **PostgreSQL**: strongest fit — relational integrity for departments/semesters/sections,
  transactional team-invitation acceptance, reporting joins, mature backup tooling (pg_dump),
  institutional ownership. Chosen for production.
- **MySQL**: viable, weaker transactional/reporting ergonomics for this model.
- **Firestore**: poor fit for multi-entity transactions (concurrent invitation acceptance,
  bulk import atomicity) and complex reporting; Admin SDK bypasses security rules, so
  backend authorization would carry everything anyway.

## Data model
Normalized SQL schema in `backend/app/models.py` (users, student/faculty profiles, departments,
HOD/class-teacher assignments, events, coordinators, leadership, forms+versions, registrations,
teams+invitations, volunteers, attendance, winners, internships, external records,
notifications, audit logs, import batches, activation tokens).

## Transaction strategy
SQLAlchemy sessions with commit boundaries per use case; bulk import validates the whole file
first, then creates all rows in one transaction (all-or-nothing). Concurrent invitation
acceptance is guarded by unique constraints (`uq_team_member`, `uq_event_student_reg`).

## Backup strategy
Production: scheduled `pg_dump` + WAL archiving to VVCE-controlled storage; restore drills
documented in README.

## Hosting
Any VVCE-owned host/cloud with HTTPS; app is stateless apart from DB + upload dir.

## Migration
`DATABASE_URL` switch + SQLAlchemy schema = engine-portable; no vendor lock-in.
