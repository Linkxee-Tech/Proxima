# Proxima OS architecture

This diagram reflects the current repository implementation. The editable FigJam version is available here:

[Open the Proxima OS Architecture diagram in FigJam](https://www.figma.com/online-whiteboard/create-diagram/7cb59e2d-6bb7-408c-ba6b-a41edf1d7715?utm_source=other&utm_content=edit_in_figjam&oai_id=v1%2FDbNRtSfRjZu1YxQp4R4Q7Qn3QS1H6ox91lvA3M5cVr0bZqV3Cml1b4&request_id=91084815-d651-4919-be87-b73141205548&architecture=true)

```mermaid
flowchart LR
    subgraph client ["Client"]
        webApp["Browser and Next.js web app"]
    end

    subgraph gateway ["Gateway"]
        ingress["Next.js API proxy and FastAPI ingress"]
    end

    subgraph service ["Core Services"]
        fastapiApi["FastAPI API, auth, workflows, approvals, scheduler, and WebSocket"]
    end

    subgraph datastore ["Data Stores"]
        stateFile["Local JSON state file"]
        postgres["Optional PostgreSQL or Supabase"]
        uploads["Uploads volume and media files"]
    end

    subgraph external ["External Integrations"]
        openai["OpenAI API for social text and image generation"]
        oauthProviders["OAuth providers: Google, Slack, Notion, X, LinkedIn, Facebook"]
        whatsapp["WhatsApp Cloud API integration"]
    end

    webApp -->|"HTTPS API and WebSocket ingress"| ingress
    ingress -->|"Routes REST and realtime traffic"| fastapiApi
    fastapiApi -->|"Reads and writes state"| stateFile
    fastapiApi -->|"Optional persistent state"| postgres
    fastapiApi -->|"Stores uploaded and generated media"| uploads
    fastapiApi -.->|"Generates social drafts and images"| openai
    fastapiApi -.->|"Exchanges OAuth authorization codes"| oauthProviders
    fastapiApi -.->|"Uses configured messaging credentials"| whatsapp
```

## Runtime notes

- `frontend/app/api/[...path]/route.ts` proxies browser API requests to the backend `/api/v1` mount.
- The FastAPI process owns authentication, password recovery, workflows, approvals, memory, integrations, social publishing, metrics, and the authenticated `/ws` endpoint.
- Local JSON state is the default storage adapter. PostgreSQL/Supabase is an optional replacement selected by `PROXIMA_STORAGE_BACKEND=postgres`.
- Uploaded and generated media is stored below `PROXIMA_DATA_DIR/uploads` and served through `/media`.
- OpenAI and OAuth providers are optional external boundaries and require their corresponding environment variables.
- WhatsApp is represented as a server-managed integration boundary. It remains unconfigured without `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`; provider delivery still depends on the configured integration action.
