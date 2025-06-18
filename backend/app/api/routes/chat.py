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
from datetime import datetime
from typing import List, Dict, Any, Optional
from ...models.chat import Message, ChatRequest, ChatResponse, Chat, MessageDB, User
from ...services.openrouter import generate_chat_completion
from sqlalchemy.orm import Session
from ...core.database import SessionLocal, get_db
from pydantic import BaseModel
from .user import get_current_user
from ...models.user import User
from passlib.context import CryptContext
from cryptography.fernet import Fernet

router = APIRouter()
logger = logging.getLogger("chat_router")

# Pydantic models for request/response
class ChatCreate(BaseModel):
    title: str
    model: str = "gpt-3.5-turbo"
    user_id: int

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

class ChatDetail(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: List[dict]
    user: str

# Available models
AVAILABLE_MODELS = [
    # OpenAI Models
    {
        "id": "openai/gpt-4.1",
        "name": "GPT-4.1",
        "description": "OpenAI's advanced model with 1M+ context ($2/$8 per 1M tokens)"
    },
    {
        "id": "openai/gpt-4o",
        "name": "GPT-4o",
        "description": "OpenAI's flagship multimodal model with 128K context ($2.50/$10 per 1M tokens)"
    },
    {
        "id": "openai/gpt-4.1-mini",
        "name": "GPT-4.1 Mini",
        "description": "OpenAI's efficient advanced model with 1M+ context ($0.40/$1.60 per 1M tokens)"
    },
    {
        "id": "openai/gpt-4o-mini",
        "name": "GPT-4o Mini",
        "description": "OpenAI's efficient model with 128K context ($0.15/$0.60 per 1M tokens)"
    },
    {
        "id": "openai/gpt-4.1-nano",
        "name": "GPT-4.1 Nano",
        "description": "OpenAI's ultra-efficient model with 1M+ context ($0.10/$0.40 per 1M tokens)"
    },
    {
        "id": "openai/o4-mini",
        "name": "o4 Mini",
        "description": "OpenAI's reasoning model with 200K context ($1.10/$4.40 per 1M tokens)"
    },
    
    # Anthropic Models
    {
        "id": "anthropic/claude-sonnet-4",
        "name": "Claude Sonnet 4",
        "description": "Anthropic's latest flagship model with 200K context ($3/$15 per 1M tokens)"
    },
    {
        "id": "anthropic/claude-opus-4",
        "name": "Claude Opus 4",
        "description": "Anthropic's most powerful model with 200K context ($15/$75 per 1M tokens)"
    },
    {
        "id": "anthropic/claude-3.7-sonnet",
        "name": "Claude 3.7 Sonnet",
        "description": "Anthropic's enhanced model with 200K context ($3/$15 per 1M tokens)"
    },
    {
        "id": "anthropic/claude-3.5-sonnet",
        "name": "Claude 3.5 Sonnet",
        "description": "Anthropic's proven flagship model with 200K context ($3/$15 per 1M tokens)"
    },
    
    # Google/Gemini Models
    {
        "id": "google/gemini-2.5-pro-preview",
        "name": "Gemini 2.5 Pro",
        "description": "Google's most capable model with 1M+ context ($1.25/$10 per 1M tokens)"
    },
    {
        "id": "google/gemini-2.0-flash-001",
        "name": "Gemini 2.0 Flash",
        "description": "Google's fast model with 1M+ context ($0.10/$0.40 per 1M tokens)"
    },
    {
        "id": "google/gemini-2.5-flash-preview",
        "name": "Gemini 2.5 Flash",
        "description": "Google's enhanced flash model with 1M+ context ($0.15/$0.60 per 1M tokens)"
    },
    {
        "id": "google/gemini-flash-1.5",
        "name": "Gemini 1.5 Flash",
        "description": "Google's efficient model with 1M context ($0.075/$0.30 per 1M tokens)"
    },
    {
        "id": "google/gemini-2.0-flash-lite-001",
        "name": "Gemini 2.0 Flash Lite",
        "description": "Google's lightweight model with 1M+ context ($0.075/$0.30 per 1M tokens)"
    },
    {
        "id": "google/gemini-flash-1.5-8b",
        "name": "Gemini 1.5 Flash 8B",
        "description": "Google's compact model with 1M context ($0.038/$0.15 per 1M tokens)"
    },
    {
        "id": "google/gemini-2.0-flash-exp:free",
        "name": "Gemini 2.0 Flash Experimental",
        "description": "Google's experimental model with 1M+ context - Free"
    },
    {
        "id": "google/gemma-3-27b-it",
        "name": "Gemma 3 27B",
        "description": "Google's instruction-tuned model with 131K context ($0.10/$0.20 per 1M tokens)"
    },
    {
        "id": "google/gemma-3-27b-it:free",
        "name": "Gemma 3 27B",
        "description": "Google's instruction-tuned model with 131K context - Free"
    },
    
    # Meta/Llama Models
    {
        "id": "meta-llama/llama-4-maverick",
        "name": "Llama 4 Maverick",
        "description": "Meta's experimental model with 1M+ context ($0.15/$0.60 per 1M tokens)"
    },
    {
        "id": "meta-llama/llama-4-scout",
        "name": "Llama 4 Scout",
        "description": "Meta's efficient model with 1M+ context ($0.08/$0.30 per 1M tokens)"
    },
    {
        "id": "meta-llama/llama-3.3-70b-instruct",
        "name": "Llama 3.3 70B",
        "description": "Meta's latest 70B model with 131K context ($0.05/$0.25 per 1M tokens)"
    },
    {
        "id": "meta-llama/llama-3.1-70b-instruct",
        "name": "Llama 3.1 70B",
        "description": "Meta's proven 70B model with 131K context ($0.10/$0.28 per 1M tokens)"
    },
    {
        "id": "meta-llama/llama-3.1-8b-instruct",
        "name": "Llama 3.1 8B",
        "description": "Meta's efficient 8B model with 131K context ($0.016/$0.03 per 1M tokens)"
    },
    {
        "id": "meta-llama/llama-3.2-3b-instruct",
        "name": "Llama 3.2 3B",
        "description": "Meta's compact 3B model with 131K context ($0.01/$0.02 per 1M tokens)"
    },
    {
        "id": "meta-llama/llama-3.3-70b-instruct:free",
        "name": "Llama 3.3 70B",
        "description": "Meta's latest 70B model with 131K context - Free"
    },
    {
        "id": "meta-llama/llama-3.1-70b-instruct:free",
        "name": "Llama 3.1 70B", 
        "description": "Meta's proven 70B model with 131K context - Free"
    },
    {
        "id": "meta-llama/llama-3.1-8b-instruct:free",
        "name": "Llama 3.1 8B",
        "description": "Meta's efficient 8B model with 131K context - Free"
    },
    {
        "id": "meta-llama/llama-3.2-3b-instruct:free",
        "name": "Llama 3.2 3B",
        "description": "Meta's compact 3B model with 131K context - Free"
    },
    
    # DeepSeek Models (Reasoning & Chat)
    {
        "id": "deepseek/deepseek-r1",
        "name": "DeepSeek R1",
        "description": "DeepSeek's reasoning model with 128K context ($0.45/$2.15 per 1M tokens)"
    },
    {
        "id": "deepseek/deepseek-r1-0528",
        "name": "DeepSeek R1 0528",
        "description": "DeepSeek's enhanced reasoning model with 128K context ($0.50/$2.15 per 1M tokens)"
    },
    {
        "id": "deepseek/deepseek-chat",
        "name": "DeepSeek V3",
        "description": "DeepSeek's conversational model with 163K context ($0.38/$0.89 per 1M tokens)"
    },
    {
        "id": "deepseek/deepseek-chat-v3-0324",
        "name": "DeepSeek V3 0324",
        "description": "DeepSeek's latest conversational model with 163K context ($0.30/$0.88 per 1M tokens)"
    },
    {
        "id": "deepseek/deepseek-r1:free",
        "name": "DeepSeek R1",
        "description": "DeepSeek's reasoning model with 163K context - Free"
    },
    {
        "id": "deepseek/deepseek-r1-0528:free",
        "name": "DeepSeek R1 0528",
        "description": "DeepSeek's enhanced reasoning model with 163K context - Free"
    },
    {
        "id": "deepseek/deepseek-chat:free",
        "name": "DeepSeek V3",
        "description": "DeepSeek's conversational model with 163K context - Free"
    },
    {
        "id": "deepseek/deepseek-chat-v3-0324:free",
        "name": "DeepSeek V3 0324",
        "description": "DeepSeek's latest conversational model with 163K context - Free"
    },
    {
        "id": "tngtech/deepseek-r1t-chimera:free",
        "name": "DeepSeek R1T Chimera",
        "description": "TNG's enhanced DeepSeek reasoning model with 163K context - Free"
    },
    
    # Other Premium Models
    {
        "id": "x-ai/grok-3-beta",
        "name": "Grok 3 Beta",
        "description": "xAI's flagship model with 131K context ($3/$15 per 1M tokens)"
    },
    {
        "id": "x-ai/grok-3-mini-beta",
        "name": "Grok 3 Mini Beta",
        "description": "xAI's efficient model with 131K context ($0.30/$0.50 per 1M tokens)"
    },
    {
        "id": "mistralai/mistral-nemo",
        "name": "Mistral Nemo",
        "description": "Mistral's efficient model with 131K context ($0.01/$0.023 per 1M tokens)"
    },
    {
        "id": "mistralai/mistral-small-3.1-24b-instruct",
        "name": "Mistral Small 3.1",
        "description": "Mistral's compact model with 131K context ($0.05/$0.15 per 1M tokens)"
    },
    {
        "id": "mistralai/mistral-nemo:free",
        "name": "Mistral Nemo",
        "description": "Mistral's efficient model with 131K context - Free"
    },
    {
        "id": "nousresearch/hermes-3-llama-3.1-405b",
        "name": "Hermes 3 405B",
        "description": "Nous Research's large model with 131K context ($0.70/$0.80 per 1M tokens)"
    },
    {
        "id": "qwen/qwen3-235b-a22b",
        "name": "Qwen3 235B",
        "description": "Alibaba's large model with 40K context ($0.13/$0.60 per 1M tokens)"
    },
    {
        "id": "qwen/qwen-2.5-7b-instruct",
        "name": "Qwen 2.5 7B",
        "description": "Alibaba's efficient 7B model with 32K context ($0.04/$0.10 per 1M tokens)"
    },
    {
        "id": "qwen/qwen-2.5-7b-instruct:free",
        "name": "Qwen 2.5 7B",
        "description": "Alibaba's efficient 7B model with 32K context - Free"
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
        yield {
            "event": "error",
            "data": json.dumps({
                "error": str(e)
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
            last_message=None
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
        
        return ChatResponse(
            id=chat.id,
            title=chat.title,
            created_at=chat.created_at,
            message_count=message_count,
            last_message=last_message
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
async def get_models():
    """
    Get list of available models
    """
    return {"models": AVAILABLE_MODELS} 

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