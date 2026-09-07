from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserLogin, Token, UserOut
from app.core.config import settings
from app.api.v1.dependencies import get_current_user  # <-- ДОБАВИТЬ ЭТОТ ИМПОРТ
from app.core.rate_limit import rate_limit

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Настройка OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


@router.post("/register", response_model=Token, dependencies=[Depends(rate_limit(5, 3600))])
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Регистрация нового пользователя
    """
    # Проверка существующего пользователя
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Создание пользователя.
    # Роль назначается ТОЛЬКО как CLIENT — значение role из запроса
    # игнорируется, иначе любой мог бы зарегистрироваться администратором.
    # Повышение роли (designer/admin) — отдельная операция для админа.
    hashed_password = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role=UserRole.CLIENT
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Создание токена
    access_token = create_access_token(
        data={"sub": str(new_user.id), "role": new_user.role.value}
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token, dependencies=[Depends(rate_limit(10, 60))])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Вход в систему. Используйте email как username.
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Проверяем, активен ли пользователь
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Получить информацию о текущем пользователе
    """
    return current_user


from datetime import datetime, timedelta
import secrets
from app.models.password_reset import PasswordResetToken
from app.core.security import hash_password


@router.post("/forgot-password", dependencies=[Depends(rate_limit(5, 3600))])
def forgot_password(email: str, db: Session = Depends(get_db)):
    """
    Запрос на восстановление пароля.
    Отправляет ссылку для сброса на email (в лог).
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Не раскрываем, существует ли пользователь
        return {"message": "Если email зарегистрирован, вы получите ссылку для сброса пароля"}

    # Удаляем старые неиспользованные токены
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at < datetime.utcnow()
    ).delete()

    # Создаём новый токен
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()

    # В реальном проекте здесь отправка email
    reset_link = f"http://localhost:8000/reset-password?token={token}"
    print(f"🔐 Ссылка для сброса пароля: {reset_link}")

    return {"message": "Если email зарегистрирован, вы получите ссылку для сброса пароля"}


@router.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    """
    Сброс пароля по токену.
    """
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительный или просроченный токен"
        )

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь не найден"
        )

    # Обновляем пароль
    user.hashed_password = hash_password(new_password)
    reset_token.used = True
    db.commit()

    return {"message": "Пароль успешно изменён"}