import logging
from datetime import datetime
from html import escape as h
from aiogram import types
from aiogram.filters import Command
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.task import Task, TaskStatus
from app.services.notification_service import create_notification
from app.bot.keyboards import (
    get_main_keyboard,
    get_task_keyboard,
    get_task_detail_keyboard,
    get_back_keyboard,
    get_confirm_keyboard
)
from app.bot.dispatcher import bot

logger = logging.getLogger(__name__)

# Состояния пользователей
user_states = {}

# Бот работает с parse_mode=HTML (см. dispatcher.py) — любой текст
# пользователя (название/описание задачи, имя), попадающий в сообщение,
# ОБЯЗАН быть пропущен через h() (html.escape). Без этого спецсимволы
# ('<', '&' и т.п.) в тексте задачи ломают отправку сообщения ошибкой
# Telegram API "can't parse entities", а в худшем случае позволяют
# вставить произвольную HTML-разметку/ссылку в сообщение бота.


# ============================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================

def get_user_by_telegram_id(telegram_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == str(telegram_id)).first()
        return user
    finally:
        db.close()


def get_task(task_id: int):
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        return task
    finally:
        db.close()


def get_user_tasks(telegram_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == str(telegram_id)).first()
        if not user:
            return []
        tasks = db.query(Task).filter(Task.client_id == user.id).order_by(Task.created_at.desc()).all()
        return tasks
    finally:
        db.close()


def get_designer_tasks():
    db = SessionLocal()
    try:
        tasks = db.query(Task).filter(Task.status != TaskStatus.COMPLETED).order_by(Task.created_at.desc()).all()
        return tasks
    finally:
        db.close()


def get_task_status_text(status):
    status_map = {
        'NEW': '🆕 Новая',
        'CLARIFICATION': '💬 Уточнение',
        'READY_FOR_REVIEW': '✅ Готово к проверке',
        'IN_PROGRESS': '🔄 В работе',
        'COMPLETED': '✔️ Завершено',
        'REJECTED': '❌ Отклонено'
    }
    return status_map.get(status, status)


# ============================================
# КОМАНДЫ
# ============================================

LINK_INSTRUCTIONS = (
    "🔗 Привязка аккаунта\n\n"
    "1. Зайдите на сайт и войдите в личный кабинет\n"
    "2. В профиле нажмите «Привязать Telegram» — сайт покажет 6-значный код\n"
    "3. Отправьте боту: /link 123456\n\n"
    "Код действует 10 минут. Регистрация и пароль через бота не нужны —\n"
    "аккаунт создаётся только на сайте, бот лишь подключается к нему."
)


async def start_command(message: types.Message):
    user = get_user_by_telegram_id(message.from_user.id)

    if user:
        await message.answer(
            f"👋 Добро пожаловать, {h(user.full_name)}!\n\n"
            f"Аккаунт привязан: {h(user.email)}\n"
            f"Роль: {h(user.role.value)}\n\n"
            "Используйте кнопки для управления задачами:",
            reply_markup=get_main_keyboard(user.role)
        )
    else:
        await message.answer(
            "👋 Привет! Я бот для управления дизайн-задачами.\n\n"
            + LINK_INSTRUCTIONS
        )


async def help_command(message: types.Message):
    user = get_user_by_telegram_id(message.from_user.id)
    role = user.role if user else "client"

    await message.answer(
        "📚 Доступные команды:\n\n"
        "🔹 /start — главное меню\n"
        "🔹 /link {код} — привязать аккаунт с сайта\n"
        "🔹 /unlink — отвязать Telegram от аккаунта\n"
        "🔹 /create — создать задачу\n"
        "🔹 /mytasks — мои задачи\n"
        "🔹 /task {id} — детали задачи\n"
        "🔹 /status {id} {status} — изменить статус задачи\n"
        "🔹 /cancel — отменить действие\n"
        "🔹 /help — помощь\n\n"
        "Используйте кнопки для быстрой навигации!",
        reply_markup=get_main_keyboard(role)
    )


async def link_command(message: types.Message):
    already = get_user_by_telegram_id(message.from_user.id)
    if already:
        await message.answer(
            f"✅ Этот Telegram уже привязан к аккаунту {h(already.email)}.\n"
            "Чтобы привязать другой аккаунт, сначала отправьте /unlink."
        )
        return

    args = message.text.split(maxsplit=1)
    if len(args) < 2 or not args[1].strip():
        await message.answer(LINK_INSTRUCTIONS)
        return

    code = args[1].strip()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_link_code == code).first()
        if (
            not user
            or not user.telegram_link_code_expires_at
            or user.telegram_link_code_expires_at < datetime.utcnow()
        ):
            await message.answer("❌ Код недействителен или истёк. Получите новый код на сайте.")
            return

        # Этот Telegram-аккаунт мог раньше быть привязан к другому
        # пользователю сайта — переносим привязку.
        other = db.query(User).filter(User.telegram_id == str(message.from_user.id)).first()
        if other and other.id != user.id:
            other.telegram_id = None

        user.telegram_id = str(message.from_user.id)
        user.telegram_link_code = None
        user.telegram_link_code_expires_at = None
        db.commit()

        await message.answer(
            f"✅ Аккаунт {h(user.email)} привязан!\n\n"
            "Теперь можно создавать задачи и получать уведомления прямо здесь.",
            reply_markup=get_main_keyboard(user.role)
        )
    finally:
        db.close()


async def unlink_command(message: types.Message):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == str(message.from_user.id)).first()
        if not user:
            await message.answer("❌ Этот Telegram ни к чему не привязан.")
            return
        user.telegram_id = None
        db.commit()
        await message.answer(
            f"✅ Telegram отвязан от аккаунта {h(user.email)}.\n"
            + LINK_INSTRUCTIONS,
            reply_markup=types.ReplyKeyboardRemove()
        )
    finally:
        db.close()


async def create_task_command(message: types.Message):
    user = get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Аккаунт не привязан. Используйте /link для привязки (см. /help).")
        return

    if user.role != UserRole.CLIENT:
        await message.answer("❌ Только клиенты могут создавать задачи.")
        return

    user_states[message.from_user.id] = {"action": "create_task", "step": "title"}
    await message.answer(
        "📝 Создание задачи\n\n"
        "Введите название задачи:"
    )


async def my_tasks_command(message: types.Message):
    user = get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Аккаунт не привязан. Используйте /link для привязки (см. /help).")
        return

    if user.role == UserRole.CLIENT:
        tasks = get_user_tasks(message.from_user.id)
        title = "📋 Ваши задачи:"
    else:
        tasks = get_designer_tasks()
        title = "📋 Все активные задачи:"

    if not tasks:
        await message.answer("📭 У вас пока нет задач.", reply_markup=get_main_keyboard(user.role))
        return

    response = f"{title}\n\n"
    for task in tasks[:10]:
        status_text = get_task_status_text(task.status)
        response += f"🆔 #{task.id} {h(task.title)}\n"
        response += f"📊 Статус: {status_text}\n"
        response += f"📅 {task.created_at.strftime('%d.%m.%Y %H:%M')}\n\n"

    if len(tasks) > 10:
        response += f"📌 Всего задач: {len(tasks)}. Показаны последние 10."

    await message.answer(
        response,
        reply_markup=get_task_keyboard()
    )


async def task_detail_command(message: types.Message):
    user = get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Аккаунт не привязан. Используйте /link для привязки (см. /help).")
        return

    args = message.text.split()
    if len(args) < 2:
        await message.answer(
            "❌ Укажите ID задачи.\n"
            "Пример: /task 1"
        )
        return

    try:
        task_id = int(args[1])
    except ValueError:
        await message.answer("❌ ID задачи должен быть числом.")
        return

    task = get_task(task_id)
    if not task:
        await message.answer("❌ Задача не найдена.")
        return

    if user.role == UserRole.CLIENT and task.client_id != user.id:
        await message.answer("❌ У вас нет доступа к этой задаче.")
        return

    status_text = get_task_status_text(task.status)

    response = f"📋 Задача #{task.id}\n\n"
    response += f"📌 {h(task.title)}\n"
    response += f"📝 {h(task.description) or 'Нет описания'}\n\n"
    response += f"📊 Статус: {status_text}\n"
    response += f"👤 Клиент: #{task.client_id}\n"
    response += f"📅 Создана: {task.created_at.strftime('%d.%m.%Y %H:%M')}\n"
    response += f"🔄 Обновлена: {task.updated_at.strftime('%d.%m.%Y %H:%M') if task.updated_at else '—'}\n"

    if task.assigned_designer_id:
        response += f"👨‍🎨 Дизайнер: #{task.assigned_designer_id}\n"

    await message.answer(
        response,
        reply_markup=get_task_detail_keyboard(task_id, user.role)
    )


async def task_status_command(message: types.Message):
    user = get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Аккаунт не привязан. Используйте /link для привязки (см. /help).")
        return

    if user.role not in [UserRole.DESIGNER, UserRole.ADMIN]:
        await message.answer("❌ Только дизайнеры и администраторы могут менять статус.")
        return

    args = message.text.split()
    if len(args) < 3:
        await message.answer(
            "❌ Укажите ID задачи и новый статус.\n"
            "Пример: /status 1 in_progress\n\n"
            "Доступные статусы:\n"
            "• new — Новая\n"
            "• clarification — Уточнение\n"
            "• ready_for_review — Готово к проверке\n"
            "• in_progress — В работе\n"
            "• completed — Завершено\n"
            "• rejected — Отклонено"
        )
        return

    try:
        task_id = int(args[1])
    except ValueError:
        await message.answer("❌ ID задачи должен быть числом.")
        return

    status = args[2].upper()

    valid_statuses = ['NEW', 'CLARIFICATION', 'READY_FOR_REVIEW', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']
    if status not in valid_statuses:
        await message.answer(
            f"❌ Неверный статус: {status}\n\n"
            "Доступные статусы:\n"
            "• new — Новая\n"
            "• clarification — Уточнение\n"
            "• ready_for_review — Готово к проверке\n"
            "• in_progress — В работе\n"
            "• completed — Завершено\n"
            "• rejected — Отклонено"
        )
        return

    if user.role == UserRole.DESIGNER and status in ['COMPLETED', 'REJECTED']:
        await message.answer("❌ Дизайнер не может завершить или отклонить задачу.")
        return

    task = get_task(task_id)
    if not task:
        await message.answer("❌ Задача не найдена.")
        return

    db = SessionLocal()
    try:
        task.status = status
        db.commit()
        db.refresh(task)

        create_notification(
            db,
            task.client_id,
            "🔄 Статус изменён",
            f'Статус задачи "{task.title}" изменён на {get_task_status_text(status)}'
        )

        status_text = get_task_status_text(status)
        await message.answer(
            f"✅ Статус задачи #{task.id} изменён на: {status_text}"
        )
    except Exception as e:
        db.rollback()
        await message.answer(f"❌ Ошибка при обновлении статуса: {e}")
    finally:
        db.close()


async def cancel_command(message: types.Message):
    if message.from_user.id in user_states:
        del user_states[message.from_user.id]
    await message.answer("✅ Действие отменено.")


# ============================================
# ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ И КНОПОК
# ============================================

async def handle_message(message: types.Message):
    user_id = message.from_user.id

    # ============================================
    # ОБРАБОТКА ТЕКСТОВЫХ КНОПОК
    # ============================================
    if message.text == "📝 Создать задачу":
        await create_task_command(message)
        return

    if message.text == "📋 Мои задачи":
        await my_tasks_command(message)
        return

    if message.text == "📋 Все задачи":
        user = get_user_by_telegram_id(user_id)
        if not user:
            await message.answer("❌ Аккаунт не привязан. Используйте /link для привязки (см. /help).")
            return
        if user.role not in ["designer", "admin"]:
            await message.answer("❌ У вас нет доступа к этой функции.")
            return
        await my_tasks_command(message)
        return

    if message.text == "ℹ️ Помощь":
        await help_command(message)
        return

    if message.text == "❌ Отменить":
        await cancel_command(message)
        return

    if message.text == "🔙 Назад":
        user = get_user_by_telegram_id(user_id)
        role = user.role if user else "client"
        await message.answer(
            "Главное меню:",
            reply_markup=get_main_keyboard(role)
        )
        return

    # ============================================
    # ОБРАБОТКА СОСТОЯНИЙ
    # ============================================
    if user_id not in user_states:
        await message.answer(
            "Используйте команды или кнопки для управления:\n"
            "/start — главное меню\n"
            "/create — создать задачу\n"
            "/mytasks — мои задачи\n"
            "/help — помощь"
        )
        return

    state = user_states[user_id]
    action = state.get("action")
    step = state.get("step")

    # Создание задачи
    if action == "create_task":
        if step == "title":
            state["title"] = message.text
            state["step"] = "description"
            await message.answer("Введите описание задачи (или 'пропустить'):")
        elif step == "description":
            if message.text.lower() == "пропустить":
                state["description"] = ""
            else:
                state["description"] = message.text
            state["step"] = "style"
            await message.answer("Введите предпочтительный стиль (или 'пропустить'):")
        elif step == "style":
            if message.text.lower() == "пропустить":
                state["style"] = ""
            else:
                state["style"] = message.text
            state["step"] = "references"
            await message.answer("Введите ссылки на референсы через запятую (или 'пропустить'):")
        elif step == "references":
            if message.text.lower() == "пропустить":
                state["references"] = []
            else:
                state["references"] = [ref.strip() for ref in message.text.split(",") if ref.strip()]

            db = SessionLocal()
            try:
                user = db.query(User).filter(User.telegram_id == str(user_id)).first()
                if not user:
                    await message.answer("❌ Пользователь не найден.")
                    del user_states[user_id]
                    return

                task = Task(
                    title=state["title"],
                    description=state["description"],
                    preferred_style=state["style"],
                    references=state["references"],
                    client_id=user.id,
                    status=TaskStatus.NEW
                )
                db.add(task)
                db.commit()
                db.refresh(task)

                await message.answer(
                    f"✅ Задача #{task.id} создана!\n\n"
                    f"📌 {h(task.title)}\n"
                    f"📝 {h(task.description) or 'Нет описания'}\n\n"
                    f"📊 Статус: {get_task_status_text(task.status)}\n"
                    f"📅 {task.created_at.strftime('%d.%m.%Y %H:%M')}",
                    reply_markup=get_main_keyboard(user.role)
                )
                del user_states[user_id]
            except Exception as e:
                db.rollback()
                await message.answer(f"❌ Ошибка: {e}")
            finally:
                db.close()


# ============================================
# ОБРАБОТКА INLINE КНОПОК
# ============================================

async def handle_callback_query(callback_query: types.CallbackQuery):
    """Обработка нажатий на inline-кнопки"""
    data = callback_query.data
    user_id = callback_query.from_user.id

    user = get_user_by_telegram_id(user_id)
    if not user:
        await callback_query.answer("❌ Аккаунт не привязан")
        return

    await callback_query.answer()

    # Изменение статуса
    if data.startswith("status_"):
        # split(..., 2): статус вида "ready_for_review"/"in_progress" сам
        # содержит "_" — обычный split("_") резал его на части и ломал
        # эти две кнопки (всегда попадали в "Неверный статус").
        parts = data.split("_", 2)
        task_id = int(parts[1])
        status = parts[2].upper()

        if user.role not in [UserRole.DESIGNER, UserRole.ADMIN]:
            await callback_query.message.edit_text("❌ У вас нет прав на изменение статуса.")
            return

        valid_statuses = ['NEW', 'CLARIFICATION', 'READY_FOR_REVIEW', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']
        if status not in valid_statuses:
            await callback_query.message.edit_text("❌ Неверный статус.")
            return

        if user.role == UserRole.DESIGNER and status in ['COMPLETED', 'REJECTED']:
            await callback_query.message.edit_text("❌ Дизайнер не может завершить или отклонить задачу.")
            return

        task = get_task(task_id)
        if not task:
            await callback_query.message.edit_text("❌ Задача не найдена.")
            return

        db = SessionLocal()
        try:
            task.status = status
            db.commit()
            db.refresh(task)

            create_notification(
                db,
                task.client_id,
                "🔄 Статус изменён",
                f'Статус задачи "{task.title}" изменён на {get_task_status_text(status)}'
            )

            await callback_query.message.edit_text(
                f"✅ Статус задачи #{task.id} изменён на: {get_task_status_text(status)}"
            )

            # Показываем обновлённые детали
            status_text = get_task_status_text(task.status)
            response = f"📋 Задача #{task.id}\n\n"
            response += f"📌 {h(task.title)}\n"
            response += f"📝 {h(task.description) or 'Нет описания'}\n\n"
            response += f"📊 Статус: {status_text}\n"
            response += f"👤 Клиент: #{task.client_id}\n"
            response += f"📅 Создана: {task.created_at.strftime('%d.%m.%Y %H:%M')}\n"

            await bot.send_message(
                callback_query.message.chat.id,
                response,
                reply_markup=get_task_detail_keyboard(task_id, user.role)
            )

        except Exception as e:
            db.rollback()
            await callback_query.message.edit_text(f"❌ Ошибка: {e}")
        finally:
            db.close()

    # Назад к списку задач
    elif data == "back_to_tasks":
        await my_tasks_command(callback_query.message)