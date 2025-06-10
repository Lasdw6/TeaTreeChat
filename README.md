# T3 Chat Clone

An open-source clone of T3 chat built with FastAPI (backend) and Next.js (frontend) for high performance.

## Features

- Real-time chat interface
- Message streaming from AI models
- Fast and responsive UI
- Integration with OpenRouter for AI model access
- Support for Meta's Llama 3.3 8B Instruct model (free tier)

## Tech Stack

### Backend

- FastAPI - High-performance Python framework
- Pydantic - Data validation
- Uvicorn - ASGI server
- OpenRouter API - AI model integration

### Frontend

- Next.js 15+ - React framework with TypeScript
- React - UI library
- Tailwind CSS - Utility-first CSS framework

## Project Structure

```
T3/
├── backend/              # FastAPI server
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Core functionality
│   │   ├── models/       # Data models
│   │   └── services/     # Business logic
│   ├── requirements.txt  # Python dependencies
│   └── main.py           # Entry point
├── frontend/             # Next.js app
│   ├── public/           # Static files
│   ├── src/              # Source code
│   ├── package.json      # JS dependencies
│   └── tsconfig.json     # TS configuration
├── start_all.bat         # Script to start both services
└── README.md             # Project documentation
```

## Setup and Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn
- OpenRouter API key

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env` file in the backend directory with:

```
OPENROUTER_API_KEY=your_api_key_here
```

## Running the Application

You can start both services with:

```bash
./start_all.bat  # On Windows
```

Or individually:

### Backend

```bash
cd backend
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm run dev
```

## Supported Models

This clone supports a variety of AI models through OpenRouter:

- OpenAI GPT-3.5 Turbo
- OpenAI GPT-4
- Anthropic Claude 3 (Opus, Sonnet, Haiku)
- **Meta Llama 3.3 8B Instruct** (free tier)

## License

MIT
