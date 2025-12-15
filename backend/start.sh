#!/bin/bash

# Debug: Show environment variables (without passwords)
echo "=== Environment Variables ==="
echo "SUPABASE_DATABASE_URL is set: $([ -n "$SUPABASE_DATABASE_URL" ] && echo 'YES' || echo 'NO')"
echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo 'YES' || echo 'NO')"
if [ -n "$SUPABASE_DATABASE_URL" ]; then
    echo "SUPABASE_DATABASE_URL: $(echo $SUPABASE_DATABASE_URL | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')"
fi
if [ -n "$DATABASE_URL" ]; then
    echo "DATABASE_URL: $(echo $DATABASE_URL | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')"
fi
echo "=============================="

# Run database migrations/initialization with better error handling
python -c "
import sys
import os
import traceback
sys.path.insert(0, os.getcwd())

print('=== Database Connection Test ===')
try:
    from app.core.database import init_db, DATABASE_URL
    from sqlalchemy import text
    from app.core.database import engine
    
    # Try a simple connection test first
    print('Testing database connection...')
    with engine.connect() as conn:
        result = conn.execute('SELECT 1')
        print('✓ Database connection successful!')
    
    print('Initializing database tables...')
    init_db()
    print('✓ Database initialization completed successfully!')
except Exception as e:
    print(f'✗ Database initialization failed!')
    print(f'Error type: {type(e).__name__}')
    print(f'Error message: {str(e)}')
    print('\\nFull traceback:')
    traceback.print_exc()
    print('\\n=== Troubleshooting Tips ===')
    print('1. Check if SUPABASE_DATABASE_URL is set correctly in Render')
    print('2. Verify Supabase IP allowlisting (should allow all IPs or Render IPs)')
    print('3. Try using Session mode pooler (port 6543) instead of Transaction mode (port 5432)')
    print('4. Check Supabase connection pool limits')
    print('5. Verify network connectivity from Render to Supabase')
    # Don't exit(1) - allow app to start and retry connections
    print('\\nContinuing startup (app will retry connections on first request)...')
"

# Set default port if not provided
PORT=${PORT:-8000}

# Start the server
exec gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 2 --max-requests 1000 --max-requests-jitter 50 