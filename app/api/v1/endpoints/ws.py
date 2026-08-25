from fastapi import WebSocket, WebSocketDisconnect, status, APIRouter
from sqlalchemy.orm import Session
import json
import threading
from app.core.database import SessionLocal
from app.models.user import User
from app.models.task import Task
from app.models.message import ChatMessage, MessageSender
from app.core.security import decode_token

ws_router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, task_id: int):
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = []
        self.active_connections[task_id].append(websocket)

    def disconnect(self, websocket: WebSocket, task_id: int):
        if task_id in self.active_connections:
            self.active_connections[task_id].remove(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]

    async def send_message(self, task_id: int, message: dict):
        if task_id in self.active_connections:
            for connection in self.active_connections[task_id]:
                try:
                    await connection.send_json(message)
                except:
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
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    finally:
        db.close()

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
        if user.role != "admin" and task.client_id != user.id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    finally:
        db.close()

    await manager.connect(websocket, task_id)

    # Отправляем историю сообщений
    db = SessionLocal()
    try:
        messages = db.query(ChatMessage).filter(ChatMessage.task_id == task_id).order_by(ChatMessage.created_at).all()
        for msg in messages:
            await websocket.send_json({
                "type": "history",
                "id": msg.id,
                "sender": msg.sender.value,
                "content": msg.content,
                "created_at": msg.created_at.isoformat()
            })
    finally:
        db.close()

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg_data = json.loads(data)
                content = msg_data.get("content", "").strip()
                if not content:
                    continue

                # Сохраняем сообщение клиента
                db = SessionLocal()
                try:
                    new_msg = ChatMessage(
                        task_id=task_id,
                        sender=MessageSender.CLIENT,
                        content=content
                    )
                    db.add(new_msg)
                    db.commit()
                    db.refresh(new_msg)
                finally:
                    db.close()

                # Отправляем подтверждение
                await websocket.send_json({
                    "type": "message",
                    "id": new_msg.id,
                    "sender": "client",
                    "content": content,
                    "created_at": new_msg.created_at.isoformat()
                })

                # Простой ответ (заглушка для ИИ-агента)
                await websocket.send_json({
                    "type": "message",
                    "sender": "agent",
                    "content": "Спасибо за ваше сообщение! ИИ-агент будет подключён в ближайшее время.",
                    "created_at": new_msg.created_at.isoformat()
                })

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "content": "Invalid JSON format"
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)