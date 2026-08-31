# app/bot/utils.py
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.task import Task, TaskStatus
from app.models.message import ChatMessage, MessageSender
from app.core.security import hash_password, verify_password


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_user(telegram_id: int, username: str = None, full_name: str = None) -> User:
    """Находит пользователя по telegram_id или создаёт нового (временного)"""
    db = next(get_db())
    user = db.query(User).filter(User.telegram_id == str(telegram_id)).first()
    if not user:
        # Создаём временного пользователя с ролью client
        # Позже можно будет привязать к существующему аккаунту
        user = User(
            email=f"tg_{telegram_id}@temp.com",
            hashed_password=hash_password("temp_password"),
            full_name=full_name or f"User_{telegram_id}",
            role=UserRole.CLIENT,
            telegram_id=str(telegram_id),
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def format_task_list(tasks):
    """Форматирует список задач для вывода в Telegram"""
    if not tasks:
        return "📭 У вас пока нет задач."

    status_emoji = {
        'NEW': '🆕',
        'CLARIFICATION': '💬',
        'READY_FOR_REVIEW': '✅',
        'IN_PROGRESS': '🔄',
        'COMPLETED': '✔️',
        'REJECTED': '❌'
    }

    lines = []
    for task in tasks[:10]:  # ограничим 10 задачами
        emoji = status_emoji.get(task.status, '📌')
        lines.append(f"{emoji} #{task.id} {task.title} — {task.status}")
    return "\n".join(lines)