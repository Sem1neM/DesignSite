from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ImageBase(BaseModel):
    filename: str
    file_size: int
    file_size_readable: Optional[str] = None
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None


class ImageOut(ImageBase):
    id: int
    url: str
    created_at: datetime

    class Config:
        from_attributes = True


class ImageUploadResponse(ImageOut):
    pass