from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User


def create_notification(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        link: str = None
) -> Notification:
    """Создать уведомление для пользователя"""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        link=link,
        is_read=False
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def notify_task_created(db: Session, task, client):
    """Уведомление о создании задачи"""
    # Клиенту
    create_notification(
        db,
        client.id,
        "✅ Задача создана",
        f'Задача "{task.title}" успешно создана',
        f"/task-detail/{task.id}"
    )
    # Дизайнерам (всем)
    designers = db.query(User).filter(User.role == "designer").all()
    for designer in designers:
        create_notification(
            db,
            designer.id,
            "📋 Новая задача",
            f'Клиент {client.full_name} создал задачу "{task.title}"',
            f"/task-detail/{task.id}"
        )


def notify_task_updated(db: Session, task, user):
    """Уведомление об обновлении задачи"""
    # Уведомляем клиента (если обновляет не клиент)
    if user.id != task.client_id:
        create_notification(
            db,
            task.client_id,
            "✏️ Задача обновлена",
            f'Задача "{task.title}" была обновлена',
            f"/task-detail/{task.id}"
        )

    # Уведомляем дизайнеров (если обновляет клиент или админ)
    if user.role != "designer":
        designers = db.query(User).filter(User.role == "designer").all()
        for designer in designers:
            if designer.id != user.id:  # Не отправляем себе
                create_notification(
                    db,
                    designer.id,
                    "✏️ Задача обновлена",
                    f'Задача "{task.title}" была обновлена пользователем {user.full_name}',
                    f"/task-detail/{task.id}"
                )


def notify_task_status_changed(db: Session, task, old_status, new_status, user):
    """Уведомление об изменении статуса"""
    # Ключи в нижнем регистре: вызывающий код (tasks.py) передаёт
    # TaskStatus.value (например "in_progress"), а не .name — раньше
    # ключи были в верхнем регистре и .get() всегда промахивался,
    # уведомление показывало сырое значение статуса вместо подписи.
    status_labels = {
        'new': 'Новая',
        'clarification': 'Уточнение',
        'ready_for_review': 'Готово к проверке',
        'in_progress': 'В работе',
        'completed': 'Завершено',
        'rejected': 'Отклонено'
    }

    old_label = status_labels.get(old_status, old_status)
    new_label = status_labels.get(new_status, new_status)

    # Уведомляем клиента (если не клиент меняет)
    if user.id != task.client_id:
        create_notification(
            db,
            task.client_id,
            "🔄 Статус изменён",
            f'Статус задачи "{task.title}" изменён с "{old_label}" на "{new_label}"',
            f"/task-detail/{task.id}"
        )

    # Уведомляем дизайнеров (если клиент меняет статус)
    if user.role == "client":
        designers = db.query(User).filter(User.role == "designer").all()
        for designer in designers:
            create_notification(
                db,
                designer.id,
                "🔄 Статус изменён",
                f'Клиент {user.full_name} изменил статус задачи "{task.title}" на "{new_label}"',
                f"/task-detail/{task.id}"
            )