# 🌳 TeaTree Chat

A modern, responsive chat application built as a T3chat clone for the Cloneathon. TeaTree Chat operates on a BYOK (Bring Your Own Key) basis using OpenRouter, giving users access to multiple AI models with their own API keys. This project was intially made as part of T3 chats cloneathon.

## ✨ Features

### 🔐 Authentication & User Management

- **Secure user registration and login** with email validation
- **Password strength requirements** (uppercase, lowercase, digit, special character)
- **Account management** with delete account functionality
- **API key management** with encrypted storage

### 💬 Chat Functionality

- **Real-time streaming responses** from AI models
- **Multiple chat sessions** with persistent storage
- **Chat forking** - branch conversations from any message
- **Message regeneration** with model selection
- **Chat renaming** for better organization
- **Message copying** with one-click functionality

### 🤖 AI Model Integration

- **Multiple AI providers** through OpenRouter:
  - Meta (Llama models)
  - Anthropic (Claude)
  - OpenAI (GPT)
  - Google (Gemini)
  - Mistral AI
  - And many more!
- **Model selection** for new chats and regeneration
- **Free model auto-selection** for new users
- **Model-specific regeneration** options

### 🎨 User Interface

- **Beautiful, responsive design** with TeaTree branding
- **Dark theme** with tan (#D6BFA3) and brown (#4E342E) color scheme
- **API key status indicators** with visual feedback
- **Loading states** and error handling
- **Mobile-friendly** responsive layout

### 🚀 Performance & Reliability

- **Server wake-up functionality** for Render free plan
- **Automatic retry logic** for network issues
- **Graceful error handling** with user-friendly messages
- **Optimized streaming** with duplicate content filtering

## 🛠️ Tech Stack

### Frontend

- **Next.js 14** with TypeScript
- **Material-UI (MUI)** for components
- **Tailwind CSS** for styling
- **React Markdown** for message rendering
- **Syntax highlighting** for code blocks

### Backend

- **FastAPI** with Python
- **SQLAlchemy** ORM with SQLite database
- **JWT authentication** with bcrypt password hashing
- **Encrypted API key storage** using Fernet
- **CORS middleware** for cross-origin requests

### Deployment

- **Frontend**: Vercel
- **Backend**: Render (free plan with auto-wake functionality)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- OpenRouter API key ([Get one free here](https://openrouter.ai/keys))

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
chmod +x start.sh
./start.sh
```

### Environment Variables

Create `.env` files in both frontend and backend directories:

**Frontend (.env.local):**

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Backend (.env):**

```
FERNET_KEY=your-fernet-key-here
ALLOWED_ORIGINS=http://localhost:3000
```

## 📝 Usage

1. **Register/Login** with your email and password
2. **Set your OpenRouter API key** in Settings
3. **Create a new chat** (automatically uses free Llama model)
4. **Start chatting** with AI models
5. **Regenerate responses** with different models
6. **Fork conversations** to explore different paths
7. **Manage your chats** with renaming and deletion

## ✅ Completed Features

- [x] User authentication and registration
- [x] BYOK (Bring Your Own Key) functionality
- [x] Multiple AI model support
- [x] Real-time streaming responses
- [x] Chat forking and regeneration
- [x] Model selection for regeneration
- [x] API key status indicators
- [x] Server wake-up for free hosting
- [x] Error handling and user feedback
- [x] Chat management (rename, delete)
- [x] Responsive UI design
- [x] Free model auto-selection
- [x] Message copying functionality

## 🔄 Planned Features

- [ ] Tools integration
- [ ] File attachments support
- [ ] Chat export functionality
- [ ] Web search capabilities
- [ ] Multi-modal support (images, files)
- [ ] Credits calculator
- [ ] Custom model configurations
- [ ] Improved reasoning model support
- [ ] Chat search functionality

## 🏗️ Architecture

TeaTree Chat follows a modern full-stack architecture:

- **Frontend**: React/Next.js with server-side rendering
- **Backend**: RESTful API with FastAPI
- **Database**: SQLite with SQLAlchemy ORM and Postgres for Prod
- **Authentication**: JWT tokens with secure password hashing
- **AI Integration**: OpenRouter API for multiple model access
- **Deployment**: Serverless frontend, containerized backend

## 🤝 Contributing

This project was built as part of the Cloneathon. Contributions, issues, and feature requests are welcome!

## 👨‍💻 Author

**Vividh Mahajan**

- Website: [vividh.lol](https://vividh.lol)
- GitHub: [Lasdw6/TeaTreeChat](https://github.com/Lasdw6/TeaTreeChat)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
