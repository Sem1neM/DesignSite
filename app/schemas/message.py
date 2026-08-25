from pydantic import BaseModel
from app.models.message import MessageSender
from datetime import datetime


class MessageCreate(BaseModel):
    """Схема для отправки сообщения"""
    content: str


class MessageOut(BaseModel):
    """Схема для ответа"""
    id: int
    task_id: int
    sender: MessageSender
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class AgentResponse(BaseModel):
    """Схема для ответа ИИ-агента"""
    message: str
    is_complete: bool = False  # Завершил ли агент опрос
    clarified_data: dict = {}  # Уточнённые данные