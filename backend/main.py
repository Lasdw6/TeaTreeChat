import os
from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.api.routes import router as api_router
from app.core.database import engine, Base, get_db
from sqlalchemy.orm import Session
from sqlalchemy import text
import asyncio
import signal
import sys

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
# Get allowed origins from environment variable, fallback to localhost for development
# Include production domain by default
default_origins = [
    "http://localhost:3000",
]
env_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
# Combine default origins with environment variable origins, removing empty strings
allowed_origins = [origin.strip() for origin in default_origins + env_origins if origin.strip()]

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
# Automatically create/update tables on startup (dev only)
@app.on_event("startup")
def init_db():
    # For SQLite, drop existing file manually if schema changed
    Base.metadata.create_all(bind=engine)
    # Log allowed CORS origins for debugging
    print(f"[CORS] Allowed origins: {allowed_origins}")

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Chat API is running"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint - publicly accessible for monitoring services"""
    # Always return 200 to keep the server alive, even if DB is temporarily unavailable
    # This prevents Render from restarting the service due to transient DB connection issues
    try:
        # Try to check database connection with a short timeout, but don't fail if it times out
        db = next(get_db())
        try:
            # Use a simple query with timeout handling
            db.execute(text("SELECT 1"))
            db.close()
            return {"status": "healthy", "message": "Server is awake and responsive", "database": "connected"}
        except Exception as db_error:
            db.close()
            # Log but don't fail - server is still running, DB might just be temporarily slow
            # This is common with Supabase pooler connections
            error_msg = str(db_error)
            if "timeout" in error_msg.lower():
                # Don't log timeout errors as they're expected with pooler connections
                pass
            else:
                print(f"Health check database error (non-critical): {db_error}")
            return {"status": "healthy", "message": "Server is awake and responsive", "database": "timeout"}
    except Exception as e:
        # Even if DB connection fails completely, server is still running
        # This prevents the health check from causing server restarts
        error_msg = str(e)
        if "timeout" not in error_msg.lower():
            print(f"Health check database connection error (non-critical): {e}")
        return {"status": "healthy", "message": "Server is awake and responsive", "database": "unavailable"}

# Graceful shutdown handling
@app.on_event("shutdown")
async def shutdown_event():
    # Give ongoing requests time to complete
    await asyncio.sleep(1)

# Only register signal handlers when running directly (not under Gunicorn)
# Gunicorn manages its own signal handling and workers should not interfere
if __name__ == "__main__":
    def handle_sigterm(signum, frame):
        print("Received SIGTERM. Starting graceful shutdown...")
        sys.exit(0)
    
    # Register signal handlers only for direct execution
    signal.signal(signal.SIGTERM, handle_sigterm)
    signal.signal(signal.SIGINT, handle_sigterm)
    
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 