from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
import os
from datetime import datetime
from PIL import Image
import io
from typing import Optional, List

from app.core.database import get_db
from app.core.config import settings
from app.models.task import Task
from app.models.image import TaskImage
from app.models.user import User
from app.api.v1.dependencies import get_current_user, get_current_active_user
from app.core.security import decode_token
from app.schemas.image import ImageOut, ImageUploadResponse

router = APIRouter(prefix="/images", tags=["Images"])


def format_file_size(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    elif size < 1024 * 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} MB"
    else:
        return f"{size / (1024 * 1024 * 1024):.2f} GB"


def validate_file(file: UploadFile) -> tuple[str, str, bytes, dict]:
    content = file.file.read()
    file.file.seek(0)

    size = len(content)

    if size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл слишком большой. Максимальный размер: {settings.MAX_FILE_SIZE // (1024 * 1024)} МБ."
        )

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Тип файла не поддерживается. Разрешённые форматы: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    content_type = file.content_type or "image/unknown"

    width = None
    height = None
    try:
        if content_type.startswith('image/') and content_type != 'image/svg+xml':
            img = Image.open(io.BytesIO(content))
            width, height = img.size
    except Exception:
        pass

    return ext, content_type, content, {"width": width, "height": height}


@router.post("/upload/{task_id}", response_model=ImageUploadResponse)
async def upload_image(
        task_id: int,
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача не найдена"
        )

    if current_user.role != "admin" and task.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет доступа к этой задаче"
        )

    ext, content_type, file_data, dimensions = validate_file(file)

    image = TaskImage(
        task_id=task_id,
        filename=file.filename,
        file_data=file_data,
        file_size=len(file_data),
        mime_type=content_type,
        width=dimensions.get("width"),
        height=dimensions.get("height")
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    size_readable = format_file_size(image.file_size)

    return ImageUploadResponse(
        id=image.id,
        filename=image.filename,
        url=f"/api/v1/images/{image.id}",
        file_size=image.file_size,
        file_size_readable=size_readable,
        mime_type=image.mime_type,
        width=image.width,
        height=image.height,
        created_at=image.created_at
    )


@router.get("/task/{task_id}", response_model=List[ImageOut])
async def get_task_images(
        task_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # ТОЛЬКО КЛИЕНТ НЕ ВИДИТ ЧУЖИЕ ИЗОБРАЖЕНИЯ
    if current_user.role == "client" and task.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this task"
        )

    images = db.query(TaskImage).filter(TaskImage.task_id == task_id).order_by(TaskImage.created_at.desc()).all()

    result = []
    for img in images:
        result.append(ImageOut(
            id=img.id,
            filename=img.filename,
            url=f"/api/v1/images/{img.id}",
            file_size=img.file_size,
            file_size_readable=format_file_size(img.file_size),
            mime_type=img.mime_type,
            width=img.width,
            height=img.height,
            created_at=img.created_at
        ))

    return result


@router.get("/{image_id}")
async def get_image(
        image_id: int,
        token: Optional[str] = Query(None),
        db: Session = Depends(get_db)
):
    current_user = None

    if token:
        payload = decode_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                current_user = db.query(User).filter(User.id == int(user_id)).first()

    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    image = db.query(TaskImage).filter(TaskImage.id == image_id).first()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    task = db.query(Task).filter(Task.id == image.task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # ============================================
    # ИСПРАВЛЕНИЕ: Дизайнер и админ видят все изображения
    # ============================================
    if current_user.role == "client" and task.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this image"
        )

    encoded_filename = quote(image.filename)

    return Response(
        content=image.file_data,
        media_type=image.mime_type,
        headers={
            "Content-Disposition": f"inline; filename=\"{encoded_filename}\"; filename*=UTF-8''{encoded_filename}",
            "Content-Length": str(image.file_size)
        }
    )


@router.delete("/{image_id}")
async def delete_image(
        image_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    image = db.query(TaskImage).filter(TaskImage.id == image_id).first()
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    task = db.query(Task).filter(Task.id == image.task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    if current_user.role != "admin" and task.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this image"
        )

    db.delete(image)
    db.commit()

    return {"message": "Image deleted successfully"}


from fastapi.responses import StreamingResponse
import zipfile
import io


@router.get("/task/{task_id}/download-zip")
async def download_task_images_zip(
        task_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_active_user)
):
    """
    Скачать все изображения задачи одним ZIP-архивом
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

    images = db.query(TaskImage).filter(TaskImage.task_id == task_id).all()

    if not images:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No images found for this task"
        )

    # Создаём ZIP в памяти
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for img in images:
            # Используем имя файла, заменяя недопустимые символы
            safe_filename = "".join(c for c in img.filename if c.isalnum() or c in "._- ")
            zip_file.writestr(safe_filename, img.file_data)

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="task_{task_id}_images.zip"'
        }
    )