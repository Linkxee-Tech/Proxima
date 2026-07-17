# Proxima OS

Proxima OS is an approval-first AI workflow application. Users describe a goal, Proxima creates a visible workflow plan, pauses high-impact actions for approval, and exposes the result through a dark glass dashboard.

## What is in this repository

| Area | Implementation |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, App Router |
| Backend | Python 3.11, FastAPI, Uvicorn |
| State | Durable local JSON in `.proxima-data`; optional PostgreSQL adapter |
| Workflow UI | React Flow/Dagre task graph, approval center, audit trail, artifacts |
| Authentication | Local account registration/login with JWT access/refresh tokens and HttpOnly cookies |
| Integrations | Gmail, Calendar, Slack, Notion, X/Twitter, LinkedIn, Facebook, and server-managed WhatsApp |
| Realtime | Authenticated WebSocket at `/ws` with heartbeat/reconnect handling |
| Styling | Local CSS glass UI with reusable inline SVG icons |

The repository does not use Supabase authentication. Pinecone, Redis, OpenAI, OAuth providers, and WhatsApp become active only when their corresponding backend environment variables and external services are configured. Without them, supported local fallbacks remain available where implemented.

## Root layout

```text
backend/       FastAPI application, routes, adapters, tests
frontend/      Next.js application and UI components
.env.example   Backend environment template
docker-compose.yml  Local backend/frontend development services
README.md      Project documentation
```

## Frontend routes

Public routes:

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

Protected workspace routes:

- `/dashboard`
- `/dashboard/approvals`
- `/dashboard/memory`
- `/dashboard/history`
- `/dashboard/social`
- `/dashboard/settings`
- `/dashboard/integrations`
- `/approvals`, `/memory`, `/history`, `/social`, `/settings`, `/integrations`

The Next.js API proxy maps browser requests from `/api/*` to the backend `/api/v1/*`. Set `PROXIMA_API_BASE_URL` for a hosted backend. WebSocket configuration accepts `NEXT_PUBLIC_PROXIMA_WS_URL` or `NEXT_PUBLIC_WS_URL`.

## Backend API

The API is mounted at `/api/v1` and exposed through the frontend proxy. The backend also provides:

- `/health` and `/api/v1/health`
- `/docs` and `/api/v1/docs`
- `/openapi.json` and `/api/v1/openapi.json`
- `/api/v1/auth/*` for registration, login, refresh, logout, profile, and password recovery
- `/api/v1/workflows`, `/api/v1/deploy`, `/api/v1/intent`, and workflow artifact downloads
- `/api/v1/approvals`, `/api/v1/history`, `/api/v1/memory`, and `/api/v1/metrics`
- `/api/v1/tools` for integration status, OAuth connect/callback/disconnect, and consent-scoped execution
- `/api/v1/social` for drafts, uploads, approval-first publishing, scheduled posts, and analytics
- `/ws` for authenticated realtime events

Password recovery uses one-time, expiring, hashed reset tokens. The UI is available at `/forgot-password` and `/reset-password`. Because no mail provider is bundled, `PROXIMA_EXPOSE_RESET_TOKEN=true` is supported only for disposable local development; keep it `false` in production and connect token delivery to a mail service.

WhatsApp Business is server-managed rather than OAuth. It requires both `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`; a missing token is reported as unconfigured rather than treated as connected.

## Environment configuration

Copy the templates before starting:

```powershell
Copy-Item .env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

At minimum, production requires:

```env
PROXIMA_JWT_SECRET=<long-random-secret>
PROXIMA_TOKEN_ENCRYPTION_KEY=<fernet-key-or-random-secret>
PROXIMA_CORS_ORIGINS=https://your-frontend.example
PROXIMA_PUBLIC_APP_URL=https://your-frontend.example
PROXIMA_PUBLIC_API_URL=https://your-api.example
```

Set `PROXIMA_STORAGE_BACKEND=postgres` and `PROXIMA_DATABASE_URL` only when the PostgreSQL connection is available. Keep `PROXIMA_ALLOW_INSECURE_LOCAL_AUTH=false` in production. Never commit `backend/.env` or `frontend/.env.local`.

## Local development

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

Use Node.js 22 or 24 LTS; the project engine is `>=22 <25`.

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000` unless your environment maps the frontend to another port.

### Docker Compose

From the repository root:

```powershell
docker compose up --build
```

Compose runs FastAPI on port `8000` and the Next.js development server on port `3001`.

## Verification

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

The current local verification is green: **11 backend tests pass**, Python compilation passes, and the frontend type-check/build pass with 21 generated routes. There is currently no standalone `npm run lint` script. Live provider connectivity, OAuth completion, Vercel/Render deployment, custom domains, SSL, performance budgets, browser-console checks, and external service health require credentials and hosted environments; they are not claimed as locally verified.
