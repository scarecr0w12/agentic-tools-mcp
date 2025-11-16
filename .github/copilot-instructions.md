# Copilot Instructions - Agentic Tools MCP

## Project Overview

This is an MCP (Model Context Protocol) server providing AI agents with **task management** and **agent memories** capabilities. Built with TypeScript, it exposes 27+ tools through the MCP SDK's STDIO transport. The project includes a separate monitoring dashboard (`dashboard/`) and comprehensive AI-powered features like PRD parsing, task recommendations, and research integration.

## Architecture Fundamentals

### Dual Storage Systems
The project manages two independent storage systems under `.agentic-tools-mcp/`:
- **Task Management**: `tasks/tasks.json` (projects, tasks with unlimited hierarchy)
- **Agent Memories**: `memories/{category}/{title}.json` (individual JSON files per memory)

### Storage Modes
The server supports two operational modes via `--claude` flag:
- **Project-specific mode** (default): Each workspace has isolated `.agentic-tools-mcp/` storage
- **Global mode** (`--claude`): All data goes to `~/.agentic-tools-mcp/` or `C:\Users\{user}\.agentic-tools-mcp\`
  - Implementation: `src/utils/storage-config.ts` handles resolution via `resolveWorkingDirectory()`
  - When global mode is active, `workingDirectory` param in all tools is ignored

### Server Structure
**`src/server.ts`** (1100+ lines) is the core registration point for all 27 MCP tools:
- Tool registration pattern: Each tool has Zod schema validation + wrapped handler
- Common wrapper pattern: `createStorage()` → `tool.handler()` → error handling
- **Known issue**: Significant code duplication across tool registrations (see STRATEGIC_REVIEW.md)

### Feature Organization
```
src/features/
├── task-management/     # Projects, tasks, advanced AI tools
│   ├── models/          # TypeScript interfaces (Project, Task, Subtask-deprecated)
│   ├── storage/         # FileStorage class, full JSON read/write on operations
│   └── tools/           # 21 task-related MCP tools organized by function
└── agent-memories/      # Memory storage & retrieval
    ├── models/          # Memory interface
    ├── storage/         # Individual JSON file per memory
    └── tools/           # 6 memory CRUD operations
```

## Critical Development Patterns

### 1. Task Hierarchy Model (v1.8.0+)
**Unified task model** with unlimited nesting via `parentId` field:
```typescript
{
  id: string;
  parentId?: string;  // Enables unlimited hierarchy depth
  level?: number;     // Auto-calculated from parent chain
  // ... other fields (priority, complexity, dependsOn, status, tags, etc.)
}
```

**⚠️ Legacy Warning**: v1.8.2 removed deprecated `create_subtask`/`list_subtasks`/etc. tools to prevent data corruption. The migration from the old 3-level system (Project → Task → Subtask) to unified model happens automatically on server startup in `FileStorage.initialize()`.

### 2. Tool Creation Pattern
All tools follow this structure (example from `src/features/task-management/tools/tasks/create.ts`):
```typescript
export function createCreateTaskTool(storage: Storage) {
  return {
    handler: async (params: TaskInput) => {
      // Validate inputs (project exists, parentId valid, etc.)
      // Call storage methods
      // Return formatted result
    }
  };
}
```

### 3. Storage Layer Operations
`FileStorage` class performs full file read/write on most operations:
- `initialize()`: Creates directories, loads JSON, runs migration if needed
- Operations: Read entire `tasks.json` → modify in-memory → write entire file
- **Performance note**: Not optimized for large datasets (100s+ tasks)
- Migration check: `getMigrationStatus()` inspects `data.subtasks` array for legacy data

### 4. Memory Storage Architecture
Unlike tasks, memories use **individual JSON files**:
- Path: `.agentic-tools-mcp/memories/{category}/{sanitized-title}.json`
- Search: Multi-field text matching with relevance scoring (60% title, 30% content, 20% category)
- Implementation: `src/features/agent-memories/storage/file-storage.ts`

## Development Workflows

### Building & Testing
```bash
npm run build          # TypeScript compilation to dist/
npm run dev            # Watch mode with tsc --watch
npm test               # Vitest (configured but minimal tests exist)
npm run test:coverage  # Coverage report via v8
```

**⚠️ Testing Gap**: STRATEGIC_REVIEW.md identifies lack of automated tests as critical risk. Only one test exists: `test/features/task-management/storage/file-storage.test.ts`

### Running the Server
```bash
# Project-specific mode (each workspace isolated)
npx -y @pimzino/agentic-tools-mcp

# Global mode (single shared workspace)
npx -y @pimzino/agentic-tools-mcp --claude
```

### Dashboard Development
Separate monitoring interface under `dashboard/`:
- **Backend**: Fastify + Socket.IO on port 4800 (`dashboard/backend/`)
- **Frontend**: Vite + React on port 5173 (`dashboard/frontend/`)
- **Purpose**: Real-time MCP runtime supervision, metrics, logs (see `docs/dashboard/ARCHITECTURE.md`)

Start commands:
```bash
cd dashboard/backend && npm run dev   # Backend on :4800
cd dashboard/frontend && npm run dev  # Frontend on :5173
```

## Project-Specific Conventions

### 1. Tool Parameter Validation
All tools use Zod schemas with detailed descriptions. Example pattern:
```typescript
workingDirectory: z.string().describe(getWorkingDirectoryDescription(config))
```
The `getWorkingDirectoryDescription()` function dynamically adds notes about `--claude` flag behavior.

### 2. Error Handling in Tools
Server wraps all tool handlers with `wrapToolHandler()` that catches errors and returns formatted error responses:
```typescript
return {
  content: [{ type: 'text', text: `Error: ${error.message}` }],
  isError: true
};
```

### 3. Advanced AI Tools Require Both Storages
Tools like `research_task` need both task and memory storage:
```typescript
const storage = await createStorage(workingDirectory, config);
const memoryStorage = await createMemoryStorage(workingDirectory, config);
```

### 4. Timestamp Management
All entities use ISO 8601 strings for `createdAt`/`updatedAt` fields.

### 5. Migration Strategy
Legacy subtask migration runs automatically in `FileStorage.initialize()`:
- Checks `migration.version` field in `tasks.json`
- Converts `subtasks` array entries to tasks with `parentId`
- Updates `migration.version` to current package version
- **One-time process**: After migration, `subtasks` array remains empty

## Key Files to Reference

- **`src/server.ts`**: MCP tool registration (all 27 tools defined here)
- **`src/index.ts`**: Entry point, STDIO transport setup, CLI arg parsing
- **`src/utils/storage-config.ts`**: Global vs project-specific mode logic
- **`src/features/task-management/storage/file-storage.ts`**: Core task storage + migration
- **`src/features/agent-memories/storage/file-storage.ts`**: Memory storage implementation
- **`STRATEGIC_REVIEW.md`**: Technical debt analysis and architectural concerns
- **`docs/dashboard/ARCHITECTURE.md`**: Dashboard system design blueprint

## Common Pitfalls

1. **Don't use deprecated subtask tools** - They were removed in v1.8.2 to prevent data corruption
2. **Storage initialization required** - Always call `storage.initialize()` before operations
3. **Working directory validation** - Storage constructor checks directory accessibility
4. **Global mode ignores workingDirectory** - When `--claude` flag is active, all paths resolve to global directory
5. **Full file rewrites** - Current storage implementation reads/writes entire JSON file on operations; consider implications for large datasets
6. **Referential integrity** - Task deletion cascades to all child tasks; project deletion removes all tasks

## Integration Points

### MCP Client Configuration
Tools are exposed via MCP SDK's STDIO transport. Example Claude Desktop config:
```json
{
  "mcpServers": {
    "agentic-tools": {
      "command": "npx",
      "args": ["-y", "@pimzino/agentic-tools-mcp", "--claude"]
    }
  }
}
```

### VS Code Extension
Companion extension at `github.com/Pimzino/agentic-tools-mcp-companion` provides GUI for task/memory management. Data syncs via shared file storage.

### Dashboard Communication
Dashboard backend (`dashboard/backend/`) supervises MCP runtimes:
- REST API on `/api/*` endpoints
- WebSocket events via Socket.IO on `/ws`
- Environment variables: `DASHBOARD_PORT`, `DASHBOARD_HOST`, `DASHBOARD_CORS`, `DASHBOARD_AUTOSTART`

## Versioning & Release Notes

Current version: **1.9.0** (see `package.json`)

Version scheme:
- Major: Breaking changes (e.g., v1.8.0 unified task model)
- Minor: New features (e.g., v1.9.0 dashboard integration)
- Patch: Bug fixes and critical updates

Always check `CHANGELOG.md` for migration notes when upgrading versions.

## Latest Changes (v1.9.0)

### Dashboard Integration
The dashboard is now fully integrated with the MCP server via CLI flags:
- **`--dashboard` flag**: Auto-launches both backend (port 4800) and frontend (port 5173)
- **`--dashboard-port` flag**: Customize backend port (default 4800)
- **Dashboard launcher**: `src/utils/dashboard-launcher.ts` manages process spawning and cleanup

### Interactive Kanban Board
New frontend widget `dashboard/frontend/src/widgets/kanban-board.tsx`:
- 4-column workflow (To Do, In Progress, Blocked, Done)
- Drag & drop tasks between columns with @hello-pangea/dnd
- Full CRUD operations (create, update, delete tasks)
- Real-time updates via WebSocket
- Priority/complexity/tag badges
- Project switching support

### Backend API Routes
New routes file `dashboard/backend/src/routes/projects.ts`:
- REST API for projects and tasks management
- Proxies MCP tool calls via child process stdio communication
- Endpoints: GET/POST /api/projects, GET /api/projects/:id/tasks, POST/PATCH/DELETE tasks

### Documentation
- **docs/DASHBOARD_GUIDE.md**: Comprehensive user guide for dashboard features
- **dashboard/README.md**: Updated developer documentation with architecture and API reference
- **CHANGELOG.md**: Full v1.9.0 release notes
