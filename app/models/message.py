from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class MessageSender(str, enum.Enum):
    CLIENT = "client"
    DESIGNER = "designer"
    ADMIN = "admin"
    AGENT = "agent"
    SYSTEM = "system"


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    sender = Column(Enum(MessageSender), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("Task", back_populates="messages")

    def __repr__(self):
        return f"<ChatMessage {self.id}: {self.sender}>"