from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class TaskStatus(str, enum.Enum):
    NEW = "new"
    CLARIFICATION = "clarification"
    READY_FOR_REVIEW = "ready_for_review"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    clarified_description = Column(Text, nullable=True)
    target_audience = Column(Text, nullable=True)
    preferred_style = Column(Text, nullable=True)
    references = Column(JSON, default=list)
    deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.NEW)
    client_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_designer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    client = relationship("User", foreign_keys=[client_id], backref="created_tasks")
    designer = relationship("User", foreign_keys=[assigned_designer_id], backref="assigned_tasks")
    messages = relationship("ChatMessage", back_populates="task", cascade="all, delete-orphan")
    images = relationship("TaskImage", back_populates="task", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Task {self.id}: {self.title} ({self.status})>"