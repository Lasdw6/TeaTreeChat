import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import engine, SessionLocal
from app.models.chat import Base, User, Chat, MessageDB
from datetime import datetime
from passlib.context import CryptContext

def init_db():
    # Drop all tables and recreate them
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

    # Add test data
    db = SessionLocal()
    try:
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        # Create test user
        test_user = User(
            name="Test User",
            email="test@example.com",
            hashed_password=pwd_context.hash("testpassword")
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print("Created test user")

        # Create test chat
        test_chat = Chat(
            title="Test Chat",
            user_id=test_user.id
        )
        db.add(test_chat)
        db.commit()
        db.refresh(test_chat)
        print("Created test chat")

        # Add some test messages
        messages = [
            MessageDB(
                chat_id=test_chat.id,
                role="user",
                content="Hello, this is a test message!"
            ),
            MessageDB(
                chat_id=test_chat.id,
                role="assistant",
                content="Hi! I'm the assistant. This is a test response."
            )
        ]
        db.add_all(messages)
        db.commit()
        print("Added test messages")
    except Exception as e:
        print(f"Error adding test data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db() 