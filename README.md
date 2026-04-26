# Local AI

A fully local AI-powered learning assistant — no internet connection required, no data sent to external servers. Everything runs on your machine.

The app has two distinct modes:

- **Professor Mode** — chat with an AI tutor that remembers the conversation context. Ask questions about any topic, get clear explanations with examples, and receive follow-up questions to test your understanding. Built on Ollama's `/api/chat` endpoint with server-side session management.

- **Summary Mode** — upload any PDF (lecture notes, textbook chapter, research paper) and get a structured summary with headings and key points streamed back in real time. Built on Ollama's `/api/generate` endpoint with pdf-parse for text extraction.

All AI responses are streamed token by token via Server-Sent Events (SSE), giving a real-time typing effect in the UI. The LLM runs locally through Ollama with the Mistral 7B model.

## Stack

| Component | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| LLM | Ollama + Mistral 7B |
| PDF | pdf-parse |

## Features

### Professor Mode (`POST /chat`)
Interactive conversation with an AI professor. Context is preserved across messages through a server-side session. The model responds in a pedagogical way and asks questions to check understanding.

### Summary Mode (`POST /generate`)
Upload a PDF file. The backend extracts the text, sends it to Ollama which generates a structured summary with headings and key points.

## Architecture

```
local-ai/
├── backend/
│   └── src/
│       ├── server.ts           # Express entry point
│       ├── routes/
│       │   ├── chat.ts         # POST /chat — SSE
│       │   └── generate.ts     # POST /generate — SSE
│       ├── services/
│       │   ├── chat.ts         # Ollama /api/chat call
│       │   └── generate.ts     # PDF extraction + Ollama /api/generate call
│       ├── store/
│       │   └── sessions.ts     # In-memory conversation history
│       └── utils/
│           └── pdf.ts          # PDF reading and text extraction
└── frontend/
    └── src/
        └── App.tsx             # React UI (chat + PDF upload)
```

## Technical Flow

### Chat
```
Frontend → POST /chat { sessionId, message }
  → backend retrieves session history
  → calls Ollama /api/chat (stream)
  → SSE to frontend token by token
  → session history updated with the response
```

### PDF Summary
```
Frontend → POST /generate (multipart, field: file)
  → backend extracts text from PDF (pdf-parse)
  → deletes temporary file
  → calls Ollama /api/generate (stream)
  → SSE to frontend token by token
```

## Requirements

- Node.js 18+
- [Ollama](https://ollama.com) installed and running

## Setup

```bash
# Download Mistral model
ollama pull mistral

# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Ollama | http://localhost:11434 |

## Backend Routes

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Server status |
| POST | `/chat` | Chat with history (SSE) |
| POST | `/generate` | PDF summary (SSE) |

### POST /chat
```json
{ "sessionId": "uuid", "message": "your question" }
```

### POST /generate
`multipart/form-data` with a `file` field containing the PDF.

## Streaming (SSE)

Both routes stream the response token by token via Server-Sent Events. Format:
```
data: {"token":"Hello"}\n\n
data: {"token":" world"}\n\n
data: [DONE]\n\n
```
