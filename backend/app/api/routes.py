from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import StreamingResponse
from typing import List, Optional
import json
import time
import os

from ..models.chat import ChatRequest, Message
from ..services.openrouter import generate_chat_completion, OPENROUTER_API_KEY

router = APIRouter()

@router.post("/chat")
async def chat_endpoint(chat_request: ChatRequest):
    """
    Chat completion endpoint that supports streaming.
    """
    if chat_request.stream:
        # Return a streaming response
        return StreamingResponse(
            stream_chat_response(chat_request),
            media_type="text/event-stream"
        )
    else:
        # Collect the entire response and return it as JSON
        full_response = ""
        choices = []
        model = ""
        response_id = ""
        
        async for chunk in generate_chat_completion(chat_request):
            if "model" in chunk:
                model = chunk["model"]
            if "id" in chunk:
                response_id = chunk["id"]
            
            for choice in chunk.get("choices", []):
                delta = choice.get("delta", {})
                content = delta.get("content", "")
                if content:
                    full_response += content
        
        # Format as a non-streaming response
        return {
            "id": response_id,
            "model": model,
            "object": "chat.completion",
            "created": int(time.time()),
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": full_response
                },
                "finish_reason": "stop"
            }]
        }

async def stream_chat_response(chat_request: ChatRequest):
    """
    Stream the chat response in Server-Sent Events format.
    """
    try:
        async for chunk in generate_chat_completion(chat_request):
            # Format as a proper SSE message
            yield f"data: {json.dumps(chunk)}\n\n"
        
        # End the stream
        yield "data: [DONE]\n\n"
    except Exception as e:
        error_data = {
            "error": {
                "message": str(e),
                "type": "server_error"
            }
        }
        yield f"data: {json.dumps(error_data)}\n\n"
        yield "data: [DONE]\n\n"

@router.get("/models")
async def list_models():
    """
    List available models from OpenRouter.
    """
    # This is a simplified list. You could fetch this from OpenRouter if they provide an API for it.
    return {
        "models": [
            {
                "id": "openai/gpt-3.5-turbo",
                "name": "GPT-3.5 Turbo",
                "description": "OpenAI's GPT-3.5 Turbo model"
            },
            {
                "id": "openai/gpt-4",
                "name": "GPT-4",
                "description": "OpenAI's GPT-4 model"
            },
            {
                "id": "anthropic/claude-3-opus",
                "name": "Claude 3 Opus",
                "description": "Anthropic's Claude 3 Opus model"
            },
            {
                "id": "anthropic/claude-3-sonnet",
                "name": "Claude 3 Sonnet",
                "description": "Anthropic's Claude 3 Sonnet model"
            },
            {
                "id": "anthropic/claude-3-haiku",
                "name": "Claude 3 Haiku",
                "description": "Anthropic's Claude 3 Haiku model"
            },
            {
                "id": "meta-llama/llama-3.3-8b-instruct:free",
                "name": "Llama 3.3 8B Instruct",
                "description": "Meta's free Llama 3.3 8B Instruct model"
            }
        ]
    }

@router.get("/diagnostics")
async def diagnostics():
    """
    Diagnostic endpoint to check API configuration.
    """
    api_key_masked = "Not Set"
    if OPENROUTER_API_KEY:
        # Mask most of the API key for security
        if len(OPENROUTER_API_KEY) > 8:
            api_key_masked = f"{OPENROUTER_API_KEY[:4]}...{OPENROUTER_API_KEY[-4:]}"
        else:
            api_key_masked = "Set (too short to mask)"
    
    return {
        "api_key_status": "Set" if OPENROUTER_API_KEY else "Not Set",
        "api_key_masked": api_key_masked,
        "env_vars": {k: v for k, v in os.environ.items() if k.startswith("OPENROUTER")}
    } 