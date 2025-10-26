from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from ..core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Made optional for Clerk users
    api_key = Column(String, nullable=True)  # New field for storing user's API key
    external_id = Column(String, unique=True, nullable=True)  # Clerk user ID
    # NOTE: Run a migration or recreate the database after adding this field
    
    # Relationship with chats
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan") 