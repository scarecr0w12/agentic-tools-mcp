# MCP Dashboard

> **Status**: ✅ Production Ready (v1.9.0)

An interactive web dashboard for visual task management with Kanban board, real-time monitoring, and MCP server integration.

## Features

### 🎯 Interactive Kanban Board

- **4-column workflow**: To Do, In Progress, Blocked, Done
- **Drag & drop tasks** between columns to update status
- **Visual priority indicators** with color-coded badges (P1-P10)
- **Complexity & time tracking** displayed on task cards
- **Tag management** for task organization
- **Real-time updates** via WebSocket integration

### 📊 Monitoring Panels

- **Metrics**: CPU usage, memory consumption, active tasks
- **Instances**: MCP server status and control
- **Logs**: Real-time log streaming with filtering

### 🔧 Full Task Management

- **Create tasks** with full metadata (priority, complexity, tags, hours)
- **Update tasks** via drag & drop or API
- **Delete tasks** with one click
- **Switch projects** via dropdown selector

## Quick Start

### From MCP Server (Recommended)

The easiest way to launch the dashboard is directly from the MCP server:

```bash
npx -y @pimzino/agentic-tools-mcp --dashboard
```

This automatically starts both backend and frontend servers.

### Manual Development

If you're developing the dashboard itself:

```bash
# Start backend (from dashboard/backend/)
cd dashboard/backend
npm install
npm run dev

# Start frontend (from dashboard/frontend/)
cd dashboard/frontend
npm install
npm run dev
```

## Configuration

### Environment Variables

**Backend**:

- `DASHBOARD_PORT` (default `4800`) - Backend server port
- `DASHBOARD_HOST` (default `0.0.0.0`) - Bind address
- `DASHBOARD_CORS` - Comma-separated CORS origins (default `http://localhost:5173`)
- `DASHBOARD_AUTOSTART=1` - Auto-launch configured MCP instances on boot
- `DASHBOARD_INSTANCES` - JSON array overriding the default instance list (see `backend/src/config.ts`)
- `DASHBOARD_MAX_LOGS` (default `5000`) - Maximum log entries to store
- `DASHBOARD_ENABLE_MOCKS=1` - Enable mock data generator for development

**MCP Instance Config**:

- `MCP_COMMAND` - Command to run MCP (default `npx`)
- `MCP_ARGS` - Comma-separated arguments (default `-y,@pimzino/agentic-tools-mcp`)
- `MCP_WORKING_DIRECTORY` - Working directory for MCP instance
- `MCP_LABEL` - Display name for instance (default `Local MCP`)
- `MCP_AUTORESTART=1` - Auto-restart on crash

## Architecture

```
┌─────────────────┐     REST/WS      ┌──────────────────┐     MCP Tools     ┌─────────────┐
│  React Frontend │ <──────────────> │  Fastify Backend │ <───────────────> │  MCP Server │
│   (Vite/TS)     │                  │  (Node/TS)       │                   │             │
└─────────────────┘                  └──────────────────┘                   └─────────────┘
     Port 5173                             Port 4800
```

### Technology Stack

**Frontend**:

- React 18 with TypeScript
- Vite for build tooling
- TanStack Query for state management
- Socket.IO client for real-time updates
- @hello-pangea/dnd for drag & drop
- Tailwind CSS for styling

**Backend**:

- Fastify with TypeScript
- Socket.IO for WebSockets
- Drizzle ORM with SQLite
- Pino for logging
- Child process spawning for MCP integration

## Project Structure

```
dashboard/
├── backend/
│   ├── src/
│   │   ├── config.ts           # Configuration loading
│   │   ├── index.ts            # Server entry point
│   │   ├── server.ts           # Fastify app builder
│   │   ├── types.ts            # TypeScript types
│   │   ├── db/                 # Database layer
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   └── ws/                 # WebSocket handlers
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx           # App entry point
│   │   ├── router.tsx         # TanStack Router
│   │   ├── hooks/             # React hooks
│   │   ├── lib/               # Utilities
│   │   ├── routes/            # Route components
│   │   ├── sections/          # Layout components
│   │   └── widgets/           # Dashboard widgets
│   └── package.json
│
├── data/                      # SQLite database storage
└── README.md                  # This file
```

## API Reference

### REST Endpoints

**Projects**:

- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `GET /api/projects/:projectId/tasks` - List project tasks

**Tasks**:

- `POST /api/projects/:projectId/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

**Monitoring**:

- `GET /api/instances` - List MCP instances
- `GET /api/metrics` - Get metrics
- `GET /api/logs` - Get logs
- `POST /api/instances/:id/actions` - Control instance (start/stop/restart)

### WebSocket Events

**Emitted by server**:

- `instance:status` - Instance status changed
- `tasks:update` - Task updated
- `log:entry` - New log entry
- `metrics:snapshot` - New metrics data

## Related Documentation

- [Dashboard User Guide](../docs/DASHBOARD_GUIDE.md) - End-user documentation
- [Dashboard Architecture](../docs/dashboard/ARCHITECTURE.md) - Technical architecture
- [Main README](../README.md) - Project overview
- [API Reference](../docs/API_REFERENCE.md) - MCP tools documentation
