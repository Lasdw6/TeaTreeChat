from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query, Body, Header
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import logging
import re
import os
import traceback
import sys
import shutil
import stat
import httpx
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from ...models.chat import Message, ChatRequest, ChatResponse, Chat, MessageDB, User
from ...services.openrouter import generate_chat_completion
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, DisconnectionError
from ...core.database import SessionLocal, get_db
from pydantic import BaseModel
from .user import get_current_user, get_current_user_optional
from ...models.user import User
from passlib.context import CryptContext
from cryptography.fernet import Fernet

router = APIRouter()
logger = logging.getLogger("chat_router")

# Pydantic models for request/response
class ChatCreate(BaseModel):
    title: str
    model: str = "gpt-3.5-turbo"
    # user_id is not needed; current_user is derived from auth

class MessageCreate(BaseModel):
    id: Optional[int] = None
    role: str
    content: str
    regeneration_id: Optional[str] = None
    model: str

class ChatResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    message_count: int
    last_message: str | None
    last_message_at: Optional[datetime] = None

class ChatDetail(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: List[dict]
    user: str

# Available models
# Load from models.json if available, otherwise use static list
try:
    with open('frontend/openrouter_models.json', 'r') as f:
        OPENROUTER_MODELS = json.load(f)
except Exception as e:
    logger.warning(f"Could not load openrouter_models.json: {e}")
    OPENROUTER_MODELS = []

AVAILABLE_MODELS = [
    # Best Free Models
    {
        "id": "meta-llama/llama-3.3-70b-instruct:free",
        "name": "Llama 3.3 70B - Free",
        "description": "Powerful, smart, and free. Great for most tasks."
    },
    {
        "id": "google/gemini-2.0-flash-exp:free",
        "name": "Gemini 2.0 Flash - Free",
        "description": "Extremely fast and capable. Best for quick answers."
    },
    {
        "id": "deepseek/deepseek-r1:free",
        "name": "DeepSeek R1 - Free (Reasoning)",
        "description": "Excellent at reasoning and complex logic."
    },
    {
        "id": "meta-llama/llama-3.2-3b-instruct:free",
        "name": "Llama 3.2 3B - Free (Fast)",
        "description": "Lightweight and super fast. Good for simple chats."
    },

    # Premium Models
    {
        "id": "openai/gpt-4o",
        "name": "GPT-4o",
        "description": "OpenAI's flagship model. Smartest overall."
    },
    {
        "id": "anthropic/claude-3.5-sonnet",
        "name": "Claude 3.5 Sonnet",
        "description": "Best for coding and nuanced writing."
    },
    {
        "id": "google/gemini-pro-1.5",
        "name": "Gemini 1.5 Pro",
        "description": "Great for long context and analysis."
    }
]

# Dependency for DB session
def get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

# Removed chunks logging functionality - no longer needed

class DuplicateContentTracker:
    def __init__(self):
        self.accumulated_content = ""
        self.last_chunks = []  # Store last few chunks for comparison
        self.max_chunks_to_track = 5
        self.window_size = 50  # Size of sliding window for duplicate detection
    
    def process_chunk(self, chunk_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a chunk to remove duplicate content from streaming responses"""
        if 'choices' not in chunk_data or not chunk_data['choices']:
            return chunk_data
        
        choice = chunk_data['choices'][0]
        if 'delta' not in choice or 'content' not in choice['delta'] or not choice['delta']['content']:
            return chunk_data
        
        # Get the current content
        current_content = choice['delta']['content']
        
        # Check if this is an empty or very small chunk (not worth processing)
        if len(current_content.strip()) <= 1:
            return chunk_data
        
        # Track accumulated content (use a sliding window to avoid memory issues)
        if len(self.accumulated_content) > 10000:
            # Keep only the last part of the accumulated content
            self.accumulated_content = self.accumulated_content[-5000:]
        
        # Check for exact duplicates in accumulated content
        if len(current_content) > 2 and current_content in self.accumulated_content:
            # This exact content was already sent, filter it out
            choice['delta']['content'] = ""
            logger.info(f"Filtered exact duplicate: '{current_content[:20]}...'")
            return chunk_data
        
        # Check for overlapping content with recent chunks
        for prev_chunk in self.last_chunks:
            # Look for significant overlap
            if len(prev_chunk) > 3 and len(current_content) > 3:
                # Check if the current chunk starts with the end of a previous chunk
                overlap_size = min(len(prev_chunk), len(current_content))
                for i in range(min(overlap_size, 20), 2, -1):  # Try different overlap sizes
                    if prev_chunk[-i:] == current_content[:i]:
                        # Found an overlap - remove the duplicated part
                        choice['delta']['content'] = current_content[i:]
                        logger.info(f"Removed overlapping content ({i} chars)")
                        break
        
        # Now add the processed content to our accumulated content
        self.accumulated_content += choice['delta']['content']
        
        # Update the last chunks cache
        self.last_chunks.append(current_content)
        if len(self.last_chunks) > self.max_chunks_to_track:
            self.last_chunks.pop(0)  # Remove oldest chunk
        
        return chunk_data

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fernet key for encryption (should be set in environment securely)
FERNET_KEY = os.environ.get("FERNET_KEY")
if not FERNET_KEY:
    raise RuntimeError("FERNET_KEY environment variable not set!")
fernet = Fernet(FERNET_KEY)

def decrypt_api_key(encrypted_key: str) -> str:
    return fernet.decrypt(encrypted_key.encode()).decode()

@router.post("/completions")
async def chat_completion(request: ChatRequest, current_user: User = Depends(get_current_user)):
    # Decrypt API key from DB
    if not current_user.api_key:
        raise HTTPException(status_code=400, detail="No API key set for user.")
    try:
        api_key = decrypt_api_key(current_user.api_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt API key.")
    try:
        if request.stream:
            return EventSourceResponse(
                stream_chat_completion(request, api_key),
                media_type="text/event-stream"
            )
        else:
            full_response = ""
            async for chunk in generate_chat_completion(request, api_key):
                if "choices" in chunk and chunk["choices"]:
                    if "delta" in chunk["choices"][0] and "content" in chunk["choices"][0]["delta"]:
                        full_response += chunk["choices"][0]["delta"]["content"]
                    elif "message" in chunk["choices"][0] and "content" in chunk["choices"][0]["message"]:
                        full_response = chunk["choices"][0]["message"]["content"]
            logger.info(f"Full response: {full_response}")  # Debug log
            response = {
                "id": f"chatcmpl-{int(datetime.now().timestamp())}",
                "object": "chat.completion",
                "created": int(datetime.now().timestamp()),
                "model": request.model,
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": full_response
                    },
                    "finish_reason": "stop"
                }]
            }
            logger.info(f"Response format: {json.dumps(response, indent=2)}")  # Debug log
            return response
    except Exception as e:
        logger.error(f"Error in chat completion: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")  # Add traceback
        raise HTTPException(status_code=500, detail=str(e))

async def stream_chat_completion(request: ChatRequest, user_api_key: str):
    try:
        conversation_id = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{id(request)}"
        logger.info(f"Starting conversation: {conversation_id} with model: {request.model}")
        chunk_count = 0
        try:
            async for chunk in generate_chat_completion(request, user_api_key):
                chunk_count += 1
                if not chunk or not chunk.get("choices", []):
                    continue
                choice = chunk["choices"][0]
                content = ""
                if "delta" in choice and "content" in choice["delta"]:
                    content = choice["delta"]["content"]
                elif "message" in choice and "content" in choice["message"]:
                    content = choice["message"]["content"]
                if not content:
                    continue
                yield {
                    "event": "message",
                    "data": json.dumps({
                        "content": content
                    })
                }
                await asyncio.sleep(0.01)
            yield {
                "event": "done",
                "data": json.dumps({"status": "complete"})
            }
            logger.info(f"Conversation {conversation_id} completed with {chunk_count} chunks")
        except asyncio.CancelledError:
            logger.info(f"Conversation {conversation_id} was cancelled")
            yield {
                "event": "error",
                "data": json.dumps({
                    "error": "Request was cancelled"
                })
            }
            return
    except Exception as e:
        error_msg = f"Error in stream_chat_completion: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Extract detailed error message from HTTPException
        if isinstance(e, HTTPException):
            error_detail = e.detail
        else:
            error_detail = str(e)
            
        yield {
            "event": "error",
            "data": json.dumps({
                "detail": error_detail
            })
        }

@router.post("/chats/", response_model=ChatResponse)
def create_chat(chat: ChatCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        user = current_user
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        db_chat = Chat(
            title=chat.title,
            user_id=user.id,
            model_used=chat.model
        )
        db.add(db_chat)
        db.commit()
        db.refresh(db_chat)
        return ChatResponse(
            id=db_chat.id,
            title=db_chat.title,
            created_at=db_chat.created_at,
            message_count=0,
            last_message=None,
            last_message_at=db_chat.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chats/", response_model=List[ChatResponse])
def get_chats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        user = current_user
        query = db.query(Chat).filter(Chat.user_id == user.id)
        chats = query.all()
        chat_responses = []
        for chat in chats:
            if chat.messages:
                last_msg_time = chat.messages[-1].created_at
            else:
                last_msg_time = chat.created_at
            chat_responses.append(
                ChatResponse(
                    id=chat.id,
                    title=chat.title,
                    created_at=chat.created_at,
                    message_count=len(chat.messages),
                    last_message=chat.messages[-1].content if chat.messages else None,
                    last_message_at=last_msg_time
                )
            )
        return chat_responses
    except (OperationalError, DisconnectionError) as e:
        raise HTTPException(
            status_code=503,
            detail="Database temporarily unavailable. Please try again in a moment."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chats/{chat_id}", response_model=ChatDetail)
def get_chat(chat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        return ChatDetail(
            id=chat.id,
            title=chat.title,
            created_at=chat.created_at,
            messages=[
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at,
                    "model": msg.model
                }
                for msg in chat.messages
            ],
            user=chat.user.name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chats/{chat_id}/messages", response_model=dict)
def add_message(chat_id: int, message: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found or not authorized")
        db_message = MessageDB(
            chat_id=chat_id,
            role=message.role,
            content=message.content,
            model=message.model
        )
        db.add(db_message)
        db.commit()
        db.refresh(db_message)
        # Update chat's model_used to the model of the last message
        chat.model_used = message.model
        db.commit()
        return {"id": db_message.id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding/updating message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/chats/{chat_id}")
def delete_chat(chat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found or not authorized")
        db.delete(chat)
        db.commit()
        return {"detail": "Chat deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class ChatUpdate(BaseModel):
    title: str

@router.put("/chats/{chat_id}", response_model=ChatResponse)
def update_chat(chat_id: int, chat_update: ChatUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update a chat's title"""
    try:
        # Get the chat first
        chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found or not authorized")
        
        # Update the title
        chat.title = chat_update.title
        db.commit()
        db.refresh(chat)
        
        # Get message count and last message
        message_count = len(chat.messages)
        last_message = chat.messages[-1].content if chat.messages else None
        
        last_msg_time = chat.messages[-1].created_at if chat.messages else chat.created_at
        return ChatResponse(
            id=chat.id,
            title=chat.title,
            created_at=chat.created_at,
            message_count=message_count,
            last_message=last_message,
            last_message_at=last_msg_time
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chats/{chat_id}/messages", response_model=List[dict])
def get_chat_messages(chat_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found or not authorized")
            
        messages = db.query(MessageDB).filter(MessageDB.chat_id == chat_id).order_by(MessageDB.id).all()
        return [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
                "model": msg.model
            }
            for msg in messages
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def get_models(current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Get list of available models.
    Returns all models, but marks premium ones as locked if user has no API key.
    """
    try:
        # Determine if user has API key (either in DB or potentially passed in header/session)
        has_api_key = False
        if current_user and current_user.api_key:
            has_api_key = True
            
        # Use local models file
        if os.path.exists('openrouter_models.json'):
             try:
                with open('openrouter_models.json', 'r') as f:
                    data = json.load(f)
                    models = []
                    
                    # Transform OpenRouter models format to our format
                    for model in data.get("data", []):
                        # Only include models that support chat completion
                        model_id = model.get("id", "")
                        if not model_id:
                            continue
                        
                        # Determine pricing and free status
                        pricing = model.get("pricing", {})
                        prompt_price = float(pricing.get("prompt", 0) or 0)
                        completion_price = float(pricing.get("completion", 0) or 0)
                        is_free = (prompt_price == 0 and completion_price == 0)
                        
                        # Determine if locked for this user
                        is_locked = not has_api_key and not is_free

                        # Skip very old or experimental models that might not work well
                        model_id_lower = model_id.lower()
                        if any(skip in model_id_lower for skip in ["gpt-3.5", "gpt-3", "claude-1", "claude-2"]):
                            continue
                        
                        name = model.get("name", model_id)
                        description_parts = []
                        
                        # Add context info
                        context_length = model.get("context_length")
                        if context_length:
                            if context_length >= 1000000:
                                description_parts.append(f"{context_length//1000000}M+ context")
                            elif context_length >= 1000:
                                description_parts.append(f"{context_length//1000}K context")
                            else:
                                description_parts.append(f"{context_length} context")
                        
                        if prompt_price is not None and completion_price is not None:
                            # Format prices nicely
                            prompt_str = f"${prompt_price:.4f}" if prompt_price < 1 else f"${prompt_price:.2f}"
                            completion_str = f"${completion_price:.4f}" if completion_price < 1 else f"${completion_price:.2f}"
                            description_parts.append(f"${prompt_str}/${completion_str} per 1M tokens")
                        
                        if is_free:
                            description_parts.append("- Free")
                        
                        description = " • ".join(description_parts) if description_parts else "Available via OpenRouter"
                        
                        # Add category tag
                        tags = []
                        if is_free:
                            tags.append("Free")
                        if "reasoning" in name.lower() or "r1" in model_id.lower():
                            tags.append("Reasoning")
                        if any(x in name.lower() for x in ["premium", "pro", "max"]) and not is_free:
                            tags.append("Premium")
                        
                        display_name = name
                        if tags:
                            display_name += f" - {' + '.join(tags)}"
                        
                        models.append({
                            "id": model_id,
                            "name": display_name,
                            "description": description,
                            "is_free": is_free,
                            "is_locked": is_locked
                        })
                    
                    # Sort models: free first, then by name
                    models.sort(key=lambda x: (not x["name"].endswith("Free"), x["name"]))
                    
                    logger.info(f"Loaded {len(models)} models from local file (User has key: {has_api_key})")
                    return {"models": models}
             except Exception as e:
                 logger.error(f"Error loading local models file: {e}")

        # Fallback to static list if local file fails or doesn't exist
        logger.warning("Using static models list as fallback")
        static_models = []
        for m in AVAILABLE_MODELS:
            is_free = "Free" in m["name"]
            is_locked = not has_api_key and not is_free
            m_copy = m.copy()
            m_copy["is_free"] = is_free
            m_copy["is_locked"] = is_locked
            static_models.append(m_copy)
        return {"models": static_models}
    except Exception as e:
        logger.warning(f"Failed to fetch models from OpenRouter API: {str(e)}, using static list")
        static_models = []
        for m in AVAILABLE_MODELS:
            is_free = "Free" in m["name"]
            is_locked = not has_api_key and not is_free
            m_copy = m.copy()
            m_copy["is_free"] = is_free
            m_copy["is_locked"] = is_locked
            static_models.append(m_copy)
        return {"models": static_models} 

@router.delete("/chats/{chat_id}/messages/regenerate/{message_id}")
def delete_messages_after_regeneration(chat_id: int, message_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Check if chat exists and user owns it
        chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found or not authorized")

        # Find the message to regenerate
        message = db.query(MessageDB).filter(
            MessageDB.id == message_id,
            MessageDB.chat_id == chat_id
        ).first()
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Delete the message being regenerated and all messages after it
        db.query(MessageDB).filter(
            MessageDB.chat_id == chat_id,
            MessageDB.id >= message_id  # Changed from > to >= to include the message itself
        ).delete()

        db.commit()
        return {"status": "success", "message": "Messages deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Demo API key for guest mode (set in server .env)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
# In-memory daily usage counter for guests
guest_usage: Dict[str, int] = {}

@router.post("/guest/completions")
async def guest_completions(request: Request):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="Server API key not configured.")
    # Rate limit by IP per day
    ip = request.client.host
    key = f"{ip}:{date.today()}"
    used = guest_usage.get(key, 0)
    if used >= 8:
        raise HTTPException(status_code=429, detail="Guest daily limit reached. Please sign up for unlimited access.")
    guest_usage[key] = used + 1
    # Parse chat request body
    body = await request.json()
    chat_req = ChatRequest(**body)
    # Stream response if requested
    if chat_req.stream:
        return EventSourceResponse(
            stream_chat_completion(chat_req, OPENROUTER_API_KEY),
            media_type="text/event-stream"
        )
    # Non-streaming: accumulate full content
    full_response = ""
    async for chunk in generate_chat_completion(chat_req, OPENROUTER_API_KEY):
        if "choices" in chunk and chunk["choices"]:
            choice = chunk["choices"][0]
            if "delta" in choice and "content" in choice["delta"]:
                full_response += choice["delta"]["content"]
            elif "message" in choice and "content" in choice["message"]:
                full_response = choice["message"]["content"]
    return {"content": full_response} 