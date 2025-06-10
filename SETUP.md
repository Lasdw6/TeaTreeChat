# T3 Chat Clone Setup Instructions

This document guides you through setting up the T3 Chat Clone, a high-performance chat application with FastAPI backend and Next.js frontend.

## Prerequisites

- Python 3.10+ (for backend)
- Node.js 18+ (for frontend)
- npm or yarn
- An OpenRouter API key (get one at https://openrouter.ai/)

## Backend Setup

1. Navigate to the backend directory:

   ```
   cd backend
   ```

2. Create a virtual environment and activate it:

   ```
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Mac/Linux
   python -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with your OpenRouter API key:

   ```
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

5. Start the backend server:
   ```
   uvicorn main:app --reload --port 8000
   ```

## Frontend Setup

1. Navigate to the frontend directory:

   ```
   cd frontend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env.local` file in the frontend directory:

   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

4. Start the frontend development server:
   ```
   npm run dev
   ```

## Using the Application

Once both servers are running, you can access:

- Frontend at: http://localhost:3000
- Backend API at: http://localhost:8000

## Using the start_all.bat Script (Windows Only)

For Windows users, you can use the provided batch script to start both services simultaneously:

```
start_all.bat
```

## API Endpoints

- `GET /api/models` - List available models
- `POST /api/chat` - Send a chat request

## Troubleshooting

- If you encounter CORS errors, ensure both servers are running and check that the URLs in the .env files are correct.
- If you get authentication errors, verify your OpenRouter API key is correctly set in the backend's .env file.
- If the frontend can't connect to the backend, check that the backend is running on port 8000.
