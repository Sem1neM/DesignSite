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

@app.middleware("http")
async def security_headers(request: Request, call_next):
    """
    Базовые security-заголовки для всех ответов.

    CSP намеренно разрешает 'unsafe-inline' для script-src/style-src:
    фронтенд активно использует инлайновые onclick="..." и style="..."
    по всему коду, и без 'unsafe-inline' приложение сразу перестанет
    работать. Даже такой CSP всё же режет самый частый следующий шаг
    после XSS — эксфильтрацию данных на чужой домен (img/script/fetch/WS
    на сторонний origin) и встраивание сайта во фрейм на другом сайте.
    Полноценная защита потребует переноса всех onclick на addEventListener
    и вынесения инлайн-стилей — заметный рефакторинг фронтенда, не
    делался в рамках этого прохода.
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"

    # /docs и /redoc (Swagger UI / ReDoc) грузят свои JS/CSS с CDN
    # (jsdelivr) — под нашим CSP они не откроются, поэтому не применяем
    # его на этих путях.
    if request.url.path not in ("/docs", "/redoc"):
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: blob:; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self' 'unsafe-inline'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
    return response


# Подключаем статические файлы
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Подключаем API
app.include_router(v1_router, prefix="/api")

# Подключаем WebSocket
app.include_router(ws_router)

# Шаблоны
templates = Jinja2Templates(directory="app/templates")


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