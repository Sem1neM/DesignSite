from fastapi import WebSocket, WebSocketDisconnect, status, APIRouter
import asyncio
import json
import logging

from app.core.database import SessionLocal
from app.models.user import User
from app.models.task import Task
from app.models.message import ChatMessage, MessageSender
from app.core.security import decode_token
from app.services.agent import process_user_message_sync

logger = logging.getLogger(__name__)

ws_router = APIRouter()

ROLE_TO_SENDER = {
    "client": MessageSender.CLIENT,
    "designer": MessageSender.DESIGNER,
    "admin": MessageSender.ADMIN,
}


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, task_id: int):
        await websocket.accept()
        self.active_connections.setdefault(task_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, task_id: int):
        if task_id in self.active_connections:
            if websocket in self.active_connections[task_id]:
                self.active_connections[task_id].remove(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]

    async def broadcast(self, task_id: int, message: dict):
        for connection in list(self.active_connections.get(task_id, [])):
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


async def get_user_from_token(token: str) -> User | None:
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    db = SessionLocal()
    try:
        return db.query(User).filter(User.id == int(user_id)).first()
    finally:
        db.close()


def _message_payload(msg: ChatMessage) -> dict:
    return {
        "type": "message",
        "id": msg.id,
        "sender": msg.sender.value,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


@ws_router.websocket("/ws/{task_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    task_id: int,
):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        # Доступ к чату задачи: её клиент, назначенный/любой дизайнер, админ.
        if user.role == "client" and task.client_id != user.id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    finally:
        db.close()

    sender_type = ROLE_TO_SENDER.get(user.role.value)
    if sender_type is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, task_id)

    db = SessionLocal()
    try:
        messages = db.query(ChatMessage).filter(ChatMessage.task_id == task_id).order_by(ChatMessage.created_at).all()
        for msg in messages:
            await websocket.send_json({**_message_payload(msg), "type": "history"})
    finally:
        db.close()

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg_data = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "content": "Invalid JSON format"})
                continue

            content = (msg_data.get("content") or "").strip()
            if not content:
                continue
            if len(content) > 4000:
                await websocket.send_json({"type": "error", "content": "Сообщение слишком длинное"})
                continue

            db = SessionLocal()
            try:
                new_msg = ChatMessage(
                    task_id=task_id,
                    sender=sender_type,
                    content=content,
                )
                db.add(new_msg)
                db.commit()
                db.refresh(new_msg)

                await manager.broadcast(task_id, _message_payload(new_msg))

                # ИИ-агент отвечает только на сообщения клиента (как в Telegram-боте)
                if sender_type == MessageSender.CLIENT:
                    try:
                        reply = await asyncio.to_thread(process_user_message_sync, task_id, db)
                    except Exception as e:
                        logger.error(f"Agent error in ws chat: {e}")
                        reply = None
                    if reply:
                        agent_msg = (
                            db.query(ChatMessage)
                            .filter(ChatMessage.task_id == task_id, ChatMessage.sender == MessageSender.AGENT)
                            .order_by(ChatMessage.created_at.desc())
                            .first()
                        )
                        if agent_msg:
                            await manager.broadcast(task_id, _message_payload(agent_msg))
            finally:
                db.close()

    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)
