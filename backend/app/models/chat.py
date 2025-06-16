from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from ..core.database import Base
from datetime import datetime
from .user import User  # Import User from user.py

class Message(BaseModel):
    role: Literal["user", "assistant", "system"] = "user"
    content: str
    id: Optional[str] = None
    
class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "meta-llama/llama-3.3-8b-instruct:free"
    stream: bool = True
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    
class ChatResponse(BaseModel):
    id: str
    model: str
    object: str = "chat.completion"
    created: int
    choices: List[Dict[str, Any]]

class StreamingChunk(BaseModel):
    id: str
    model: str
    object: str = "chat.completion.chunk"
    created: int
    choices: List[Dict[str, Any]] 

# SQLAlchemy models for database
class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    model_used = Column(String, default="gpt-3.5-turbo")
    messages = relationship("MessageDB", back_populates="chat", cascade="all, delete-orphan")
    user = relationship("User", back_populates="chats")

class MessageDB(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"))
    role = Column(String)  # 'user' or 'assistant'
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    regeneration_id = Column(String, nullable=True)  # ID to group regenerations of the same message
    model = Column(String, nullable=True)  # Track model used for each message
    chat = relationship("Chat", back_populates="messages") 