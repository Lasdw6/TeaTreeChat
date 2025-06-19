import os
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.api.routes import router as api_router
from app.core.database import engine, Base
import asyncio
import signal
import sys

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
# Get allowed origins from environment variable, fallback to localhost for development
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to allow health checks from any origin
@app.middleware("http")
async def allow_health_check_cors(request: Request, call_next):
    response = await call_next(request)
    
    # Allow CORS for health check endpoint from any origin
    if request.url.path == "/api/health":
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# Include API routes with prefix
app.include_router(api_router, prefix="/api")

# Database initialization is handled in start.sh script
# @app.on_event("startup")
# def init_db():
#     # Create tables
#     Base.metadata.create_all(bind=engine)

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Chat API is running"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint - publicly accessible for monitoring services"""
    return {"status": "healthy", "message": "Server is awake and responsive"}

# Graceful shutdown handling
@app.on_event("shutdown")
async def shutdown_event():
    # Give ongoing requests time to complete
    await asyncio.sleep(1)

def handle_sigterm(signum, frame):
    print("Received SIGTERM. Starting graceful shutdown...")
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGTERM, handle_sigterm)
signal.signal(signal.SIGINT, handle_sigterm)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 