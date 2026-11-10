# EventXTracker — Security Architecture & Hardening Manual
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Authentication & Cryptography
- **Password Hashing:** Argon2id via `passlib.context.CryptContext(schemes=["argon2"])` with adaptive memory and iteration costs.
- **Token Signing:** HMAC-SHA256 (`HS256`) with a 48-byte URL-safe cryptographic random secret.
- **Token Expiration:** Access tokens expire after 60 minutes (`ACCESS_TOKEN_MINUTES=60`). Refresh tokens expire after 7 days (`REFRESH_TOKEN_DAYS=7`).
- **Secret Separation:** `SECRET_KEY` and `BOOTSTRAP_SECRET` are strictly separated. The bootstrap secret is never included in JWT claims or frontend bundles.

---

## 2. Authorization & Scoping Defenses
- **Portals Isolation:** Authority login route rejects student/faculty tokens; standard login route rejects Authority accounts with HTTP 403.
- **In-Depth IDOR Mitigation:** All object-level queries verify ownership and organizational scoping (`visible_records` for Model B; department check for Model A).
- **Public Signup Prevention:** Public self-registration endpoints are eliminated (`/auth/signup` $\rightarrow$ 404).

---

## 3. Data Protection & File Security
- **Upload Validation:** Uploaded documents are verified for file extensions and MIME types. Files are stored on disk with randomized UUID filenames to prevent path traversal (`../`) attacks.
- **Strict Git Exclusion:** `.env`, `*.db`, `seed_credentials.local.txt`, `uploads/`, `node_modules/`, and `.venv/` are excluded by repository `.gitignore`.

