import sys
import os

# Добавляем корневую папку в путь
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, UserRole  # Прямой импорт
from app.core.security import hash_password


def create_test_users(db: Session):
    """Создание тестовых пользователей"""
    users = [
        {
            "email": "admin@example.com",
            "password": "admin123",
            "full_name": "Admin",
            "role": UserRole.ADMIN
        },
        {
            "email": "client@example.com",
            "password": "client123",
            "full_name": "Test Client",
            "role": UserRole.CLIENT
        },
        {
            "email": "designer@example.com",
            "password": "designer123",
            "full_name": "Test Designer",
            "role": UserRole.DESIGNER
        }
    ]

    for user_data in users:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            user = User(
                email=user_data["email"],
                hashed_password=hash_password(user_data["password"]),
                full_name=user_data["full_name"],
                role=user_data["role"]
            )
            db.add(user)
            print(f"  ✅ Создан пользователь: {user_data['email']}")
        else:
            print(f"  ⏭️ Пользователь уже существует: {user_data['email']}")

    db.commit()
    print("✅ Все пользователи обработаны")


def seed_database():
    """Заполнение базы данных тестовыми данными"""
    print("🔄 Заполнение базы данных...")
    print("-" * 40)

    db = SessionLocal()
    try:
        create_test_users(db)
        print("-" * 40)
        print("✅ База данных заполнена тестовыми данными")
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()