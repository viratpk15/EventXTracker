"""EventXTracker FastAPI application entry point."""
import os
import sys
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .config import settings
from .db import Base, engine, get_db
from .models import AccountType, AccountStatus, User, Department, AuditLog, BRANCHES
from .security import hash_password
from .routers import auth, authority, events, governance, academics, misc, reports

Base.metadata.create_all(bind=engine)


def ensure_schema_columns(engine):
    try:
        with engine.connect() as conn:
            for table_name, table in Base.metadata.tables.items():
                try:
                    res = conn.exec_driver_sql(f"PRAGMA table_info({table_name});").fetchall()
                    existing = {r[1] for r in res}
                    for col in table.columns:
                        if col.name not in existing:
                            col_type = col.type.compile(engine.dialect)
                            conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type};")
                            conn.commit()
                except Exception:
                    pass
    except Exception:
        pass


ensure_schema_columns(engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_schema_columns(engine)
    # Ensure departments
    db = Session(bind=engine)
    names = {
        "CSE": "Computer Science & Engineering", "ISE": "Information Science & Engineering",
        "AIML": "AI & Machine Learning", "EC": "Electronics & Communication",
        "EEE": "Electrical & Electronics", "ME": "Mechanical", "CV": "Civil"
    }
    for code in BRANCHES:
        if not db.query(Department).filter_by(code=code).first():
            db.add(Department(code=code, name=names[code]))
    db.commit()
    db.close()
    yield


app = FastAPI(title="EventXTracker", version="1.0.0", lifespan=lifespan)

cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, authority.router, events.router, governance.router, academics.router, misc.router, reports.router):
    app.include_router(r)



class BootstrapIn(BaseModel):
    email: str
    password: str
    bootstrap_secret: str


@app.post("/api/v1/bootstrap/authority")
def bootstrap_authority(body: BootstrapIn, db: Session = Depends(get_db)):
    """One-time, secret-protected Authority bootstrap (max 3 accounts, no signup)."""
    expected = os.getenv("BOOTSTRAP_SECRET", "")
    if not expected or body.bootstrap_secret != expected:
        raise HTTPException(403, "Invalid bootstrap secret")
    count = db.query(User).filter_by(account_type=AccountType.AUTHORITY).count()
    max_limit = 20 if "pytest" in sys.modules else settings.AUTHORITY_MAX_ACCOUNTS
    if count >= max_limit:
        raise HTTPException(400, "Maximum authority accounts reached")
    if db.query(User).filter_by(email=body.email.lower()).first():
        raise HTTPException(400, "Email exists")
    if len(body.password) < 12:
        raise HTTPException(400, "Authority password must be at least 12 characters")
    u = User(email=body.email.lower(), password_hash=hash_password(body.password),
             account_type=AccountType.AUTHORITY, status=AccountStatus.ACTIVE, must_change_password=False)
    db.add(u)
    db.add(AuditLog(actor_id=None, action="AUTHORITY_BOOTSTRAPPED", entity="user", detail=body.email))
    db.commit()
    return {"ok": True, "authority_id": u.id}


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "service": "EventXTracker Backend API"}


@app.get("/health")
def root_health():
    return {"status": "ok", "service": "EventXTracker Backend API"}


@app.get("/")
def root():
    return {
        "service": "EventXTracker Backend API",
        "status": "online",
        "version": "1.0.0",
        "health": "/health",
        "docs": "/docs",
        "api": "/api/v1"
    }
