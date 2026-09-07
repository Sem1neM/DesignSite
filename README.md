# Design Task Manager

Задачник для дизайнеров и их клиентов: FastAPI-бэкенд, лёгкий JS-фронтенд
без сборки (ES-модули напрямую в браузере) и Telegram-бот как второй
клиент к тому же API.

## Структура проекта

```
.
├── app/
│   ├── main.py              # точка входа FastAPI (app.main:app)
│   ├── api/v1/               # HTTP API: роуты, эндпоинты, зависимости
│   ├── bot/                  # Telegram-бот (aiogram)
│   ├── core/                 # конфиг, БД, security, rate-limit
│   ├── models/                # SQLAlchemy-модели
│   ├── schemas/                # Pydantic-схемы (запросы/ответы API)
│   ├── services/                # бизнес-логика (уведомления, ИИ-агент)
│   ├── static/                  # фронтенд: css/ и js/ (ES-модули)
│   ├── templates/                # index.html, отдаётся Jinja2
│   ├── uploads/                   # загруженные файлы (не в git)
│   └── utils/seed_data.py          # тестовые пользователи для разработки
├── run.py                    # запуск: python run.py
├── requirements.txt
├── docker-compose.yml         # только Postgres (db)
└── .env.example                # шаблон .env — скопировать и заполнить
```

Всё, что относится к приложению, лежит внутри `app/`; файлы верхнего
уровня — это то, чем приложение целиком запускается и настраивается
(`run.py`, `requirements.txt`, `docker-compose.yml`, `.env`).

**Важно:** приложение и `docker-compose.yml` рассчитаны на запуск из
корня репозитория (`app.main:app` — модульный путь, `.env` ищется
относительно текущей директории).

## Быстрый старт

```bash
# 1. Зависимости
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. Конфиг
cp .env.example .env
# заполнить SECRET_KEY (python -c "import secrets; print(secrets.token_urlsafe(48))"),
# POSTGRES_PASSWORD и, по желанию, OPENAI_API_KEY / TELEGRAM_BOT_TOKEN

# 3. База данных
docker-compose up -d db

# 4. Тестовые пользователи (admin/designer/client) — опционально
python -m app.utils.seed_data

# 5. Запуск
python run.py
# http://localhost:8000, документация API — http://localhost:8000/docs
```

## Роли и доступ

- **client** — создаёт задачи, общается в чате, закрывает задачу
- **designer** — ведёт задачи, меняет статус (кроме completed/rejected)
- **admin** — полный доступ, управление ролями на `/users`

Первый admin создаётся через `python -m app.utils.seed_data` (или
напрямую в БД) — саморегистрация с ролью admin/designer запрещена
по дизайну; повышение роли — через `/users` от имени уже существующего
admin.

## Telegram-бот

Бот не создаёт отдельные аккаунты — только привязывается к уже
существующему аккаунту на сайте:

1. Задать `TELEGRAM_BOT_TOKEN` в `.env`
2. На сайте (Dashboard) получить одноразовый код привязки
3. В боте: `/link <код>`
