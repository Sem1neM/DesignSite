from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton


def get_main_keyboard(role):
    """Главное меню в зависимости от роли"""
    keyboard = [
        [KeyboardButton(text="📝 Создать задачу")],
        [KeyboardButton(text="📋 Мои задачи")],
        [KeyboardButton(text="ℹ️ Помощь")],
    ]

    # Для дизайнеров и админов добавляем кнопку просмотра всех задач
    if role in ["designer", "admin"]:
        keyboard.insert(1, [KeyboardButton(text="📋 Все задачи")])

    keyboard.append([KeyboardButton(text="❌ Отменить")])

    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True,
        input_field_placeholder="Выберите действие..."
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

    # Кнопки для изменения статуса (для дизайнеров и админов)
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

    # Общие кнопки
    buttons.append([InlineKeyboardButton(text="📋 К списку задач", callback_data="back_to_tasks")])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_task_status_keyboard(task_id):
    """Клавиатура для изменения статуса"""
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🆕 Новая", callback_data=f"status_{task_id}_new"),
            InlineKeyboardButton(text="💬 Уточнение", callback_data=f"status_{task_id}_clarification")
        ],
        [
            InlineKeyboardButton(text="✅ Готово", callback_data=f"status_{task_id}_ready_for_review"),
            InlineKeyboardButton(text="🔄 В работе", callback_data=f"status_{task_id}_in_progress")
        ],
        [
            InlineKeyboardButton(text="✔️ Завершено", callback_data=f"status_{task_id}_completed"),
            InlineKeyboardButton(text="❌ Отклонено", callback_data=f"status_{task_id}_rejected")
        ],
        [
            InlineKeyboardButton(text="🔙 Назад", callback_data=f"task_{task_id}")
        ]
    ])
    return keyboard


def get_back_keyboard():
    """Клавиатура с кнопкой 'Назад'"""
    keyboard = [
        [KeyboardButton(text="🔙 Назад")],
        [KeyboardButton(text="❌ Отменить")]
    ]
    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True
    )


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