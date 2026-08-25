import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User
from app.models.task import Task
from app.models.message import ChatMessage, MessageSender
from app.services.agent import process_user_message_sync

bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
dp = Dispatcher()

def get_main_keyboard():
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📝 Создать задачу")],
            [KeyboardButton(text="📋 Мои задачи")],
            [KeyboardButton(text="❌ Отменить текущую задачу")]
        ],
        resize_keyboard=True
    )
    return keyboard

@dp.message(Command("start"))
async def start_cmd(message: types.Message):
    await message.answer(
        "👋 Привет! Я бот для управления дизайн-задачами.\n\n"
        "📝 Отправь текст ТЗ, и я создам задачу\n"
        "🤖 ИИ-агент задаст уточняющие вопросы\n"
        "📋 Можно посмотреть список задач\n\n"
        "Для привязки к аккаунту на сайте используйте команду /link",
        reply_markup=get_main_keyboard()
    )

@dp.message(Command("link"))
async def link_cmd(message: types.Message):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == str(message.from_user.id)).first()
        if user:
            await message.answer("✅ Ваш аккаунт уже привязан!")
            return
        await message.answer(
            "🔗 Для привязки аккаунта:\n"
            "1. Зайдите на сайт в личный кабинет\n"
            "2. В разделе 'Настройки' скопируйте код привязки\n"
            "3. Отправьте код в ответ на это сообщение"
        )
    finally:
        db.close()

@dp.message(lambda msg: msg.text == "📝 Создать задачу")
async def create_task_cmd(message: types.Message):
    await message.answer(
        "📝 Отправьте текст технического задания.\n"
        "Опишите, что нужно сделать, и я задам уточняющие вопросы."
    )

@dp.message(lambda msg: msg.text == "📋 Мои задачи")
async def list_tasks_cmd(message: types.Message):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == str(message.from_user.id)).first()
        if not user:
            await message.answer("❌ Вы не зарегистрированы. Используйте /link для привязки.")
            return

        tasks = db.query(Task).filter(Task.client_id == user.id).order_by(Task.created_at.desc()).limit(5).all()
        if not tasks:
            await message.answer("📭 У вас пока нет задач.")
            return

        response = "📋 Ваши последние задачи:\n\n"
        for task in tasks:
            response += f"#{task.id} - {task.title}\n"
            response += f"Статус: {task.status.value}\n"
            response += f"Создана: {task.created_at.strftime('%d.%m.%Y %H:%M')}\n\n"

        await message.answer(response)
    finally:
        db.close()

@dp.message(lambda msg: msg.text == "❌ Отменить текущую задачу")
async def cancel_task_cmd(message: types.Message):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == str(message.from_user.id)).first()
        if user and user.current_task_id:
            user.current_task_id = None
            db.commit()
            await message.answer("✅ Текущая задача отменена.")
        else:
            await message.answer("❌ У вас нет активной задачи.")
    finally:
        db.close()

@dp.message()
async def handle_text(message: types.Message):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == str(message.from_user.id)).first()
        if not user:
            await message.answer(
                "❌ Вы не зарегистрированы.\n"
                "Используйте /link для привязки аккаунта или зарегистрируйтесь на сайте."
            )
            return

        # Если есть активная задача
        if user.current_task_id:
            task_id = user.current_task_id
            task = db.query(Task).filter(Task.id == task_id).first()
            if not task:
                user.current_task_id = None
                db.commit()
                await message.answer("⚠️ Задача не найдена. Создайте новую.")
                return

            new_msg = ChatMessage(
                task_id=task_id,
                sender=MessageSender.client,
                content=message.text
            )
            db.add(new_msg)
            db.commit()
            db.refresh(new_msg)

            await message.answer("⏳ Думаю...")

            reply = process_user_message_sync(task_id, db)
            if reply:
                await message.answer(f"🤖 {reply}")

            task = db.query(Task).filter(Task.id == task_id).first()
            if task.status == "ready_for_review":
                await message.answer("✅ Отлично! ТЗ уточнено и готово к передаче дизайнеру.")
                user.current_task_id = None
                db.commit()

        else:
            # Создаём новую задачу
            new_task = Task(
                title=f"TG-задача от {user.full_name}",
                description=message.text,
                client_id=user.id,
                status="clarification"
            )
            db.add(new_task)
            db.commit()
            db.refresh(new_task)

            user.current_task_id = new_task.id
            db.commit()

            await message.answer(f"✅ Задача #{new_task.id} создана! Я задам уточняющие вопросы.")

            reply = process_user_message_sync(new_task.id, db)
            if reply:
                await message.answer(f"🤖 {reply}")

    except Exception as e:
        logging.error(f"Error in handle_text: {e}")
        await message.answer("❌ Произошла ошибка. Попробуйте позже.")
    finally:
        db.close()

async def start_bot():
    logging.basicConfig(level=logging.INFO)
    await dp.start_polling(bot)