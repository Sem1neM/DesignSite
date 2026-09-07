from pydantic_settings import BaseSettings
from typing import Optional
import os
import secrets
import warnings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/design_db"

    # Security
    # Ключ обязателен для боевого запуска — задаётся через переменную окружения
    # SECRET_KEY (.env). Без неё используется случайный ключ, который меняется
    # при каждом перезапуске (все выданные токены станут недействительными).
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None

    # Telegram
    TELEGRAM_BOT_TOKEN: Optional[str] = None

    # Application
    APP_NAME: str = "Design Task Manager"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # File Upload - НАСТРОЙКИ ДЛЯ ИЗОБРАЖЕНИЙ
    UPLOAD_DIR: str = "app/uploads"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 МБ
    # SVG сознательно исключён: это XML/текст, может содержать <script>,
    # а отдаётся пользователю с Content-Disposition: inline — открытая
    # дверь для stored XSS. Реальный тип файла проверяется по содержимому
    # (Pillow), а не по расширению или заголовку из запроса.
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".tif"}
    ALLOWED_MIME_TYPES: set = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/tiff"
    }

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

if not settings.SECRET_KEY:
    settings.SECRET_KEY = secrets.token_urlsafe(48)
    warnings.warn(
        "SECRET_KEY не задан в .env — сгенерирован случайный ключ для этого "
        "запуска. Все выданные JWT перестанут быть валидными после "
        "перезапуска приложения. Задайте постоянный SECRET_KEY в .env перед "
        "боевым использованием.",
        RuntimeWarning,
    )

# Создаём папку для загрузок
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)