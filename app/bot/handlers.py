import logging
from aiogram import types
from aiogram.filters import Command
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.task import Task, TaskStatus
from app.core.security import verify_password, hash_password
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

async def start_command(message: types.Message):
    user = get_user_by_telegram_id(message.from_user.id)

    if user:
        await message.answer(
            f"👋 Добро пожаловать, {user.full_name}!\n\n"
            f"Вы уже зарегистрированы в системе.\n"
            f"Роль: {user.role}\n\n"
            "Используйте кнопки для управления задачами:",
            reply_markup=get_main_keyboard(user.role)
        )
    else:
        await message.answer(
            "👋 Привет! Я бот для управления дизайн-задачами.\n\n"
            "🔹 /register — зарегистрироваться\n"
            "🔹 /login — войти в аккаунт\n"
            "🔹 /help — помощь\n\n"
            "Для начала работы зарегистрируйтесь или войдите."
        )


async def help_command(message: types.Message):
    user = get_user_by_telegram_id(message.from_user.id)
    role = user.role if user else "client"

    await message.answer(
        "📚 Доступные команды:\n\n"
        "🔹 /start — главное меню\n"
        "🔹 /register — регистрация\n"
        "🔹 /login — вход\n"
        "🔹 /create — создать задачу\n"
        "🔹 /mytasks — мои задачи\n"
        "🔹 /task {id} — детали задачи\n"
        "🔹 /status {id} {status} — изменить статус задачи\n"
        "🔹 /cancel — отменить действие\n"
        "🔹 /help — помощь\n\n"
        "Используйте кнопки для быстрой навигации!",
        reply_markup=get_main_keyboard(role)
    )


async def register_command(message: types.Message):
    user = get_user_by_telegram_id(message.from_user.id)
    if user:
        await message.answer("✅ Вы уже зарегистрированы!")
        return

    user_states[message.from_user.id] = {"action": "register", "step": "email"}
    await message.answer(
        "📝 Регистрация\n\n"
        "Введите ваш email:"
    )


async def login_command(message: types.Message):
    user = get_user_by_telegram_id(message.from_user.id)
    if user:
        await message.answer("✅ Вы уже вошли в систему!")
        return

    user_states[message.from_user.id] = {"action": "login", "step": "email"}
    await message.answer(
        "🔑 Вход в систему\n\n"
        "Введите ваш email:"
    )


async def create_task_command(message: types.Message):
    user = get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Вы не авторизованы. Используйте /login для входа.")
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
        await message.answer("❌ Вы не авторизованы. Используйте /login для входа.")
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
        response += f"🆔 #{task.id} {task.title}\n"
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
        await message.answer("❌ Вы не авторизованы. Используйте /login для входа.")
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
    response += f"📌 {task.title}\n"
    response += f"📝 {task.description or 'Нет описания'}\n\n"
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
        await message.answer("❌ Вы не авторизованы. Используйте /login для входа.")
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
            await message.answer("❌ Вы не авторизованы. Используйте /login для входа.")
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

    # Регистрация
    if action == "register":
        if step == "email":
            state["email"] = message.text
            state["step"] = "name"
            await message.answer("Введите ваше полное имя:")
        elif step == "name":
            state["full_name"] = message.text
            state["step"] = "password"
            await message.answer("Введите пароль (минимум 6 символов):")
        elif step == "password":
            password = message.text
            if len(password) < 6:
                await message.answer("❌ Пароль должен быть минимум 6 символов. Попробуйте снова:")
                return

            db = SessionLocal()
            try:
                existing = db.query(User).filter(User.email == state["email"]).first()
                if existing:
                    await message.answer("❌ Этот email уже зарегистрирован.")
                    del user_states[user_id]
                    return

                user = User(
                    email=state["email"],
                    hashed_password=hash_password(password),
                    full_name=state["full_name"],
                    telegram_id=str(user_id),
                    role=UserRole.CLIENT
                )
                db.add(user)
                db.commit()
                db.refresh(user)

                await message.answer(
                    f"✅ Регистрация завершена!\n\n"
                    f"👤 {user.full_name}\n"
                    f"📧 {user.email}\n"
                    f"🎭 Роль: {user.role}\n\n"
                    "Теперь вы можете создавать задачи!",
                    reply_markup=get_main_keyboard(user.role)
                )
                del user_states[user_id]
            except Exception as e:
                db.rollback()
                await message.answer(f"❌ Ошибка: {e}")
            finally:
                db.close()

    # Логин
    elif action == "login":
        if step == "email":
            state["email"] = message.text
            state["step"] = "password"
            await message.answer("Введите пароль:")
        elif step == "password":
            password = message.text

            db = SessionLocal()
            try:
                user = db.query(User).filter(User.email == state["email"]).first()
                if not user or not verify_password(password, user.hashed_password):
                    await message.answer("❌ Неверный email или пароль.")
                    del user_states[user_id]
                    return

                user.telegram_id = str(user_id)
                db.commit()

                await message.answer(
                    f"✅ Вход выполнен!\n\n"
                    f"👤 {user.full_name}\n"
                    f"🎭 Роль: {user.role}\n",
                    reply_markup=get_main_keyboard(user.role)
                )
                del user_states[user_id]
            except Exception as e:
                db.rollback()
                await message.answer(f"❌ Ошибка: {e}")
            finally:
                db.close()

    # Создание задачи
    elif action == "create_task":
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
                    f"📌 {task.title}\n"
                    f"📝 {task.description or 'Нет описания'}\n\n"
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
        await callback_query.answer("❌ Вы не авторизованы")
        return

    await callback_query.answer()

    # Изменение статуса
    if data.startswith("status_"):
        parts = data.split("_")
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
            response += f"📌 {task.title}\n"
            response += f"📝 {task.description or 'Нет описания'}\n\n"
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


async def reset_password_command(message: types.Message):
    """Команда для сброса пароля — запрашивает email"""
    user = get_user_by_telegram_id(message.from_user.id)
    if not user:
        await message.answer("❌ Вы не авторизованы. Используйте /login для входа.")
        return

    # Запрашиваем email для сброса (можно сразу использовать email пользователя)
    # Но для безопасности попросим ввести email
    user_states[message.from_user.id] = {"action": "reset_password", "step": "email"}
    await message.answer(
        "🔑 Введите email, на который зарегистрирован аккаунт:"
    )