from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from contextlib import asynccontextmanager
import asyncio
import os

from app.core.database import Base, engine
from app.core.config import settings
from app.api.v1.router import router as v1_router
from app.api.v1.endpoints.ws import ws_router

# Импортируем модели
from app.models import user, task, message, image, notification

# Создаём таблицы
Base.metadata.create_all(bind=engine)

# Создаём папку для загрузок
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Импортируем бота только если есть токен
bot_task = None
if settings.TELEGRAM_BOT_TOKEN:
    from app.bot.main import main as bot_main
else:
    print("⚠️ TELEGRAM_BOT_TOKEN не задан. Бот не будет запущен.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Запускаем Telegram бота только если есть токен
    global bot_task
    if settings.TELEGRAM_BOT_TOKEN:
        print("🤖 Запуск Telegram бота...")
        bot_task = asyncio.create_task(bot_main())
    yield
    if bot_task:
        bot_task.cancel()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan
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