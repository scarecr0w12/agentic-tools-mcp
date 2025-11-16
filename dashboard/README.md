# MCP Control Dashboard

The `dashboard/` workspace houses the operational oversight tooling described in ../docs/dashboard/ARCHITECTURE.md.

## Layout
- `backend/` – Fastify + Socket.IO orchestrator that supervises MCP runtimes and exposes REST/WebSocket APIs.
- `frontend/` – React + Vite SPA that renders task queues, metrics, logs, and control surfaces.
- `shared/` – Reserved for shared schemas/types consumed by both runtime layers.

## Backend quick start
1. `cd dashboard/backend`
2. `npm install`
3. `npm run dev`

Key environment variables:
- `DASHBOARD_PORT` (default `4800`)
- `DASHBOARD_HOST` (default `0.0.0.0`)
- `DASHBOARD_CORS` comma-separated origins (default `http://localhost:5173`)
- `DASHBOARD_AUTOSTART=1` auto-launches configured MCP instances on boot
- `DASHBOARD_INSTANCES` JSON array overriding the default instance list (see `src/config.ts`)
- `MCP_COMMAND`, `MCP_ARGS`, `MCP_WORKING_DIRECTORY`, `MCP_LABEL`, `MCP_AUTORESTART` customize the fallback instance
- `DASHBOARD_MAX_LOGS` cap log retention (default `5000` entries)

## Frontend quick start
1. `cd dashboard/frontend`
2. `npm install`
3. `npm run dev`

Environment variables:
- `VITE_DASHBOARD_API` (REST origin, default `http://localhost:4800`)
- `VITE_DASHBOARD_WS` (WebSocket origin, default `http://localhost:4800`)
- `VITE_PROXY_API` optional Vite dev proxy target for `/api` + `/ws`

## Communication overview
- REST base path: `/api`
- WebSocket namespace: `/ws` (Socket.IO)
- Control endpoint: `POST /api/instances/:id/actions`
- Monitoring endpoints: `GET /api/instances`, `GET /api/tasks`, `GET /api/logs`, `GET /api/metrics`

Refer to `../docs/dashboard/ARCHITECTURE.md` for the detailed blueprint and roadmap.
