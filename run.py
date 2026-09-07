#!/usr/bin/env python
import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    print(f"🚀 Запуск {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"📍 http://localhost:8000")
    print(f"📚 Документация: http://localhost:8000/docs")
    print("-" * 50)

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )