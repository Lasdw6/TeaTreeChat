#!/usr/bin/env python3
import json
import sys

# Read the OpenRouter models
try:
    with open('openrouter_models.json', 'r', encoding='utf-8') as f:
        openrouter_data = json.load(f)
except FileNotFoundError:
    print("Error: openrouter_models.json not found. Please run the curl command first.")
    sys.exit(1)

# Extract valid model IDs from OpenRouter
valid_model_ids = set()
for model in openrouter_data.get('data', []):
    valid_model_ids.add(model['id'])

print(f"Found {len(valid_model_ids)} valid models in OpenRouter API")

# Backend models from the chat.py file
backend_models = [
    # OpenAI Models
    "openai/gpt-4.1",
    "openai/gpt-4o",
    "openai/gpt-4.1-mini",
    "openai/gpt-4o-mini",
    "openai/gpt-4.1-nano",
    "openai/o4-mini",
    
    # Anthropic Models
    "anthropic/claude-sonnet-4",
    "anthropic/claude-opus-4",
    "anthropic/claude-3.7-sonnet",
    "anthropic/claude-3.5-sonnet",
    
    # Google/Gemini Models
    "google/gemini-2.5-pro-preview",
    "google/gemini-2.0-flash-001",
    "google/gemini-2.5-flash-preview",
    "google/gemini-flash-1.5",
    "google/gemini-2.0-flash-lite-001",
    "google/gemini-flash-1.5-8b",
    "google/gemini-2.0-flash-exp:free",
    "google/gemma-3-27b-it",
    "google/gemma-3-27b-it:free",
    
    # Meta/Llama Models
    "meta-llama/llama-4-maverick",
    "meta-llama/llama-4-scout",
    "meta-llama/llama-3.3-70b-instruct",
    "meta-llama/llama-3.1-70b-instruct",
    "meta-llama/llama-3.1-8b-instruct",
    "meta-llama/llama-3.2-3b-instruct",
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.1-70b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    
    # DeepSeek Models
    "deepseek/deepseek-r1",
    "deepseek/deepseek-r1-0528",
    "deepseek/deepseek-chat",
    "deepseek/deepseek-chat-v3-0324",
    "deepseek/deepseek-r1:free",
    "deepseek/deepseek-r1-0528:free",
    "deepseek/deepseek-chat:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "tngtech/deepseek-r1t-chimera:free",
    
    # Other Premium Models
    "x-ai/grok-3-beta",
    "x-ai/grok-3-mini-beta",
    "mistralai/mistral-nemo",
    "mistralai/mistral-small-3.1-24b-instruct",
    "mistralai/mistral-nemo:free",
    "nousresearch/hermes-3-llama-3.1-405b",
    "qwen/qwen3-235b-a22b",
    "qwen/qwen-2.5-7b-instruct",
    "qwen/qwen-2.5-7b-instruct:free"
]

print(f"\nValidating {len(backend_models)} backend models...")

# Check which backend models are invalid
invalid_models = []
valid_models = []

for model_id in backend_models:
    if model_id in valid_model_ids:
        valid_models.append(model_id)
    else:
        invalid_models.append(model_id)

print(f"\n✅ Valid models: {len(valid_models)}")
for model in valid_models:
    print(f"  ✓ {model}")

print(f"\n❌ Invalid models: {len(invalid_models)}")
for model in invalid_models:
    print(f"  ✗ {model}")

if invalid_models:
    print(f"\n🔧 Models to remove from backend:")
    for model in invalid_models:
        print(f'  "{model}",')
else:
    print(f"\n🎉 All backend models are valid!")

# Also check for some popular models that might be missing
popular_models = [
    "anthropic/claude-3.5-sonnet-20241022",
    "anthropic/claude-3.5-haiku-20241022", 
    "openai/gpt-4o-2024-11-20",
    "openai/gpt-4o-mini-2024-07-18",
    "meta-llama/llama-3.2-90b-vision-instruct",
    "google/gemini-flash-1.5-8b",
    "deepseek/deepseek-chat",
    "qwen/qwen-2.5-72b-instruct"
]

print(f"\n🔍 Checking for popular models that might be missing...")
missing_popular = []
for model in popular_models:
    if model in valid_model_ids and model not in backend_models:
        missing_popular.append(model)

if missing_popular:
    print(f"📝 Popular models you might want to add:")
    for model in missing_popular:
        print(f"  + {model}")
else:
    print("✅ No obvious popular models missing") 