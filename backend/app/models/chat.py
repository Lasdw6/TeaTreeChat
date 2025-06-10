from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal

class Message(BaseModel):
    role: Literal["user", "assistant", "system"] = "user"
    content: str
    id: Optional[str] = None
    
class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "openai/gpt-3.5-turbo"
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