from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton


def get_main_keyboard(role):
    """Главное меню в зависимости от роли"""
    keyboard = [
        [KeyboardButton(text="📝 Создать задачу")],
        [KeyboardButton(text="📋 Мои задачи")],
        [KeyboardButton(text="ℹ️ Помощь")],
    ]

    if role in ["designer", "admin"]:
        keyboard.insert(1, [KeyboardButton(text="📋 Все задачи")])

    keyboard.append([KeyboardButton(text="❌ Отменить")])

    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True,
        input_field_placeholder="Выберите действие..."
    )


def get_create_task_keyboard():
    """Клавиатура для создания задачи с кнопкой 'Пропустить'"""
    keyboard = [
        [KeyboardButton(text="⏭️ Пропустить")],
        [KeyboardButton(text="❌ Отменить")]
    ]
    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True
    )


def get_task_keyboard():
    """Клавиатура для списка задач"""
    keyboard = [
        [KeyboardButton(text="📋 Мои задачи")],
        [KeyboardButton(text="🔄 Обновить")],
        [KeyboardButton(text="❌ Отменить")]
    ]
    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True
    )


def get_task_detail_keyboard(task_id, role):
    """Клавиатура для деталей задачи"""
    buttons = []

    if role in ["designer", "admin"]:
        buttons.append([
            InlineKeyboardButton(text="🆕 Новая", callback_data=f"status_{task_id}_new"),
            InlineKeyboardButton(text="💬 Уточнение", callback_data=f"status_{task_id}_clarification")
        ])
        buttons.append([
            InlineKeyboardButton(text="✅ Готово", callback_data=f"status_{task_id}_ready_for_review"),
            InlineKeyboardButton(text="🔄 В работе", callback_data=f"status_{task_id}_in_progress")
        ])
        if role == "admin":
            buttons.append([
                InlineKeyboardButton(text="✔️ Завершено", callback_data=f"status_{task_id}_completed"),
                InlineKeyboardButton(text="❌ Отклонено", callback_data=f"status_{task_id}_rejected")
            ])

    buttons.append([InlineKeyboardButton(text="📋 К списку задач", callback_data="back_to_tasks")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_confirm_keyboard():
    """Клавиатура для подтверждения действия"""
    keyboard = [
        [KeyboardButton(text="✅ Да, подтверждаю")],
        [KeyboardButton(text="❌ Нет, отмена")]
    ]
    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True
    )