from pydantic import BaseModel, Field
from app.models.task import TaskStatus
from datetime import datetime
from typing import Optional, List


class TaskCreate(BaseModel):
    """Схема для создания задачи"""
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    target_audience: Optional[str] = None
    preferred_style: Optional[str] = None
    references: List[str] = []
    deadline: Optional[datetime] = None


class TaskUpdate(BaseModel):
    """Схема для обновления задачи"""
    title: Optional[str] = None
    description: Optional[str] = None
    clarified_description: Optional[str] = None
    target_audience: Optional[str] = None
    preferred_style: Optional[str] = None
    references: Optional[List[str]] = None
    deadline: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    assigned_designer_id: Optional[int] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    clarified_description: Optional[str]
    target_audience: Optional[str]
    preferred_style: Optional[str]
    references: List[str]
    deadline: Optional[datetime]
    status: TaskStatus
    client_id: int
    assigned_designer_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime] = None  # <-- ОПЦИОНАЛЬНО

    class Config:
        from_attributes = True


class TaskListOut(BaseModel):
    id: int
    title: str
    status: TaskStatus
    client_id: int
    assigned_designer_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime] = None  # <-- СДЕЛАЛИ ОПЦИОНАЛЬНЫМ

    class Config:
        from_attributes = True