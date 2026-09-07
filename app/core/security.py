from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_media_token(user_id: int, expires_delta: timedelta = timedelta(minutes=10)) -> str:
    """
    Короткоживущий токен для URL, которые нельзя защитить заголовком
    Authorization (<img src>, window.open, WebSocket) — там токен
    неизбежно попадает в адрес и оседает в логах сервера/прокси, истории
    браузера, заголовке Referer. scope="media" делает такой токен
    непригодным для обычных вызовов API (см. get_current_user), поэтому
    его утечка не даёт полноценного доступа к аккаунту, а короткий TTL
    ограничивает и окно действия самого токена.
    """
    to_encode = {
        "sub": str(user_id),
        "scope": "media",
        "exp": datetime.utcnow() + expires_delta,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None