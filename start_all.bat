@echo off
echo Starting T3 Chat Clone...

echo Starting backend server...
start cmd /k "cd backend && if not exist venv (python -m venv venv) && venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000"

echo Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak > nul

echo Starting frontend...
start cmd /k "cd frontend && npm install && npm run dev"

echo Both services are starting. The application will be available at:
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000 