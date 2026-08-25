from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/design_db"

    # Security
    SECRET_KEY: str = "your-super-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None

    # Telegram
    TELEGRAM_BOT_TOKEN: Optional[str] = None

    # Application
    APP_NAME: str = "Design Task Manager"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # File Upload - НАСТРОЙКИ ДЛЯ ИЗОБРАЖЕНИЙ
    UPLOAD_DIR: str = "app/uploads"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 МБ
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".tif"}
    ALLOWED_MIME_TYPES: set = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "image/bmp",
        "image/tiff"
    }

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Создаём папку для загрузок
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)