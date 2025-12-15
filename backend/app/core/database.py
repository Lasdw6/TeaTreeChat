from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError, DisconnectionError
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL from Supabase environment variable
# Priority: SUPABASE_DATABASE_URL > DATABASE_URL
DATABASE_URL = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("SUPABASE_DATABASE_URL or DATABASE_URL environment variable not set!")

# Log connection info (without password) for debugging
def mask_password(url: str) -> str:
    """Mask password in connection string for logging"""
    if "@" in url:
        parts = url.split("@")
        if "://" in parts[0]:
            auth_part = parts[0].split("://")[1]
            if ":" in auth_part:
                user_pass = auth_part.split(":")
                if len(user_pass) >= 2:
                    return url.replace(f":{user_pass[1]}@", ":****@")
    return url

print(f"[DB] Using database connection: {mask_password(DATABASE_URL)}")
if "pooler.supabase.com" in DATABASE_URL or "db." in DATABASE_URL and "supabase" in DATABASE_URL.lower():
    print(f"[DB] Connection type: Supabase {'pooler' if 'pooler.supabase.com' in DATABASE_URL else 'direct'}")
elif "dpg-" in DATABASE_URL or "render.com" in DATABASE_URL:
    print(f"[DB] Connection type: Render Database (⚠️  If you intended to use Supabase, set SUPABASE_DATABASE_URL in Render environment variables)")
else:
    print(f"[DB] Connection type: unknown")

# Handle PostgreSQL URL format (Supabase provides postgresql://, but SQLAlchemy needs postgresql+psycopg2://)
# For Session mode pooler, use aws-0-REGION format
# IMPORTANT: For Supabase pooler, use port 6543 (Session mode) instead of 5432 (Transaction mode)
# Session mode is better for serverless/cloud deployments
original_url = DATABASE_URL

if DATABASE_URL.startswith("postgresql://") and "pooler.supabase.com" in DATABASE_URL:
    # Check if using Transaction mode (port 5432) - switch to Session mode (port 6543) for better reliability
    if ":5432/" in DATABASE_URL or ":5432?" in DATABASE_URL or DATABASE_URL.endswith(":5432"):
        print("[DB] WARNING: Using Transaction mode pooler (port 5432). Consider switching to Session mode (port 6543) for better reliability.")
        print("[DB] Session mode is better for serverless/cloud deployments as it doesn't hold transactions open.")
    
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and "db." in DATABASE_URL:
    # Direct connection (non-pooler), also needs psycopg2
    print("[DB] Using direct connection (non-pooler). This may be slower but more reliable.")
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    # Fallback for any other postgresql:// URL
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql+psycopg2://"):
    # Already in correct format
    pass
else:
    print(f"[DB] WARNING: Unexpected database URL format: {DATABASE_URL[:50]}...")

# Create engine for PostgreSQL (Supabase)
# Supabase pooler configuration:
# - Lower pool size (Supabase pooler has limits per user)
# - Enable pool_pre_ping to check connections before use
# - Set pool_recycle to reconnect before connections time out
# - Enable echo for debugging if needed

# Determine if we're using pooler or direct connection
is_pooler = "pooler.supabase.com" in original_url
is_direct = "db." in original_url

# Adjust pool settings based on connection type
if is_pooler:
    # Pooler mode: Use smaller pool, more aggressive recycling
    pool_size = 2  # Very conservative for pooler
    max_overflow = 3
    pool_recycle = 180  # 3 minutes (pooler connections timeout faster)
    print("[DB] Using pooler-optimized connection settings")
elif is_direct:
    # Direct connection: Can use larger pool
    pool_size = 5
    max_overflow = 10
    pool_recycle = 300  # 5 minutes
    print("[DB] Using direct connection settings")
else:
    # Default/unknown connection type
    pool_size = 3
    max_overflow = 5
    pool_recycle = 300
    print("[DB] Using default connection settings")

engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to False in production
    pool_size=pool_size,
    max_overflow=max_overflow,
    pool_pre_ping=True,  # Check connections before using them (critical for cloud)
    pool_recycle=pool_recycle,  # Recycle connections before they timeout
    pool_reset_on_return='commit',  # Reset connections on return to pool
    connect_args={
        "connect_timeout": 15,  # 15 seconds for cloud connections
        "keepalives": 1,  # Enable TCP keepalives
        "keepalives_idle": 30,  # Start keepalives after 30s of inactivity
        "keepalives_interval": 10,  # Send keepalive every 10s
        "keepalives_count": 3,  # Max 3 keepalive packets before considering dead
        "options": "-c statement_timeout=30000"  # 30 second statement timeout
    }
)
print(f"[DB] Engine created with pool_size={pool_size}, max_overflow={max_overflow}, pool_recycle={pool_recycle}s")

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# Dependency to get DB session
# pool_pre_ping=True handles connection validation automatically
def get_db():
    db = SessionLocal()
    try:
        yield db
    except (OperationalError, DisconnectionError) as e:
        # Rollback and close on connection errors
        db.rollback()
        db.close()
        raise
    finally:
        db.close()

# Initialize database
def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")