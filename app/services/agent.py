import logging
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.message import ChatMessage, MessageSender
from app.core.config import settings
from openai import OpenAI

# Клиент создаётся лениво: OPENAI_API_KEY опционален (ИИ-агент — не
# обязательная функция), а этот модуль импортируется при старте
# приложения (веб-чат/бот), поэтому создавать клиента на уровне модуля
# нельзя — при отсутствии ключа приложение не запустится вовсе.
_client: OpenAI | None = None


def _get_client() -> OpenAI | None:
    global _client
    if _client is None and settings.OPENAI_API_KEY:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client

async def process_user_message_async(task_id: int):
    """Асинхронная версия для BackgroundTasks"""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        process_user_message_sync(task_id, db)
        db.commit()
    except Exception as e:
        logging.error(f"Agent error: {e}")
        db.rollback()
    finally:
        db.close()

def process_user_message_sync(task_id: int, db: Session) -> str | None:
    """Синхронная версия для WebSocket и Telegram"""
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None

        messages = db.query(ChatMessage).filter(
            ChatMessage.task_id == task_id
        ).order_by(ChatMessage.created_at).all()

        if not messages or messages[-1].sender == MessageSender.AGENT:
            return None

        client = _get_client()
        if client is None:
            logging.warning("OPENAI_API_KEY не задан — ИИ-агент пропускает ответ")
            return None

        context = []
        for msg in messages:
            role = "user" if msg.sender == MessageSender.CLIENT else "assistant"
            context.append({"role": role, "content": msg.content})

        system_prompt = (
            "Ты – ИИ-помощник, который помогает клиентам уточнить техническое задание для дизайн-проекта. "
            "Твоя задача – задавать уточняющие вопросы, чтобы собрать максимум информации: "
            "целевая аудитория, стиль, цветовая гамма, ключевые сообщения, формат использования, "
            "размеры, сроки, бюджет, конкуренты, примеры удачных решений. "
            "Если ты считаешь, что информации достаточно, заверши опрос и скажи, что ТЗ уточнено. "
            "Не задавай вопросы, на которые уже были даны ответы. Будь вежливым и профессиональным."
        )

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                *context
            ],
            max_tokens=500,
            temperature=0.7
        )

        agent_reply = response.choices[0].message.content

        agent_msg = ChatMessage(
            task_id=task_id,
            sender=MessageSender.AGENT,
            content=agent_reply
        )
        db.add(agent_msg)
        db.flush()

        if any(keyword in agent_reply.lower() for keyword in ["достаточно", "уточнено", "завершаю"]):
            full_context = "\n".join([m.content for m in messages if m.sender == MessageSender.CLIENT])
            task.clarified_description = full_context + "\n\n" + agent_reply
            if task.status in ["new", "clarification"]:
                task.status = "ready_for_review"
            db.commit()

        db.commit()
        return agent_reply

    except Exception as e:
        logging.error(f"Error in process_user_message_sync: {e}")
        db.rollback()
        return None