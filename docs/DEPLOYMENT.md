# EventXTracker — Production Deployment Guide
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Production Architecture Overview
- **Hosting Infrastructure:** VVCE-managed Linux Server (Ubuntu 22.04 LTS / Debian 12).
- **Process Manager:** `systemd` managing Gunicorn + Uvicorn workers.
- **Reverse Proxy & TLS:** Nginx with Let's Encrypt / Institutional SSL certificate.
- **Database:** Dedicated PostgreSQL 15+ cluster with connection pooling.
- **Static Assets:** Built via `npm run build` and served directly by Nginx.

---

## 2. Environment Variables (.env)
```env
DATABASE_URL=postgresql+psycopg://vvce_user:SuperSecurePass@127.0.0.1:5432/eventxtracker_prod
SECRET_KEY=generate_with_openssl_rand_hex_48
BOOTSTRAP_SECRET=distinct_random_secret_never_shared
ACCESS_TOKEN_MINUTES=60
REFRESH_TOKEN_DAYS=7
AUTHORITY_MAX_ACCOUNTS=3
APP_TIMEZONE=Asia/Kolkata
CORS_ORIGINS=https://eventxtracker.vvce.ac.in
UPLOAD_DIR=/var/data/eventxtracker/uploads
SEED_ENABLED=false
```

---

## 3. Nginx Configuration
```nginx
server {
    listen 80;
    server_name eventxtracker.vvce.ac.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name eventxtracker.vvce.ac.in;

    ssl_certificate /etc/ssl/certs/vvce_eventxtracker.crt;
    ssl_certificate_key /etc/ssl/private/vvce_eventxtracker.key;

    root /var/www/eventxtracker/frontend/dist;
    index index.html;

    # Static assets with cache headers
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 4. Systemd Service (`/etc/systemd/system/eventxtracker.service`)
```ini
[Unit]
Description=EventXTracker FastAPI Backend
After=network.target postgresql.service

[Service]
User=vvce_app
WorkingDirectory=/var/www/eventxtracker/backend
ExecStart=/var/www/eventxtracker/.venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always
RestartSec=5
EnvironmentFile=/var/www/eventxtracker/backend/.env

[Install]
WantedBy=multi-user.target
```

