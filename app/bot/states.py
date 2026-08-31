# app/bot/states.py
from aiogram.fsm.state import State, StatesGroup

class TaskCreation(StatesGroup):
    waiting_for_title = State()
    waiting_for_description = State()
    waiting_for_style = State()
    waiting_for_references = State()
    waiting_for_confirmation = State()

class TaskEditing(StatesGroup):
    waiting_for_new_title = State()
    waiting_for_new_description = State()
    waiting_for_new_style = State()
    waiting_for_new_references = State()