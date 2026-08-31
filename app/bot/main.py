import asyncio
import logging
from aiogram.filters import Command
from app.bot.dispatcher import bot, dp
from app.bot.handlers import (
    start_command,
    help_command,
    register_command,
    login_command,
    create_task_command,
    my_tasks_command,
    task_detail_command,
    task_status_command,
    cancel_command,
    handle_message,
    handle_callback_query
)
from app.core.config import settings

logger = logging.getLogger(__name__)

# Регистрация команд
dp.message.register(start_command, Command("start"))
dp.message.register(help_command, Command("help"))
dp.message.register(register_command, Command("register"))
dp.message.register(login_command, Command("login"))
dp.message.register(create_task_command, Command("create"))
dp.message.register(my_tasks_command, Command("mytasks"))
dp.message.register(task_detail_command, Command("task"))
dp.message.register(task_status_command, Command("status"))
dp.message.register(cancel_command, Command("cancel"))

# Обработка текстовых сообщений
dp.message.register(handle_message)

# Регистрация callback_query
dp.callback_query.register(handle_callback_query)


async def main():
    logger.info("🤖 Запуск Telegram бота...")
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        me = await bot.get_me()
        logger.info(f"✅ Бот успешно подключен: @{me.username} (ID: {me.id})")
        logger.info("🤖 Бот готов к работе! Ожидание сообщений...")
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"❌ Ошибка при запуске бота: {e}")
        raise