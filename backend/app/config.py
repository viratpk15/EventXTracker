"""Environment-based configuration. No real secrets here."""
import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel

# Search for .env in current directory, backend/, or parent
_base_dir = Path(__file__).resolve().parent.parent
_env_locations = [
    Path.cwd() / ".env",
    _base_dir / ".env",
    _base_dir.parent / ".env",
]
for _env_path in _env_locations:
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path)
        break


def _normalize_database_url(url: str) -> str:
    # Render and Heroku use postgres:// which SQLAlchemy 1.4+ / 2.0 requires as postgresql://
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


class Settings(BaseModel):

    DATABASE_URL: str = _normalize_database_url(os.getenv("DATABASE_URL", "sqlite:///./eventxtracker.db"))
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-only-secret-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))
    REFRESH_TOKEN_DAYS: int = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))
    AUTHORITY_MAX_ACCOUNTS: int = int(os.getenv("AUTHORITY_MAX_ACCOUNTS", "3"))
    APP_TIMEZONE: str = os.getenv("APP_TIMEZONE", "Asia/Kolkata")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    SEED_ENABLED: bool = os.getenv("SEED_ENABLED", "false").lower() == "true"


settings = Settings()
