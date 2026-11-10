# EventXTracker — Database Backup & Disaster Recovery Guide
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Local Development (SQLite)
- **Database Location:** `backend/eventxtracker.db`
- **Backup Command:**
  ```bash
  # Atomic backup using sqlite3 CLI
  sqlite3 backend/eventxtracker.db ".backup 'backend/backups/eventxtracker_$(date +%Y%m%d_%H%M%S).db'"
  ```
- **Restore Command:**
  ```bash
  cp backend/backups/eventxtracker_backup.db backend/eventxtracker.db
  ```

---

## 2. Production (PostgreSQL)
- **Automated Backup:**
  ```bash
  pg_dump -U vvce_admin -h localhost -Fc eventxtracker_prod > /var/backups/vvce/eventxtracker_$(date +%Y%m%d_%H%M%S).dump
  ```
- **Point-in-Time Restore:**
  ```bash
  pg_restore -U vvce_admin -h localhost -d eventxtracker_prod -c /var/backups/vvce/eventxtracker_backup.dump
  ```
- **Disaster Recovery SLA:**
  - Recovery Point Objective (RPO): < 1 hour
  - Recovery Time Objective (RTO): < 15 minutes

