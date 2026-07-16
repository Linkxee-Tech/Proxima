# Proxima

This workspace contains Proxima OS, an approval-first AI-native workflow service.

## Final architecture (no alternatives)

| Layer | Exact choice |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, App Router |
| Backend | Python 3.11, FastAPI, Uvicorn |
| UI | React components with local shadcn-compatible Cards and CSS glass engine (cyan `#06b6d4`, purple `#a855f7`, deep-space `#0b0f19`) |
| Workflow | Durable JSON state with optional Redis queue; DAG execution through WebSocket events |
| AI and memory | OpenAI Responses API and Pinecone |
| Hosting | Railway: one frontend service and one Python/FastAPI backend service |

The primary dashboard is a 35/65 chat-and-DAG layout. The route surfaces are `/`, `/approvals`, `/memory`, `/history`, and `/settings`. Core components are `ChatPanel`, `MagicInput`, `DAGVisualizer`, `TerminalLog`, `ApprovalModal`, `ArtifactCard`, `Navbar`, and `Sidebar`.

Social publishing is a Tier 2 differentiator. A social goal produces this immutable plan: `Intent Parse → Draft Core Message → Tailor per Platform → Twitter / LinkedIn / Facebook / WhatsApp`. The Approval Center shows all four tailored previews and exposes one **Approve All** action. Twitter uses OAuth 2.0 PKCE; LinkedIn and Facebook use OAuth authorization-code connections; WhatsApp Business uses its server-side Cloud API token and explicit opt-in recipients. Tokens are AES-256-GCM encrypted at rest.

The Social Media Hub at `/social` creates platform-specific AI copy, accepts PNG/JPEG/WebP uploads up to the configured limit, and can generate a campaign image with `gpt-image-2`. The server stores only the generated/uploaded media reference and keeps publishing approval-first.

## Tier 2 on-track checklist

- [x] Async Loop — durable queue processing with optional Redis.
- [x] Memory Mesh — saved context includes brand voice and posting preferences.
- [x] Approval Center — external actions pause for explicit approval.
- [x] DAG Visualizer — platform-specific branches render in React Flow.
- [x] Self-Healing — failed integrations generate a non-executing repair proposal.
- [x] Multi-Platform Social Drafting — Proxima generates Twitter, LinkedIn, Facebook, and WhatsApp variations from one core message and previews them for approval.

- GPT-5.6 structured intent parsing and branched DAG planning through the Responses API
- consent-gated Gmail, Google Calendar, and Slack REST adapters
- WebSocket workflow events, durable jobs, Pinecone vector-memory adapter, artifact downloads, and local account auth
- Docker-isolated Codex bridge execution with no project-directory mount

## Run

1. Copy `.env.example` to your environment and configure the services you intend to use. `OPENAI_API_KEY` is required for real planning. Google and Slack actions require their respective credentials.

   For social publishing, configure the platform client credentials plus `PROXIMA_PUBLIC_APP_URL`, `PROXIMA_PUBLIC_API_URL`, and `PROXIMA_TOKEN_ENCRYPTION_KEY`. The OAuth redirect URI is `PROXIMA_PUBLIC_API_URL/api/v1/tools/{twitter|linkedin|facebook}/callback`. WhatsApp uses its Cloud API token and phone-number ID instead of OAuth.

2. Create a Python 3.11 environment, install the backend, and start FastAPI:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

3. In another terminal, start the frontend:

```bash
cd frontend
# Use Node.js 22 or 24 LTS. Node.js 25 is not supported by this project.
npm install
npm run dev
```

4. Open:

```text
http://localhost:3001
```

## Implementation Notes

- The dashboard uses WebSocket updates rather than interval polling.
- A task graph now renders explicit `dependsOn` relationships and can run independent ready nodes concurrently.
- Gmail, Calendar, Slack, Pinecone, Redis, Docker, and OpenAI are real adapters, but they cannot perform external work until their credentials/services are configured.
- Generated code only runs when `PROXIMA_ENABLE_SANDBOX=true`; the container is read-only, drops Linux capabilities, has resource limits, and does not mount this repository.
- The computer-use adapter intentionally requires an isolated, consented runner. It is not safe to expose arbitrary desktop control from the main API process.
- For a hosted frontend, set `PROXIMA_API_BASE_URL` to the backend HTTPS URL and `NEXT_PUBLIC_PROXIMA_WS_URL` to its `/ws` WSS URL. Docker Compose supplies local equivalents automatically.

## Verification

Run `python -m compileall -q app` and `python -m pytest tests -q` from `backend`, then run `npm run typecheck` and `npm run build` from `frontend`. Live integration verification requires the matching credentials and services above; secrets are never stored in the frontend.
