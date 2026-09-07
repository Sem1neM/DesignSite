import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

# Простой rate-limit в памяти процесса: достаточно для одного инстанса
# в разработке. Для боевого деплоя с несколькими воркерами/инстансами
# нужен общий стор (например, Redis) — состояние в памяти между
# процессами не шарится.
_attempts: dict[str, deque] = defaultdict(deque)


def rate_limit(max_attempts: int, window_seconds: int):
    """Ограничивает число обращений к эндпоинту с одного IP за окно времени."""

    def dependency(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        key = f"{request.url.path}:{client_ip}"
        now = time.monotonic()
        attempts = _attempts[key]

        while attempts and attempts[0] < now - window_seconds:
            attempts.popleft()

        if len(attempts) >= max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Слишком много попыток. Попробуйте позже."
            )

        attempts.append(now)

    return dependency
