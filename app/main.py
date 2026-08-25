from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.core.database import Base, engine
from app.core.config import settings
from app.api.v1.router import router as v1_router
from app.api.v1.endpoints.ws import ws_router
import os

# Импортируем модели
from app.models import user, task, message, image

# Создаём таблицы
Base.metadata.create_all(bind=engine)

# Создаём папку для загрузок
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG
)

# Подключаем статические файлы
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Подключаем API
app.include_router(v1_router, prefix="/api")

# Подключаем WebSocket
app.include_router(ws_router)

# Шаблоны
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }