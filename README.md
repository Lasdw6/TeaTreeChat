# Chat Application

A modern chat application built with Next.js, FastAPI, and OpenRouter AI.

## Features

- Real-time chat interface
- Multiple AI model support
- Message history
- Conversation management
- Streaming responses
- Modern UI with Tailwind CSS

## Prerequisites

- Python 3.8+
- Node.js 16+
- OpenRouter API key (get one at https://openrouter.ai/)

## Setup

### Backend

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your configuration.

5. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

## Development

- Backend API runs on http://localhost:8000
- Frontend development server runs on http://localhost:3000
- API documentation available at http://localhost:8000/docs

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   └── services/
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   └── types/
    └── package.json
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
