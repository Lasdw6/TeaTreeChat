#!/bin/bash

# Debug: Show database URL (without password)
echo "DATABASE_URL environment variable is set: $(echo $DATABASE_URL | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')"

# Run database migrations/initialization
python -c "
import sys
import os
sys.path.insert(0, os.getcwd())
from app.core.database import init_db, DATABASE_URL
print(f'Attempting to connect to database: {DATABASE_URL[:20]}...')
try:
    init_db()
    print('Database initialization completed successfully!')
except Exception as e:
    print(f'Database initialization failed: {e}')
    exit(1)
"

# Set default port if not provided
PORT=${PORT:-8000}

# Start the server
exec gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 2 --max-requests 1000 --max-requests-jitter 50 