from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut, TaskListOut
from app.api.v1.dependencies import get_current_user, get_current_active_user

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
    # Проверяем, что пользователь - клиент
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can create tasks"
        )

    # Создаём задачу
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
    - Дизайнер видит назначенные ему задачи
    - Админ видит все задачи
    """
    query = db.query(Task)

    # Фильтр по роли
    if current_user.role == "admin":
        # Админ видит все задачи
        pass
    elif current_user.role == "designer":
        # Дизайнер видит только назначенные ему задачи
        query = query.filter(Task.assigned_designer_id == current_user.id)
    else:  # client
        # Клиент видит только свои задачи
        query = query.filter(Task.client_id == current_user.id)

    # Фильтр по статусу
    if status_filter:
        query = query.filter(Task.status == status_filter)

    # Сортировка и пагинация
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

    # Проверка доступа
    if current_user.role != "admin":
        if current_user.role == "client" and task.client_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this task"
            )
        if current_user.role == "designer" and task.assigned_designer_id != current_user.id:
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
    - Клиент может обновлять только свои задачи (до назначения дизайнера)
    - Дизайнер может обновлять статус и добавлять комментарии
    - Админ может обновлять всё
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Проверка доступа
    is_admin = current_user.role == "admin"
    is_client = current_user.role == "client" and task.client_id == current_user.id
    is_designer = current_user.role == "designer" and task.assigned_designer_id == current_user.id

    if not (is_admin or is_client or is_designer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this task"
        )

    # Ограничения для клиента
    if is_client and not is_admin:
        # Клиент не может менять статус и назначение
        if task_data.status or task_data.assigned_designer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Client can only update description and basic fields"
            )
        # Клиент может обновлять только описание, целевую аудиторию и стиль
        allowed_fields = ["title", "description", "target_audience", "preferred_style", "references", "deadline"]
        for field in task_data.dict(exclude_unset=True):
            if field not in allowed_fields:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Client cannot update field: {field}"
                )

    # Ограничения для дизайнера
    if is_designer and not is_admin:
        # Дизайнер может менять только статус
        if any(field not in ["status", "clarified_description"] for field in task_data.dict(exclude_unset=True)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Designer can only update status and clarified description"
            )

    # Обновляем поля
    update_data = task_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

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

    # Проверка прав
    if current_user.role != "admin" and task.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this task"
        )

    db.delete(task)
    db.commit()


@router.post("/{task_id}/assign", response_model=TaskOut)
def assign_task(
        task_id: int,
        designer_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    """
    Назначение дизайнера на задачу.
    Только администратор может назначить дизайнера.
    """
    # Проверяем, что пользователь - администратор
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can assign designers"
        )

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Проверяем существование дизайнера
    designer = db.query(User).filter(
        User.id == designer_id,
        User.role == "designer"
    ).first()
    if not designer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designer not found"
        )

    # Назначаем дизайнера
    task.assigned_designer_id = designer_id
    if task.status == TaskStatus.NEW:
        task.status = TaskStatus.READY_FOR_REVIEW

    db.commit()
    db.refresh(task)

    return task


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
    - Дизайнер может менять статус на любые, кроме completed
    - Админ может менять любой статус
    """
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Проверка доступа
    is_admin = current_user.role == "admin"
    is_client = current_user.role == "client" and task.client_id == current_user.id
    is_designer = current_user.role == "designer" and task.assigned_designer_id == current_user.id

    if not (is_admin or is_client or is_designer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this task status"
        )

    # Ограничения для клиента
    if is_client and not is_admin:
        if status != TaskStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Client can only set status to completed"
            )

    # Ограничения для дизайнера
    if is_designer and not is_admin:
        if status == TaskStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Designer cannot set status to completed. Only client can."
            )

    # Обновляем статус
    task.status = status
    db.commit()
    db.refresh(task)

    return task