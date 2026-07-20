# Proxima

Proxima is a work companion for turning a written request into a clear plan. It prepares the next steps, keeps the work in one place, and asks for approval before an action is sent to a connected service.

## What it does

- Capture a work request and present a reviewable plan.
- Keep progress, approvals, results, and recent activity together.
- Draft social campaigns for selected platforms.
- Connect supported services through their own sign-in flows.
- Send a user-authored message through a connected Slack workspace.
- Deliver live updates to signed-in users.

Proxima has a Next.js web application and a FastAPI service. Local development uses a JSON data store. A PostgreSQL-compatible store can be selected for hosted environments.

## Project layout

```text
backend/       API, authentication, data storage, integrations, and tests
frontend/      Web application and public pages
docs/          Technical notes for contributors
.env.example   Backend environment template
```

## Run locally

### Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item ..\.env.example .env
.\start-local.ps1
```

Open `http://localhost:8000/` for the API reference or `http://localhost:8000/health` for the health check.

`0.0.0.0` is only a server bind address. Use `http://localhost:8000/` in a browser.

### Start the frontend

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`, create an account, and submit a request.

## Configuration

The backend reads `backend/.env`; the frontend reads `frontend/.env.local`. Do not commit either file.

For a hosted environment, configure these values with your hosting provider:

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

# Password reset email
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

Add provider credentials only for the services you intend to use. Keep all secrets in the hosting provider’s environment settings. In production, password reset links require a working SMTP provider.

## Deployment checklist

Before release, confirm that:

1. The backend health endpoint is public.
2. A new user can register, sign in, and reset a password.
3. The web application connects to the secure WebSocket endpoint.
4. A request can reach an approval step and be completed.
5. Persistent data survives an application restart.
6. Every enabled provider callback matches its deployed URL exactly.

The backend includes a `Dockerfile` and `Procfile`. The frontend can be deployed to Vercel or another Node.js host.

For a local Docker setup, run `docker compose up --build` from the repository root. The backend uses port 8000 and the frontend uses port 3001.

## Checks

Backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m compileall -q app
.\.venv\Scripts\python.exe -m pytest tests -q
```

Frontend:

```powershell
cd frontend
npm run typecheck
npm run build
```

## License

This project is available under the [MIT License](LICENSE).
