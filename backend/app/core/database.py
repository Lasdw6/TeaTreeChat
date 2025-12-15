from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError, DisconnectionError
import os
from dotenv import load_dotenv

load_dotenv()

# Get database URL from Supabase environment variable
DATABASE_URL = os.getenv("SUPABASE_DATABASE_URL", os.getenv("DATABASE_URL"))

if not DATABASE_URL:
    raise RuntimeError("SUPABASE_DATABASE_URL environment variable not set!")

# Handle PostgreSQL URL format (Supabase provides postgresql://, but SQLAlchemy needs postgresql+psycopg2://)
# For Session mode pooler, use aws-0-REGION format
if DATABASE_URL.startswith("postgresql://") and "pooler.supabase.com" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and "db." in DATABASE_URL:
    # Direct connection (non-pooler), also needs psycopg2
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    # Fallback for any other postgresql:// URL
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Create engine for PostgreSQL (Supabase)
# Supabase pooler configuration:
# - Lower pool size (Supabase pooler has limits per user)
# - Enable pool_pre_ping to check connections before use
# - Set pool_recycle to reconnect before connections time out
# - Enable echo for debugging if needed
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to False in production
    pool_size=5,  # Reduced for Supabase pooler limits
    max_overflow=10,  # Reduced for Supabase
    pool_pre_ping=True,  # Check connections before using them
    pool_recycle=300,  # Recycle connections every 5 minutes (Supabase timeout is ~10 min)
    connect_args={
        "connect_timeout": 5,  # Reduced from 10 to 5 seconds for faster feedback
        "options": "-c statement_timeout=5000"  # Reduced from 30s to 5s
    }
)

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