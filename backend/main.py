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

# Database initialization - non-blocking to prevent startup failures
# Tables will be created on first use if they don't exist
@app.on_event("startup")
async def init_db():
    # Log allowed CORS origins for debugging
    print(f"[CORS] Allowed origins: {allowed_origins}")
    
    # Try to initialize database tables in background, but don't fail startup if DB is unavailable
    # This prevents the app from crashing when Supabase pooler connections are slow
    async def try_create_tables():
        try:
            # Run synchronous DB operation in thread pool to avoid blocking startup
            # This allows the app to start even if DB connection is slow
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: Base.metadata.create_all(bind=engine))
            print("[DB] Database tables initialized successfully")
        except Exception as e:
            error_msg = str(e)
            if "timeout" in error_msg.lower():
                print("[DB] Database connection timeout during startup (non-critical - tables will be created on first use)")
            else:
                print(f"[DB] Database initialization warning (non-critical): {e}")
            # Don't raise - allow app to start anyway
    
    # Start the DB initialization task but don't wait for it to complete
    # This allows the app to start even if DB is temporarily unavailable
    asyncio.create_task(try_create_tables())

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Chat API is running"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint - optimized for speed"""
    # Use a separate task for DB check to avoid blocking the response for too long
    # We want to return healthy quickly if the server is up, even if DB is slow
    
    async def check_db():
        try:
            loop = asyncio.get_event_loop()
            # Run blocking DB operation in a thread
            def run_query():
                db = SessionLocal()
                try:
                    db.execute(text("SELECT 1"))
                    return True
                except Exception:
                    return False
                finally:
                    db.close()
            
            return await loop.run_in_executor(None, run_query)
        except Exception:
            return False

    # Wait max 2 seconds for DB
    try:
        db_status = await asyncio.wait_for(check_db(), timeout=2.0)
        status_msg = "connected" if db_status else "unavailable"
    except asyncio.TimeoutError:
        status_msg = "timeout"
    
    return {
        "status": "healthy",
        "message": "Server is awake",
        "database": status_msg
    }

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