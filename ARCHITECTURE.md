# Multi-Tenant SaaS Architecture

This document describes the technical architecture of Agentic Tools Cloud, a multi-tenant SaaS platform built on top of the Model Context Protocol (MCP).

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Authentication & Authorization](#authentication--authorization)
- [Tenant Isolation](#tenant-isolation)
- [Real-Time Features](#real-time-features)
- [Caching Strategy](#caching-strategy)
- [API Design](#api-design)
- [Deployment Architecture](#deployment-architecture)

## Overview

Agentic Tools Cloud is designed as a **multi-tenant SaaS platform** from the ground up. Key architectural principles:

1. **Complete Tenant Isolation** - All data is strictly isolated by workspace/organization
2. **Horizontal Scalability** - Can scale to thousands of concurrent users
3. **Real-Time Collaboration** - WebSocket-based live updates
4. **API-First Design** - RESTful HTTP API with comprehensive documentation
5. **Security by Default** - Authentication required, RBAC enforced

## System Architecture

### High-Level Components

```
┌──────────────────────────────────────────────────────────────┐
│                      Load Balancer                           │
│                    (Nginx / Caddy)                           │
└────────────────────────┬─────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼────────┐            ┌────────▼────────┐
│  App Instance 1 │            │  App Instance 2 │
│   (Fastify)     │◄───Redis───┤   (Fastify)     │
└────────┬────────┘   Pub/Sub  └────────┬────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
         ┌───────────────▼───────────────┐
         │                               │
┌────────▼────────┐            ┌────────▼────────┐
│  SQLite (WAL)   │            │  Redis Cache    │
│  Primary DB     │            │  + Pub/Sub      │
└─────────────────┘            └─────────────────┘
```

### Application Layers

1. **Transport Layer** - Fastify HTTP server + Socket.IO WebSocket
2. **Authentication Layer** - JWT validation, user context injection
3. **Authorization Layer** - RBAC middleware, workspace access control
4. **Business Logic Layer** - MCP tools (27+ tools for tasks/memories)
5. **Storage Layer** - SQLite for persistence, Redis for caching
6. **Event Layer** - Redis Pub/Sub for real-time cross-instance communication

## Database Schema

### Core Tables

#### users
Primary user accounts with authentication credentials.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,          -- UUID
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- bcrypt with cost 12
  name TEXT,
  email_verified BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### organizations
Top-level tenant entities (billing happens here).

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,          -- org_xxxxx
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,    -- URL-friendly identifier
  plan_id TEXT NOT NULL,        -- free, pro, team, enterprise
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### organization_members
Maps users to organizations with roles.

```sql
CREATE TABLE organization_members (
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,           -- owner, admin, member
  joined_at TEXT NOT NULL,
  PRIMARY KEY (org_id, user_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### workspaces
Isolated environments within organizations.

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,          -- ws_xxxxx
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(org_id, slug),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_workspaces_org ON workspaces(org_id);
```

#### workspace_members
Fine-grained workspace access control.

```sql
CREATE TABLE workspace_members (
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,           -- admin, member, viewer
  added_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### projects
Project containers scoped to workspaces.

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,          -- proj_xxxxx
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_workspace ON projects(workspace_id);
```

#### tasks
Hierarchical task structure with unlimited nesting.

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,          -- task_xxxxx
  project_id TEXT NOT NULL,
  parent_id TEXT,               -- NULL = root task
  name TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL,         -- pending, in-progress, blocked, done
  priority INTEGER,             -- 1-10
  complexity INTEGER,           -- 1-10
  tags TEXT,                    -- JSON array
  depends_on TEXT,              -- JSON array of task IDs
  estimated_hours REAL,
  level INTEGER,                -- Auto-calculated depth
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

#### memories
Searchable agent memory storage.

```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,          -- mem_xxxxx
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  metadata TEXT,                -- JSON
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_memories_workspace ON memories(workspace_id);
CREATE INDEX idx_memories_category ON memories(category);
CREATE INDEX idx_memories_title ON memories(title);
```

#### subscriptions
Stripe subscription tracking.

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL,         -- active, canceled, past_due
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);
```

#### usage_tracking
Usage metrics for billing and analytics.

```sql
CREATE TABLE usage_tracking (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  workspace_id TEXT,
  metric_type TEXT NOT NULL,    -- api_request, task_created, memory_created
  value INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_usage_org_date ON usage_tracking(org_id, recorded_at);
```

## Authentication & Authorization

### JWT Token Flow

1. **Login**: User provides email/password
2. **Validation**: Bcrypt verify password hash
3. **Token Generation**: 
   - Access token (1 hour expiry)
   - Refresh token (7 days expiry, stored in DB)
4. **Token Claims**:
   ```json
   {
     "userId": "usr_xxxxx",
     "email": "user@example.com",
     "orgs": [
       {
         "orgId": "org_xxxxx",
         "role": "owner"
       }
     ],
     "iat": 1234567890,
     "exp": 1234571490
   }
   ```

### Request Flow

```
1. Client sends: Authorization: Bearer <jwt>
2. Fastify JWT hook validates token
3. Request context populated:
   {
     user: { userId, email, orgs },
     workspace: { id, orgId, role }  // from URL or token
   }
4. Authorization middleware checks:
   - User belongs to organization
   - User has access to workspace
   - User role permits action
5. Tool handler executes with context
6. All DB queries filtered by workspace_id
```

### Role-Based Access Control

**Organization Roles:**
- `owner` - Full control, billing, member management
- `admin` - Workspace creation, member invites
- `member` - Access to assigned workspaces only

**Workspace Roles:**
- `admin` - Full workspace control
- `member` - Create/edit tasks and memories
- `viewer` - Read-only access

## Tenant Isolation

### Database-Level Isolation

Every query MUST be scoped by workspace_id or org_id:

```typescript
// ❌ BAD - No tenant filtering
const tasks = db.select().from(tasksTable);

// ✅ GOOD - Tenant-scoped query
const tasks = db
  .select()
  .from(tasksTable)
  .where(
    and(
      eq(tasksTable.projectId, projectId),
      // Project belongs to workspace (checked via join)
      eq(projectsTable.workspaceId, context.workspaceId)
    )
  );
```

### Middleware Enforcement

```typescript
// src/middleware/workspace-access.ts
export async function enforceWorkspaceAccess(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { user } = request;
  const { workspaceId } = request.params;

  // Check if user has access to workspace
  const member = await db
    .select()
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.userId, user.userId)
      )
    )
    .get();

  if (!member) {
    return reply.code(403).send({ error: 'Access denied' });
  }

  // Inject workspace context
  request.workspaceContext = {
    workspaceId,
    role: member.role
  };
}
```

### Testing Tenant Isolation

Critical integration tests:

1. **User A cannot read User B's data** - Even with valid JWT
2. **Shared workspace access works** - User B can access if invited
3. **SQL injection attempts fail** - Parameterized queries only
4. **Cross-tenant joins prevented** - All joins verify workspace ownership

## Real-Time Features

### WebSocket Architecture

```
Client A ────┐
Client B ────┼──► Socket.IO ──► Redis Pub/Sub ──┐
Client C ────┘      (Instance 1)                 │
                                                 ├─► Broadcast
Client D ────┐                                   │
Client E ────┼──► Socket.IO ──► Redis Pub/Sub ──┘
Client F ────┘      (Instance 2)
```

### Event Types

```typescript
// Client subscribes to workspace
socket.emit('subscribe', { workspaceId: 'ws_xxxxx' });

// Server broadcasts events
socket.on('task:created', (data) => {
  // { taskId, workspaceId, task, createdBy }
});

socket.on('task:updated', (data) => {
  // { taskId, workspaceId, changes, updatedBy }
});

socket.on('task:deleted', (data) => {
  // { taskId, workspaceId, deletedBy }
});

socket.on('user:online', (data) => {
  // { userId, workspaceId, name }
});
```

### Event Emission Pattern

```typescript
// In tool handler after successful write
await db.insert(tasksTable).values(newTask);

// Emit event locally
io.to(`workspace:${workspaceId}`).emit('task:created', {
  taskId: newTask.id,
  workspaceId,
  task: newTask,
  createdBy: context.user.userId
});

// Publish to Redis for other instances
await redis.publish('workspace:events', JSON.stringify({
  workspaceId,
  event: 'task:created',
  data: { taskId: newTask.id, task: newTask }
}));
```

## Caching Strategy

### Redis Cache Keys

```
workspace:{id}:projects           # Project list (TTL: 5min)
workspace:{id}:tasks:{projectId}  # Task tree (TTL: 2min)
workspace:{id}:memories           # Memory list (TTL: 5min)
user:{id}:orgs                    # User's organizations (TTL: 1hour)
org:{id}:workspaces               # Org workspaces (TTL: 10min)
rate_limit:{userId}               # Rate limiting counter (TTL: 1hour)
```

### Cache Invalidation

```typescript
// On write operations
await db.insert(tasksTable).values(newTask);

// Invalidate affected caches
await redis.del(`workspace:${workspaceId}:tasks:${projectId}`);
await redis.del(`workspace:${workspaceId}:projects`);

// Emit invalidation event
await redis.publish('cache:invalidate', JSON.stringify({
  keys: [
    `workspace:${workspaceId}:tasks:${projectId}`,
    `workspace:${workspaceId}:projects`
  ]
}));
```

### Read-Through Cache

```typescript
async function getWorkspaceProjects(workspaceId: string) {
  const cacheKey = `workspace:${workspaceId}:projects`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss - query database
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.workspaceId, workspaceId));
  
  // Store in cache
  await redis.setex(cacheKey, 300, JSON.stringify(projects));
  
  return projects;
}
```

## API Design

### RESTful Endpoints

All endpoints follow REST conventions:

```
# Authentication
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me

# Organizations
GET    /organizations
POST   /organizations
GET    /organizations/:id
PATCH  /organizations/:id
DELETE /organizations/:id
POST   /organizations/:id/members
DELETE /organizations/:id/members/:userId

# Workspaces
GET    /workspaces
POST   /workspaces
GET    /workspaces/:id
PATCH  /workspaces/:id
DELETE /workspaces/:id

# Projects (workspace-scoped)
GET    /workspaces/:workspaceId/projects
POST   /workspaces/:workspaceId/projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id

# Tasks
GET    /projects/:projectId/tasks
POST   /projects/:projectId/tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id

# Memories
GET    /workspaces/:workspaceId/memories
POST   /workspaces/:workspaceId/memories
GET    /workspaces/:workspaceId/memories/search
GET    /memories/:id
PATCH  /memories/:id
DELETE /memories/:id
```

### Response Format

```json
{
  "data": { /* resource or array */ },
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 150
  }
}
```

### Error Format

```json
{
  "error": {
    "code": "WORKSPACE_NOT_FOUND",
    "message": "Workspace with ID 'ws_123' not found",
    "details": {}
  }
}
```

## Deployment Architecture

### Docker Compose (Single Server)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=sqlite:///data/db.sqlite
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./data:/app/data
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

### Kubernetes (Production)

```yaml
# Deployment with 3 replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agentic-tools-cloud
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agentic-tools-cloud
  template:
    spec:
      containers:
      - name: app
        image: agentic-tools-cloud:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        volumeMounts:
        - name: data
          mountPath: /app/data
```

### Scaling Considerations

1. **Horizontal Scaling**: Multiple app instances behind load balancer
2. **Sticky Sessions**: Not required (JWT in every request)
3. **WebSocket Scaling**: Redis Pub/Sub coordinates cross-instance events
4. **Database Scaling**: SQLite (single writer) or migrate to PostgreSQL
5. **Cache Scaling**: Redis Cluster for larger deployments

---

**Last Updated**: November 16, 2025
**Version**: 0.1.0
