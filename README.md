# Proxima

Proxima is a work companion for turning a written request into prepared, reviewable work. It keeps plans, drafts, approvals, connected accounts, and activity in one place so the user remains in control of what is sent or scheduled.

## What it does

- Turn a work request into a plan and an editable prepared draft.
- Improve a prepared draft with the configured OpenAI model, then save or download it.
- Keep progress, approvals, results, history, and saved work together.
- Generate channel-specific social drafts, edit them, and approve them for delivery.
- Select a connected X, LinkedIn, or Facebook account when more than one is available.
- Schedule a one-time campaign or run a recurring daily or weekly topic series until it is stopped.
- Connect supported services through their own sign-in flows.
- Send a user-authored message through a connected Slack workspace.
- Deliver live updates to signed-in users.

Proxima has a Next.js web application and a FastAPI service. Local development uses a JSON data store. A PostgreSQL-compatible store can be selected for hosted environments.

## Built with Codex and GPT-5.6

I used Codex throughout the build to work through the frontend and backend request paths, improve the approval and campaign flows, trace integration problems, add regression tests, and keep the README and architecture notes aligned with the code.

GPT-5.6 is used by Proxima to prepare first-pass work drafts and channel-specific social copy when `OPENAI_API_KEY` is configured. These responses are drafts, not automatic decisions: a user can edit them, save them, and decide whether an external action should be approved or scheduled.

The project deliberately keeps this boundary visible. Provider actions require a connected account and the right credentials, while approvals and delivery results make it clear what was requested, what was sent, and what a provider accepted or rejected.

## Social campaigns

The Campaigns workspace creates editable drafts for X, LinkedIn, Facebook Pages, and WhatsApp Business. A saved campaign appears in **Needs Your Approval** and can be published immediately or scheduled. Delivery results are stored per provider so the interface does not report a post as sent when a provider rejected it.

The **Recurring campaigns** workspace turns one topic, such as “Cyber security,” into a series of subtopics. It generates and posts the next instalment at the selected daily or weekly cadence until the user stops the campaign.

Before enabling publishing, connect the appropriate accounts in **Connected Apps**. Use **Add account** to connect another X, LinkedIn, or Facebook account. WhatsApp Business sends a direct message, so it requires an opted-in recipient and valid Cloud API credentials.

Text publishing is implemented. Images remain available in campaign previews, but provider-specific media upload flows are not yet implemented, so an image is not silently claimed as published.

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
PROXIMA_SOCIAL_SCHEDULER_INTERVAL_SECONDS=30
PROXIMA_LINKEDIN_API_VERSION=202606
PROXIMA_META_GRAPH_API_VERSION=v22.0
FACEBOOK_PAGE_ID=

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
7. A social post can be approved and its provider result appears in Campaigns.
8. The scheduled-post worker stays available for every campaign that needs exact delivery times.

Recurring and scheduled campaigns are checked by the backend while it is running. A host that sleeps inactive services cannot guarantee an exact posting time; use an always-on worker or host for reliable scheduling.

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
