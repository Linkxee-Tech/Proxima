# Proxima

Proxima is a workspace for turning a work request into a clear, reviewable plan. It is designed for jobs that may send a message, publish a post, or change something in an external service. The app shows the planned steps first and waits for approval before it takes those actions.

## What you can do with it

- Turn a written request into a workflow with visible steps and status.
- Review and approve work before a message, post, or other external action is sent.
- Keep workflow history, artifacts, and approval records in one place.
- Draft social posts and manage connected tools from the dashboard.
- Use live workflow updates through an authenticated WebSocket connection.

The project has a Next.js frontend and a FastAPI backend. It can keep data in a local JSON file for development or use PostgreSQL for a deployed environment.

## Project layout

```text
backend/       FastAPI routes, authentication, storage, integrations, and tests
frontend/      Next.js application and dashboard
docs/          Architecture notes
.env.example   Backend environment template
```

## Run it locally

### 1. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item ..\.env.example .env
.\start-local.ps1
```

Open `http://localhost:8000/` for the API docs or `http://localhost:8000/health` for the health check.

`0.0.0.0` is a server bind address. Do not enter `http://0.0.0.0:8000/` in a browser.

### 2. Start the frontend

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`, create an account, and start a workflow.

## Configuration

The backend reads `backend/.env`; the frontend reads `frontend/.env.local`. Both files are ignored by Git.

For a local demo, the defaults in `.env.example` use local storage. For a hosted environment, set the following values in the hosting provider's environment settings:

```env
# Backend
PROXIMA_STORAGE_BACKEND=postgres
PROXIMA_DATABASE_URL=postgresql://...
PROXIMA_JWT_SECRET=<long-random-value>
PROXIMA_TOKEN_ENCRYPTION_KEY=<long-random-value>
PROXIMA_CORS_ORIGINS=https://your-frontend.example
PROXIMA_PUBLIC_APP_URL=https://your-frontend.example
PROXIMA_PUBLIC_API_URL=https://your-api.example
PROXIMA_FRONTEND_CALLBACK_URL=https://your-frontend.example/dashboard/integrations
# Required to deliver password-reset links in production.
PROXIMA_SMTP_HOST=smtp.example.com
PROXIMA_SMTP_PORT=587
PROXIMA_SMTP_USERNAME=...
PROXIMA_SMTP_PASSWORD=...
PROXIMA_SMTP_FROM=Proxima <support@your-domain.example>
PROXIMA_SMTP_USE_TLS=true

# Frontend
PROXIMA_API_BASE_URL=https://your-api.example
NEXT_PUBLIC_PROXIMA_WS_URL=wss://your-api.example/ws
```

Add OpenAI, OAuth, Redis, Pinecone, and WhatsApp credentials only when you need those features. Never put secrets in the repository. Password resets require a working SMTP provider in production; the backend never returns reset tokens to a hosted browser.

## Deployment

The backend includes a `Dockerfile` and `Procfile`. The frontend is a standard Next.js app and can be deployed to Vercel or any Node host.

Before calling a deployment ready, check all of the following in the hosted environment:

1. The backend health endpoint responds publicly.
2. A fresh user can register, sign in, and refresh a session.
3. The dashboard connects to `wss://` without WebSocket errors.
4. A workflow reaches an approval step and can be completed.
5. The database survives an application restart.
6. Any OAuth callback used in the demo matches the deployed URL.

For a single-machine Docker development setup, run `docker compose up --build` from the repository root. It exposes the backend on port 8000 and the frontend on port 3001.

## Tests

Backend checks:

```powershell
cd backend
.\.venv\Scripts\python.exe -m compileall -q app
.\.venv\Scripts\python.exe -m pytest tests -q
```

Frontend checks:

```powershell
cd frontend
npm run type-check
npm run build
```

The latest local check completed with 13 passing backend tests and a successful frontend production build.

## Build Week notes

This project was developed and refined in Codex during OpenAI Build Week. Codex was used to trace the frontend and backend, implement and test the authentication and WebSocket flow, review local startup, and verify the production build. GPT-5.6 is configured for the workflow-planning path in the backend.

For the Devpost entry, include the primary Codex `/feedback` session ID and a short demo that shows a real workflow from request to approval. Keep the video, project description, and README consistent with what is in this repository.

## License

This project is licensed under the [MIT License](LICENSE).
