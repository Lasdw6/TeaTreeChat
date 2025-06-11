import os
from fastapi import FastAPI
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes with prefix
app.include_router(api_router, prefix="/api")

@app.on_event("startup")
def init_db():
    # Create tables
    Base.metadata.create_all(bind=engine)

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Chat API is running"}

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