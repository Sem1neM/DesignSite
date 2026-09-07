from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    # Роль сознательно не принимается при саморегистрации — назначается
    # сервером как CLIENT. Смена роли — отдельный admin-эндпоинт.


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    telegram_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None  # <-- ОПЦИОНАЛЬНО

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: int
    role: str