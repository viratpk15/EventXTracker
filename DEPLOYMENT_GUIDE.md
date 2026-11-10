# 🚀 EventXTracker Production Deployment Guide

This guide provides step-by-step instructions to deploy **EventXTracker** to production with:
- **Backend API**: [Render](https://render.com) (FastAPI + Python 3.12 + Uvicorn/Gunicorn + SQLite / PostgreSQL)
- **Frontend SPA**: [Vercel](https://vercel.com) (Vite + React 19 + TypeScript + Tailwind CSS)

---

## 🏗️ 1. Deploying the Backend on Render

### Method A: One-Click Render Blueprint (Recommended)
1. Push this repository to GitHub or GitLab.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Select your `eventxtracker` repository.
5. Render will detect [`render.yaml`](./render.yaml) automatically:
   - **Service Name**: `eventxtracker-backend`
   - **Runtime**: Python 3.12
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
6. Click **Apply**.
7. Once deployed, copy your backend URL: e.g. `https://eventxtracker-backend.onrender.com`.

---

### Method B: Manual Web Service Setup
If creating a Web Service manually without Blueprints:
1. In Render, click **New +** → **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Name**: `eventxtracker-backend`
   - **Region**: Oregon (or your preferred region)
   - **Branch**: `main`
   - **Root Directory**: `backend` (or leave blank if using root `Procfile`)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Add **Environment Variables**:
   | Variable | Value | Notes |
   |---|---|---|
   | `PYTHON_VERSION` | `3.12.0` | Recommended |
   | `SECRET_KEY` | *(Click "Generate")* | Min 32 chars |
   | `BOOTSTRAP_SECRET` | *(Click "Generate")* | Protects initial Authority creation |
   | `DATABASE_URL` | `sqlite:///./eventxtracker.db` | Or Render PostgreSQL internal URL |
   | `CORS_ORIGINS` | `https://*.vercel.app,http://localhost:5173` | Allows Vercel frontend |
   | `APP_TIMEZONE` | `Asia/Kolkata` | Institutional timezone |
   | `UPLOAD_DIR` | `./uploads` | Safe file uploads |
5. Click **Create Web Service**.

---

## ⚡ 2. Deploying the Frontend on Vercel

1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your `eventxtracker` repository.
4. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and choose `frontend` (or leave `./` since root [`vercel.json`](./vercel.json) handles both!).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. In **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_BASE_URL` | `https://your-backend-app.onrender.com/api/v1` | **Your live Render backend URL** |
6. Click **Deploy**.
7. Your application will be live at `https://your-app.vercel.app`!

> [!NOTE]
> [`vercel.json`](./frontend/vercel.json) has been configured with SPA rewrites (`"source": "/(.*)", "destination": "/index.html"`) so deep route refreshes like `/faculty/events/1/form-builder` will never return 404.

---

## 🔐 3. Initial Production Bootstrap

Once both backend and frontend are live:

### Step 1: Bootstrap the Primary Authority Account
Run this one-time command from your local terminal (or via curl) against your live Render backend:

```bash
curl -X POST https://your-backend-app.onrender.com/api/v1/bootstrap/authority \
  -H "Content-Type: application/json" \
  -d '{
    "email": "authority@vvce.ac.in",
    "password": "AuthoritySuperSecure123!",
    "bootstrap_secret": "YOUR_BOOTSTRAP_SECRET_FROM_RENDER"
  }'
```
Response:
```json
{"ok": true, "authority_id": 1}
```

### Step 2: Sign In & Populate Campus Users
1. Open your Vercel frontend: `https://your-app.vercel.app/authority/login`.
2. Sign in with `authority@vvce.ac.in` and your chosen password.
3. Use the **Bulk Import** tab to upload students and faculty rosters via CSV, or provision accounts individually.
4. Create events, customize forms in the **Dynamic Form Studio**, and appoint student coordinators!

---

## 🔍 4. Production Verification Checklist

| Item | Status | Verification Check |
|---|---|---|
| Health Check | ✅ Ready | `GET /health` and `GET /api/v1/health` return `{"status": "ok"}` |
| CORS Origin | ✅ Ready | Automatically allows `https://*.vercel.app` & custom domains |
| Error Boundary | ✅ Ready | React 19 `ErrorBoundary` intercepts any client-side runtime errors |
| SPA Route Rewrites | ✅ Ready | `vercel.json` maps all client routes to `/index.html` |
| Database Normalization | ✅ Ready | Auto-normalizes Render `postgres://` to `postgresql://` |
| File Uploads | ✅ Ready | 15MB file size limit with multi-format validation |
| Universal Back Navigation | ✅ Ready | Top-left `BackButton` on all detail, builder, and sub-pages |

