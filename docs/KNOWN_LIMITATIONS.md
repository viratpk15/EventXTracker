# EventXTracker — Known Limitations & System Boundaries
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Document Storage
- In the local development environment, file uploads are saved to disk under `./uploads/`. For production deployments with multiple server nodes, `UPLOAD_DIR` should point to a shared network file system (NFS) or institutional S3-compatible object storage (e.g. MinIO).

## 2. Real-Time Transport
- The notifications system currently uses database persistence with reactive polling on navigation and manual refresh actions. A WebSocket or SSE (Server-Sent Events) push channel can be introduced in a future update if instant push delivery is required without polling.

## 3. Scope Exclusions (By Design)
- The platform explicitly excludes shift scheduling, volunteer hours calculation, and QR code check-ins. This is an intentional institutional decision by VVCE design governance.

