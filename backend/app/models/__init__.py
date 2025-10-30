from app.core.database import Base
from app.models.user import User
from app.models.chat import Chat, MessageDB

# Import all models so SQLAlchemy can discover them
__all__ = ["Base", "User", "Chat", "MessageDB"]