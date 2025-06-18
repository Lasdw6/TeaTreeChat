#!/bin/bash

# Run database migrations/initialization
python -c "from app.core.database import init_db; init_db()"

# Start the server
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT 