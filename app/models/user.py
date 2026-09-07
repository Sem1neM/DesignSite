from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    CLIENT = "client"
    DESIGNER = "designer"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CLIENT)
    is_active = Column(Boolean, default=True)
    telegram_id = Column(String(100), unique=True, nullable=True)
    current_task_id = Column(Integer, nullable=True)
    # Одноразовый код для привязки Telegram-аккаунта с сайта (см.
    # POST /api/v1/auth/telegram-link-code и бот-команду /link). Пароль
    # через бот больше не запрашивается — только код с уже
    # аутентифицированной сессии на сайте.
    telegram_link_code = Column(String(16), unique=True, nullable=True, index=True)
    telegram_link_code_expires_at = Column(DateTime(timezone=True), nullable=True)
    # Добавить в класс User
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"