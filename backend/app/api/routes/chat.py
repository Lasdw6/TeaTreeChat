from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query, Body
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
from datetime import datetime
from typing import List, Dict, Any, Optional
from ...models.chat import Message, ChatRequest, ChatResponse, Chat, MessageDB, User
from ...services.openrouter import generate_chat_completion
from sqlalchemy.orm import Session
from ...core.database import SessionLocal, get_db
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger("chat_router")

# Pydantic models for request/response
class ChatCreate(BaseModel):
    title: str
    user_id: int

class MessageCreate(BaseModel):
    id: Optional[int] = None
    role: str
    content: str
    regeneration_id: Optional[str] = None

class ChatResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    message_count: int
    last_message: str | None

class ChatDetail(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: List[dict]
    user: str

# Available models
AVAILABLE_MODELS = [
    {
        "id": "meta-llama/llama-3.3-8b-instruct:free",
        "name": "Llama 3.3 8B",
        "description": "Meta's Llama 3.3 8B parameter model"
    },
    {
        "id": "meta-llama/llama-3.3-70b-instruct:free",
        "name": "Llama 3.3 70B",
        "description": "Meta's Llama 3.3 70B parameter model"
    },
    {
        "id": "anthropic/claude-3-opus:beta",
        "name": "Claude 3 Opus",
        "description": "Anthropic's most powerful model"
    },
    {
        "id": "anthropic/claude-3-sonnet:beta",
        "name": "Claude 3 Sonnet",
        "description": "Anthropic's balanced model"
    }
]

# Dependency for DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Calculate project root (backend) by going three levels up from this file
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
LOGS_DIR = os.path.join(BASE_DIR, "logs")

# Configure file handler to log chunks via logger
LOG_FILE = os.path.join(LOGS_DIR, "chunks.log")
file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
logger.addHandler(file_handler)
logger.setLevel(logging.INFO)

# Main chunk log
CHUNK_LOG_PATH = os.path.join(LOGS_DIR, "chunks.txt")
# Backup log for redundancy
BACKUP_LOG_PATH = os.path.join(LOGS_DIR, "chunks_backup.txt")
# JSON log for structured data
JSON_LOG_PATH = os.path.join(LOGS_DIR, "chunks.json")

print(f"LOG PATHS:")
print(f"  Main: {CHUNK_LOG_PATH}")
print(f"  Backup: {BACKUP_LOG_PATH}")
print(f"  JSON: {JSON_LOG_PATH}")

# Verify we can write to log files
def verify_file_writeable(file_path):
    try:
        # Try to open and write to the file
        with open(file_path, "a", encoding="utf-8") as f:
            f.write("")
        return True
    except Exception as e:
        print(f"ERROR: Cannot write to {file_path}: {str(e)}")
        return False

# Verify and initialize all log files
for log_path in [CHUNK_LOG_PATH, BACKUP_LOG_PATH]:
    if not verify_file_writeable(log_path):
        # Try alternative location in current directory
        base_name = os.path.basename(log_path)
        alt_path = os.path.join(os.getcwd(), base_name)
        print(f"Trying alternative path: {alt_path}")
        
        if verify_file_writeable(alt_path):
            # Update the global variable to use the working path
            if log_path == CHUNK_LOG_PATH:
                CHUNK_LOG_PATH = alt_path
            elif log_path == BACKUP_LOG_PATH:
                BACKUP_LOG_PATH = alt_path
    else:
        try:
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"\n==== LOG INITIALIZED AT {datetime.now().isoformat()} ====\n")
                f.write("-" * 80 + "\n")
                f.flush()
                os.fsync(f.fileno())  # Force the OS to write to disk
                print(f"Successfully wrote to {log_path}")
        except Exception as e:
            print(f"ERROR initializing log file {log_path}: {str(e)}")
            traceback.print_exc()

# Try to initialize JSON log
try:
    if not os.path.exists(JSON_LOG_PATH) or not verify_file_writeable(JSON_LOG_PATH):
        base_name = os.path.basename(JSON_LOG_PATH)
        alt_path = os.path.join(os.getcwd(), base_name)
        if verify_file_writeable(alt_path):
            JSON_LOG_PATH = alt_path
            
    with open(JSON_LOG_PATH, "w", encoding="utf-8") as f:
        f.write("[]")  # Initialize with empty array
        f.flush()
        os.fsync(f.fileno())  # Force the OS to write to disk
        print(f"Successfully initialized JSON log at {JSON_LOG_PATH}")
except Exception as e:
    print(f"ERROR initializing JSON log file: {str(e)}")
    traceback.print_exc()

def log_chunk(chunk_data: Dict[str, Any], chunk_number: int, conversation_id: str) -> None:
    """
    Log every chunk with multiple backup mechanisms to ensure nothing is missed
    """
    try:
        timestamp = datetime.now().isoformat()
        
        # Extract content if available
        content = ""
        if ('choices' in chunk_data and chunk_data['choices'] and 
            'delta' in chunk_data['choices'][0] and 
            'content' in chunk_data['choices'][0]['delta']):
            content = chunk_data['choices'][0]['delta']['content']

        # Format the log message
        log_message = f"\n[{timestamp}] CONVERSATION: {conversation_id} | CHUNK #{chunk_number}\n"
        if content:
            log_message += f"Content: \"{content}\"\n"
        log_message += f"Full data: {json.dumps(chunk_data, indent=2)}\n"
        log_message += "-" * 80 + "\n"
        
        # Track if any log method was successful
        any_log_successful = False
        
        # 1. Write to main log file
        try:
            with open(CHUNK_LOG_PATH, "a", encoding="utf-8") as f:
                f.write(log_message)
                f.flush()
                os.fsync(f.fileno())  # Force OS to write to disk
                any_log_successful = True
                # Print confirmation of successful write
                print(f"Successfully logged chunk #{chunk_number} to main log")
        except Exception as e:
            print(f"ERROR writing to main log: {str(e)}")
            
            # Try writing to alternative location in case of permission issues
            try:
                alt_path = os.path.join(os.getcwd(), f"chunk_{chunk_number}.txt")
                with open(alt_path, "a", encoding="utf-8") as f:
                    f.write(log_message)
                    f.flush()
                    os.fsync(f.fileno())
                    print(f"Successfully wrote to alternative log: {alt_path}")
                    any_log_successful = True
            except Exception as e2:
                print(f"ERROR writing to alternative log: {str(e2)}")
        
        # 2. Write to backup log file
        try:
            with open(BACKUP_LOG_PATH, "a", encoding="utf-8") as f:
                f.write(log_message)
                f.flush()
                os.fsync(f.fileno())  # Force OS to write to disk
                any_log_successful = True
        except Exception as e:
            print(f"ERROR writing to backup log: {str(e)}")
            
        # 3. Append to JSON log for structured access
        try:
            json_entry = {
                "timestamp": timestamp,
                "conversation_id": conversation_id,
                "chunk_number": chunk_number,
                "content": content,
                "full_data": chunk_data
            }
            
            # Write to an individual JSON file first (most reliable)
            indiv_json_path = os.path.join(LOGS_DIR, f"chunk_{conversation_id}_{chunk_number}.json")
            try:
                with open(indiv_json_path, "w", encoding="utf-8") as f:
                    json.dump(json_entry, f, indent=2)
                    f.flush()
                    os.fsync(f.fileno())
                    any_log_successful = True
            except Exception as e:
                print(f"ERROR writing to individual JSON file: {str(e)}")
                # Try current directory as fallback
                try:
                    with open(f"chunk_{chunk_number}.json", "w", encoding="utf-8") as f:
                        json.dump(json_entry, f, indent=2)
                        f.flush()
                        os.fsync(f.fileno())
                        any_log_successful = True
                except Exception as e2:
                    print(f"ERROR writing to fallback JSON file: {str(e2)}")
            
            # Try to append to the main JSON log file
            try:
                # Read current data
                chunks = []
                try:
                    with open(JSON_LOG_PATH, "r", encoding="utf-8") as f:
                        try:
                            chunks = json.load(f)
                        except json.JSONDecodeError:
                            chunks = []
                except Exception as e:
                    print(f"ERROR reading JSON log: {str(e)}")
                    chunks = []
                
                chunks.append(json_entry)
                
                with open(JSON_LOG_PATH, "w", encoding="utf-8") as f:
                    json.dump(chunks, f, indent=2)
                    f.flush()
                    os.fsync(f.fileno())
            except Exception as e:
                print(f"ERROR updating JSON log: {str(e)}")
        except Exception as e:
            print(f"ERROR with JSON logging: {str(e)}")
            
        # 4. Also print to console for immediate visibility
        print(f"Logged chunk #{chunk_number} | Conv: {conversation_id[:8]} | Content: {content[:50]}...")
        
        # If all logging methods failed, use stdout as last resort
        if not any_log_successful:
            print("ALL LOGGING METHODS FAILED - DUMPING TO CONSOLE:")
            print("-" * 80)
            print(log_message)
            print("-" * 80)
            
            # Try one more time with the simplest possible approach
            try:
                simple_log_path = os.path.join(os.getcwd(), "emergency_log.txt")
                with open(simple_log_path, "a") as f:
                    f.write(log_message)
            except:
                pass
        
    except Exception as e:
        # Print the error to make sure it's visible
        error_msg = f"CRITICAL ERROR in log_chunk: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        
        # Last resort - try to write to a separate error log
        try:
            with open(os.path.join(LOGS_DIR, "chunk_log_errors.txt"), "a", encoding="utf-8") as f:
                f.write(f"\n[{datetime.now().isoformat()}] {error_msg}\n")
                f.write(traceback.format_exc())
                f.write("-" * 80 + "\n")
        except:
            # Absolutely last resort
            print("FAILED TO LOG ERROR - DUMPING STACK TRACE:")
            traceback.print_exc()

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

@router.post("/completions")
async def chat_completion(request: ChatRequest):
    """
    Get a chat completion from the AI model
    """
    try:
        if request.stream:
            # Use Server-Sent Events for streaming
            return EventSourceResponse(
                stream_chat_completion(request),
                media_type="text/event-stream"
            )
        else:
            # Non-streaming response
            full_response = ""
            async for chunk in generate_chat_completion(request):
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

async def stream_chat_completion(request: ChatRequest):
    """
    Stream the chat completion response
    """
    try:
        # Generate a unique conversation ID
        conversation_id = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{id(request)}"
        logger.info(f"Starting conversation: {conversation_id} with model: {request.model}")
        
        chunk_count = 0
        
        try:
            async for chunk in generate_chat_completion(request):
                chunk_count += 1

                # Skip empty chunks
                if not chunk or not chunk.get("choices", []):
                    continue
                    
                choice = chunk["choices"][0]
                content = ""
                
                # Extract content from either delta or message
                if "delta" in choice and "content" in choice["delta"]:
                    content = choice["delta"]["content"]
                elif "message" in choice and "content" in choice["message"]:
                    content = choice["message"]["content"]
                
                if not content:
                    continue
                
                # Send just the content chunk
                yield {
                    "event": "message",
                    "data": json.dumps({
                        "content": content
                    })
                }
                
                # Small delay to avoid overwhelming the client
                await asyncio.sleep(0.01)
            
            # Send completion event
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
        
        yield {
            "event": "error",
            "data": json.dumps({
                "error": str(e)
            })
        }

@router.post("/chats/", response_model=ChatResponse)
def create_chat(chat: ChatCreate, db: Session = Depends(get_db)):
    try:
        # Check if user exists
        user = db.query(User).filter(User.id == chat.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Create new chat
        db_chat = Chat(
            title=chat.title,
            user_id=chat.user_id
        )
        db.add(db_chat)
        db.commit()
        db.refresh(db_chat)
        
        return ChatResponse(
            id=db_chat.id,
            title=db_chat.title,
            created_at=db_chat.created_at,
            message_count=0,
            last_message=None
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chats/", response_model=List[ChatResponse])
def get_chats(user_id: int = Query(None), db: Session = Depends(get_db)):
    try:
        query = db.query(Chat)
        if user_id is not None:
            query = query.filter(Chat.user_id == user_id)
        chats = query.all()
        
        return [
            ChatResponse(
                id=chat.id,
                title=chat.title,
                created_at=chat.created_at,
                message_count=len(chat.messages),
                last_message=chat.messages[-1].content if chat.messages else None
            )
            for chat in chats
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chats/{chat_id}", response_model=ChatDetail)
def get_chat(chat_id: int, db: Session = Depends(get_db)):
    try:
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
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
                    "created_at": msg.created_at
                }
                for msg in chat.messages
            ],
            user=chat.user.name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chats/{chat_id}/messages", response_model=dict)
def add_message(chat_id: int, message: MessageCreate, db: Session = Depends(get_db)):
    try:
        # Check if chat exists
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")

        # If message ID is provided, update existing message
        if message.id is not None:
            existing_message = db.query(MessageDB).filter(
                MessageDB.id == message.id,
                MessageDB.chat_id == chat_id
            ).first()
            
            if existing_message:
                existing_message.content = message.content
                existing_message.regeneration_id = message.regeneration_id
                db.commit()
                db.refresh(existing_message)
                
                return {
                    "id": str(existing_message.id),  # Convert to string for frontend
                    "role": existing_message.role,
                    "content": existing_message.content,
                    "created_at": existing_message.created_at.isoformat(),
                    "regeneration_id": existing_message.regeneration_id
                }

        # Create new message if no ID provided or message not found
        db_message = MessageDB(
            chat_id=chat_id,
            role=message.role,
            content=message.content,
            created_at=datetime.utcnow(),
            regeneration_id=message.regeneration_id
        )
        db.add(db_message)
        db.commit()
        db.refresh(db_message)
        
        return {
            "id": str(db_message.id),  # Convert to string for frontend
            "role": db_message.role,
            "content": db_message.content,
            "created_at": db_message.created_at.isoformat(),
            "regeneration_id": db_message.regeneration_id
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding/updating message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/chats/{chat_id}")
def delete_chat(chat_id: int, db: Session = Depends(get_db)):
    try:
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        db.delete(chat)
        db.commit()
        return {"message": "Chat deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chats/{chat_id}/messages", response_model=List[dict])
def get_chat_messages(chat_id: int, db: Session = Depends(get_db)):
    try:
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
            
        messages = db.query(MessageDB).filter(MessageDB.chat_id == chat_id).order_by(MessageDB.created_at).all()
        return [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def get_models():
    """
    Get list of available models
    """
    return {"models": AVAILABLE_MODELS} 