from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, LargeBinary
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class TaskImage(Base):
    __tablename__ = "task_images"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_data = Column(LargeBinary, nullable=False)  # бинарные данные
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    width = Column(Integer, nullable=True)  # опционально
    height = Column(Integer, nullable=True)  # опционально

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("Task", back_populates="images")

    def __repr__(self):
        return f"<TaskImage {self.id}: {self.filename} ({self.file_size} bytes)>"