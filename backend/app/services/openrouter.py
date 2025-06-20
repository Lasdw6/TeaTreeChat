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

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

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

async def generate_chat_completion(chat_request: ChatRequest, user_api_key: str) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Generate chat completion from OpenRouter API with streaming support.
    """
    if not user_api_key:
        raise HTTPException(status_code=400, detail="No API key set. Please set your OpenRouter API key in Settings.")
    
    # Ensure API key is ASCII-safe
    try:
        user_api_key.encode('ascii')
    except UnicodeEncodeError:
        raise HTTPException(status_code=400, detail="API key contains invalid characters. Please check your API key.")
    
    headers = {
        "Authorization": f"Bearer {user_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://teatreechat.vividh.lol",
        "X-Title": "TeaTree Chat"
    }
    
    payload = {
        "model": chat_request.model,
        "messages": [{"role": msg.role, "content": msg.content} for msg in chat_request.messages],
        "stream": chat_request.stream,
        "temperature": chat_request.temperature,
        "max_tokens": chat_request.max_tokens
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", OPENROUTER_API_URL, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    error_detail = ""
                    try:
                        # Try to parse the JSON error response from OpenRouter
                        error_data = json.loads(error_body)
                        # Extract the meaningful part of the error
                        error_detail = error_data.get("error", {}).get("message", "An unknown error occurred.")
                        
                        # Check for the raw metadata error, which is often more descriptive
                        raw_error = error_data.get("error", {}).get("metadata", {}).get("raw")
                        if raw_error:
                          error_detail = raw_error

                        # Add provider-specific details if available
                        provider_error = error_data.get("error", {}).get("provider_error", {})
                        if provider_error:
                            provider_message = provider_error.get("message", "")
                            if provider_message:
                                error_detail += f" (Provider: {provider_message})"

                    except (json.JSONDecodeError, AttributeError):
                        # If parsing fails, use the raw response body
                        error_detail = error_body.decode('utf-8', errors='ignore')

                    # Always include the original status code for context
                    error_to_raise = f"OpenRouter Error (HTTP {response.status_code}): {error_detail}"
                    
                    logger.error(f"OpenRouter API Error: Status {response.status_code}, Detail: {error_body.decode('utf-8', errors='ignore')}")
                    
                    # We use a 500 status code for the client, but include the real status in the message
                    raise HTTPException(status_code=500, detail=error_to_raise)
                
                async for line in response.aiter_lines():
                    if not line.strip() or not line.startswith("data: "):
                        continue
                    
                    line = line[6:]  # Remove the "data: " prefix
                    if line == "[DONE]":
                        break
                    
                    try:
                        chunk = json.loads(line)
                        if 'choices' in chunk and chunk['choices'] and 'delta' in chunk['choices'][0]:
                            delta = chunk['choices'][0]['delta']
                            if 'content' in delta and delta['content']:
                                yield {
                                    "id": chunk.get("id", ""),
                                    "model": chat_request.model,
                                    "choices": [{
                                        "message": {
                                            "content": delta['content']
                                        }
                                    }]
                                }
                    except json.JSONDecodeError:
                        continue
    
    except (httpx.RequestError, asyncio.TimeoutError) as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to OpenRouter API: {str(e)}")
    except HTTPException:
        # Re-raise HTTPException as-is (including our detailed OpenRouter errors)
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}") 