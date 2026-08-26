from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut, TaskListOut
from app.api.v1.dependencies import get_current_user, get_current_active_user
from app.services.notification_service import (
    notify_task_created,
    notify_task_updated,
    notify_task_status_changed
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
        task_data: TaskCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    """
    Создание новой задачи.
    Только клиенты могут создавать задачи.
    """
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can create tasks"
        )

    new_task = Task(
        title=task_data.title,
        description=task_data.description,
        target_audience=task_data.target_audience,
        preferred_style=task_data.preferred_style,
        references=task_data.references or [],
        deadline=task_data.deadline,
        client_id=current_user.id,
        status=TaskStatus.NEW
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # Уведомление о создании задачи
    notify_task_created(db, new_task, current_user)

    return new_task


@router.get("/", response_model=List[TaskListOut])
def list_tasks(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user),
        status_filter: Optional[TaskStatus] = Query(None, description="Фильтр по статусу"),
        skip: int = Query(0, ge=0, description="Пропустить N записей"),
        limit: int = Query(100, ge=1, le=1000, description="Лимит записей")
):
    """
    Получение списка задач с фильтрацией.
    - Клиент видит только свои задачи
    - Дизайнер видит все задачи (кроме завершённых)
    - Админ видит все задачи
    """
    query = db.query(Task)

    # Фильтр по роли
    if current_user.role == "client":
        query = query.filter(Task.client_id == current_user.id)
    elif current_user.role == "designer":
        query = query.filter(Task.status != TaskStatus.COMPLETED)
    # Админ видит все задачи (без фильтрации)

    if status_filter:
        query = query.filter(Task.status == status_filter)

    tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()

    return tasks


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
        task_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    """
    Получение детальной информации о задаче.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    if current_user.role == "client" and task.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this task"
        )

    return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
        task_id: int,
        task_data: TaskUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    """
    Обновление задачи.
    - Клиент может обновлять только свои задачи
    - Дизайнер может обновлять статус и описание
    - Админ может обновлять всё
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    is_admin = current_user.role == "admin"
    is_client = current_user.role == "client" and task.client_id == current_user.id
    is_designer = current_user.role == "designer"

    if not (is_admin or is_client or is_designer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this task"
        )

    if is_client and not is_admin:
        allowed_fields = ["title", "description", "target_audience", "preferred_style", "references", "deadline"]
        for field in task_data.dict(exclude_unset=True):
            if field not in allowed_fields:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Client cannot update field: {field}"
                )

    if is_designer and not is_admin:
        allowed_fields = ["status", "clarified_description"]
        for field in task_data.dict(exclude_unset=True):
            if field not in allowed_fields:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Designer can only update: {', '.join(allowed_fields)}"
                )

    # Проверяем, были ли изменения
    update_data = task_data.dict(exclude_unset=True)
    has_changes = bool(update_data)

    for field, value in update_data.items():
        setattr(task, field, value)

    if has_changes:
        db.commit()
        db.refresh(task)
        notify_task_updated(db, task, current_user)

    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
        task_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    """
    Удаление задачи.
    Только клиент, создавший задачу, или администратор могут удалить.
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    if current_user.role != "admin" and task.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this task"
        )

    db.delete(task)
    db.commit()


@router.post("/{task_id}/status", response_model=TaskOut)
def update_task_status(
        task_id: int,
        status: TaskStatus,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    """
    Обновление статуса задачи.
    - Клиент может только закрыть задачу (completed)
    - Дизайнер может менять статус на любые (кроме completed и rejected)
    - Админ может менять любой статус
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    is_admin = current_user.role == "admin"
    is_client = current_user.role == "client" and task.client_id == current_user.id
    is_designer = current_user.role == "designer"

    if not (is_admin or is_client or is_designer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this task status"
        )

    if is_client and not is_admin:
        if status != TaskStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Client can only set status to completed"
            )

    if is_designer and not is_admin:
        if status == TaskStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Designer cannot set status to completed. Only client can."
            )
        if status == TaskStatus.REJECTED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Designer cannot reject task. Only admin can."
            )

    old_status = task.status
    task.status = status
    db.commit()
    db.refresh(task)

    # Уведомление об изменении статуса
    notify_task_status_changed(db, task, old_status.value, status.value, current_user)

    return task