# Proxima AI-Native OS Architecture

This repository implements a connected starter architecture for the Proxima product plan:

- `packages/contracts` is the shared source of truth for REST endpoints, navigation, task, agent, artifact, and approval types.
- `packages/kernel` implements deterministic intent decomposition, DAG task generation, agent state, artifacts, approvals, and architecture metadata.
- `apps/api` exposes the backend endpoints consumed by clients.
- `apps/web` maps every product page to shared navigation and API routes.
- `apps/mobile` maps the same shared navigation to mobile screens.

The tests cross-check that every page has a mobile screen, every rendered web page is connected to an API route, task dependencies point to existing tasks, and high-risk execution is gated by approval.
