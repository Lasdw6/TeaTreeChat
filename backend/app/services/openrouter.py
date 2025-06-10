import os
import json
import httpx
import asyncio
import logging
import re
from typing import List, Dict, Any, AsyncGenerator
from fastapi import HTTPException
from ..models.chat import Message, ChatRequest

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("openrouter")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

if not OPENROUTER_API_KEY:
    logger.warning("WARNING: OPENROUTER_API_KEY not set in environment variables")

def clean_duplicate_content(content: str) -> str:
    """
    Clean up duplicated text patterns that sometimes occur in LLM responses.
    """
    if not content or len(content) < 10:
        return content
    
    # Remove duplicated header patterns like "Puzzle 1Puzzle 1"
    result = re.sub(r'(\b\w+\s+\d+)(\1)', r'\1', content)
    
    # Remove duplicated phrases like "rock rock" with optional separators
    result = re.sub(r'(\b\w+\b)[\s\n]*(\1\b)', r'\1', result)
    
    # Fix common duplication patterns
    patterns = [
        (r'(\brock\s+)(\1)', r'\1'),
        (r'(\bpaper\s+)(\1)', r'\1'),
        (r'(\bscissors\s+)(\1)', r'\1'),
        (r'(\bpuzzle\s+)(\1)', r'\1'),
        (r'(\bpassword\s+)(\1)', r'\1'),
        (r'(\bplayer\s+)(\1)', r'\1'),
        (r'(\bpoint\s+)(\1)', r'\1'),
        (r'(\bpoints\s+)(\1)', r'\1'),
        (r'(\binvolves\s+)(\1)', r'\1'),
        (r'(\bsolving\s+)(\1)', r'\1'),
        (r'(\brelated\s+to\s+)(\1)', r'\1'),
        (r'(\bpuzzles\s+)(\1)', r'\1'),
        (r'(\bDay\s+\d+)(\s+\1)', r'\1'),
    ]
    
    for pattern, replacement in patterns:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    
    # Add proper spacing after punctuation
    result = re.sub(r'([.!?])([A-Z])', r'\1 \2', result)
    
    return result

def process_chunk_content(chunk: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process the content in an API response chunk to clean it up.
    """
    if not chunk or 'choices' not in chunk:
        return chunk
    
    for choice in chunk['choices']:
        if 'delta' in choice and 'content' in choice['delta'] and choice['delta']['content']:
            # Don't process individual stream chunks too aggressively
            # Just apply minimal fixes
            choice['delta']['content'] = re.sub(r'([.!?])([A-Z])', r'\1 \2', choice['delta']['content'])
        
        if 'message' in choice and 'content' in choice['message'] and choice['message']['content']:
            # For complete messages, apply full cleaning
            choice['message']['content'] = clean_duplicate_content(choice['message']['content'])
    
    return chunk

async def generate_chat_completion(chat_request: ChatRequest) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Generate chat completion from OpenRouter API with streaming support.
    """
    if not OPENROUTER_API_KEY:
        logger.error("OpenRouter API key not configured")
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://t3-chat-clone.com",  # Replace with your actual domain
        "X-Title": "T3 Chat Clone"
    }
    
    payload = {
        "model": chat_request.model,
        "messages": [{"role": msg.role, "content": msg.content} for msg in chat_request.messages],
        "stream": chat_request.stream,
        "temperature": chat_request.temperature,
        "max_tokens": chat_request.max_tokens
    }
    
    logger.info(f"Sending request to OpenRouter API with model: {chat_request.model}")
    logger.info(f"Messages: {[msg.content[:30] + '...' for msg in chat_request.messages]}")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            logger.info(f"Sending POST request to {OPENROUTER_API_URL}")
            
            async with client.stream("POST", OPENROUTER_API_URL, headers=headers, json=payload) as response:
                logger.info(f"Response status code: {response.status_code}")
                
                if response.status_code != 200:
                    error_detail = await response.aread()
                    logger.error(f"OpenRouter API error: {error_detail}")
                    raise HTTPException(status_code=response.status_code, detail=f"OpenRouter API error: {error_detail}")
                
                # Handle streaming response
                chunk_count = 0
                accumulated_content = ""
                
                async for line in response.aiter_lines():
                    if line.strip() == "":
                        continue
                    
                    if line.startswith("data: "):
                        line = line[6:]  # Remove the "data: " prefix
                    
                    if line == "[DONE]":
                        logger.info("Stream completed with [DONE] marker")
                        break
                    
                    try:
                        chunk = json.loads(line)
                        chunk_count += 1
                        
                        # Process the chunk content to clean up text
                        if chat_request.stream:
                            processed_chunk = process_chunk_content(chunk)
                            
                            # If streaming, also accumulate content for debugging
                            if 'choices' in chunk and chunk['choices'] and 'delta' in chunk['choices'][0]:
                                delta = chunk['choices'][0]['delta']
                                if 'content' in delta and delta['content']:
                                    accumulated_content += delta['content']
                        else:
                            # For non-streaming responses, apply full cleaning
                            processed_chunk = process_chunk_content(chunk)
                        
                        # Log the first few chunks and last chunk for debugging
                        if chunk_count <= 2 or chunk_count % 50 == 0:
                            logger.info(f"Chunk {chunk_count}: {json.dumps(processed_chunk)[:100]}...")
                        
                        yield processed_chunk
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse line: {line}")
                        continue
                
                logger.info(f"Stream completed with {chunk_count} chunks")
                
                # Log a sample of the accumulated content for debugging
                if accumulated_content:
                    sample_size = min(200, len(accumulated_content))
                    logger.info(f"Sample of accumulated content: {accumulated_content[:sample_size]}...")
    
    except (httpx.RequestError, asyncio.TimeoutError) as e:
        logger.error(f"Error connecting to OpenRouter API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error connecting to OpenRouter API: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}") 