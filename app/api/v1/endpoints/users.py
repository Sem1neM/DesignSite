from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserOut, UserUpdate
from app.api.v1.dependencies import get_current_admin_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=List[UserOut])
def list_users(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_admin_user)
):
    """Список всех пользователей. Доступно только администратору."""
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
        user_id: int,
        user_data: UserUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_admin_user)
):
    """
    Изменение роли/данных пользователя (например, назначение designer/admin).
    Доступно только администратору.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.id == current_user.id and user_data.role is not None and user_data.role != current_user.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя изменить собственную роль"
        )

    for field, value in user_data.dict(exclude_unset=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user
