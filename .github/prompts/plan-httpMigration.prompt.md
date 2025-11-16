# Plan: Fork agentic-tools-mcp to Create Multi-Tenant SaaS Platform

This plan outlines the strategy to **fork the agentic-tools-mcp project** into a new repository for building a multi-tenant SaaS platform. The new project will transform the STDIO-based MCP server into an HTTP-based REST API with full multi-tenancy, authentication, billing, and team collaboration features.

## Why Fork?

**Strategic Reasons:**
- **Different use cases:** Local CLI tools vs cloud-hosted SaaS platform
- **Independent evolution:** SaaS features shouldn't constrain the original project
- **Separate audiences:** Open-source users vs paying SaaS customers
- **Licensing flexibility:** Original stays MIT, SaaS may need commercial license
- **Branding:** Distinct product identity and marketing
- **Development velocity:** SaaS team can move faster without breaking original

**Technical Reasons:**
- **Architecture divergence:** SQLite multi-tenant DB vs simple JSON files
- **Dependencies:** SaaS adds Stripe, Redis, email services, etc.
- **Deployment complexity:** Docker + Kubernetes vs simple npx command
- **Testing requirements:** Multi-tenant integration tests vs local unit tests
- **Documentation split:** API reference vs CLI tool docs

## Repository Structure

### Original Repository (agentic-tools-mcp)
**Focus:** Local MCP tools for individual developers
- STDIO transport (primary)
- JSON file storage
- No authentication required
- Single workspace per instance
- Simple npx installation
- MIT License
- Target: VS Code + Claude Desktop users

### New Repository (agentic-tools-cloud) 
**Focus:** Multi-tenant SaaS platform
- HTTP/WebSocket transport (primary)
- SQLite + Redis storage
- Full authentication & authorization
- Multi-tenant organizations & workspaces
- Docker deployment
- Commercial license (or AGPL)
- Target: Teams, enterprises, SaaS customers

## Fork Strategy

## Fork Strategy

### Phase 0: Repository Setup (Week 1)

**Actions:**
1. **Create new repository:** `agentic-tools-cloud` or `agentic-saas`
2. **Fork from main branch** of `agentic-tools-mcp` at stable commit
3. **Update package.json:**
   ```json
   {
     "name": "@scarecr0w12/agentic-tools-cloud",
     "version": "0.1.0",
     "description": "Multi-tenant SaaS platform for AI-powered task and memory management",
     "repository": "github:scarecr0w12/agentic-tools-cloud"
   }
   ```
4. **Create new README.md** focused on SaaS offering
5. **Add LICENSE** - Choose commercial or AGPL license
6. **Set up CI/CD** - GitHub Actions for automated testing and deployment
7. **Configure dependabot** - Automated dependency updates
8. **Create project board** - Track all 7 phases of development
9. **Set up environments:**
   - Development (local)
   - Staging (staging.agentic-tools.cloud)
   - Production (app.agentic-tools.cloud)

**Documentation:**
- `README.md` - SaaS platform overview, features, getting started
- `ARCHITECTURE.md` - Technical architecture and design decisions
- `CONTRIBUTING.md` - How to contribute to the SaaS platform
- `docs/DEPLOYMENT.md` - Production deployment guide
- `docs/API.md` - HTTP API reference
- `docs/MIGRATION.md` - For users migrating from local version

**Relationship with Original:**
- Fork maintains link to upstream (can cherry-pick tool improvements)
- Original repo links to SaaS version in README: "Looking for a hosted solution? Check out [Agentic Tools Cloud](https://github.com/scarecr0w12/agentic-tools-cloud)"
- Shared tool logic can be extracted to common npm package if needed

## Steps

### 1. Establish test coverage, resolve discrepancies, and migrate to SQLite

Add Vitest integration tests for all 27 tools via STDIO transport. Investigate missing `update_task` and `delete_task` registrations in `src/server.ts`. Refactor the 513-line server file to extract a `createToolRegistration()` helper function. **Migrate from JSON file storage to SQLite as the foundation for multi-tenancy.**

**Actions:**
- Install and configure Vitest if not already present
- Write integration tests for each of the 20+ registered tools
- Verify `update_task` and `delete_task` tool implementations exist and register them
- Create `src/utils/tool-registration.ts` helper to reduce duplication in `src/server.ts`
- Target >70% test coverage on critical paths before proceeding

**SQLite Migration (Multi-Tenancy Foundation):**
- Install `better-sqlite3` for SQLite database
- Design database schema with multi-tenancy in mind:
  - `users` table: id, email, password_hash, created_at, updated_at
  - `organizations` table: id, name, slug, plan, created_at, updated_at
  - `organization_members` table: org_id, user_id, role (owner/admin/member)
  - `workspaces` table: id, org_id, name, slug, storage_path, created_at
  - `workspace_members` table: workspace_id, user_id, role
  - `projects` table: id, workspace_id, name, description, created_at, updated_at
  - `tasks` table: id, project_id, parent_id, name, status, priority, etc.
  - `memories` table: id, workspace_id, title, content, category, created_at
- Create migration scripts in `src/db/migrations/`
- Implement new `src/features/task-management/storage/sqlite-storage.ts`
- Implement new `src/features/agent-memories/storage/sqlite-storage.ts`
- Add data migration script to convert existing JSON files to SQLite
- Update storage interface to be tenant-aware (all operations scoped by workspace_id)
- Add database connection pooling for concurrent requests
- Implement database initialization on server startup

### 2. Add HTTP transport layer alongside STDIO

Install `fastify` and `@fastify/cors`. Create `src/transports/http.ts` that maps MCP tools to REST endpoints (e.g., `list_projects` → `GET /api/projects`, `create_task` → `POST /api/projects/:projectId/tasks`). Add `--http` CLI flag to `src/index.ts` for transport selection.

**Actions:**
- Add dependencies: `fastify`, `@fastify/cors`, `@fastify/rate-limit`
- Create `src/transports/http.ts` with Fastify server setup
- Implement tool-to-route mapping function that converts MCP tool schemas to REST endpoints
- Add HTTP configuration parsing to `src/utils/storage-config.ts`
- Update `src/index.ts` to support both `--stdio` (default) and `--http` modes
- Ensure both transports work in parallel (can run two instances simultaneously)

**REST Endpoint Mapping:**
```
MCP Tool                    → HTTP Endpoint
─────────────────────────────────────────────────────────
list_projects               → GET /api/projects
create_project              → POST /api/projects
get_project                 → GET /api/projects/:id
update_project              → PATCH /api/projects/:id
delete_project              → DELETE /api/projects/:id

list_tasks                  → GET /api/projects/:projectId/tasks
create_task                 → POST /api/projects/:projectId/tasks
get_task                    → GET /api/tasks/:id
update_task                 → PATCH /api/tasks/:id
delete_task                 → DELETE /api/tasks/:id

create_memory               → POST /api/memories
search_memories             → GET /api/memories/search
get_memory                  → GET /api/memories/:id
list_memories               → GET /api/memories
update_memory               → PATCH /api/memories/:id
delete_memory               → DELETE /api/memories/:id

parse_prd                   → POST /api/projects/:projectId/prd-import
get_next_task_recommendation → GET /api/recommendations/next-task
analyze_task_complexity     → POST /api/tasks/analyze-complexity
infer_task_progress         → POST /api/tasks/infer-progress
research_task               → POST /api/tasks/:id/research
generate_research_queries   → POST /api/research/generate-queries
```

### 3. Implement authentication, user management, and multi-tenant workspace isolation

Build complete user authentication system with JWT tokens, user registration/login, and organization-based multi-tenancy. Implement role-based access control (RBAC) for workspaces. All database queries must be tenant-scoped to prevent data leakage.

**Actions:**
- Install authentication dependencies: `bcrypt`, `jsonwebtoken`, `@fastify/jwt`
- Create `src/features/auth/` module:
  - `models/user.ts` - User, Organization, OrganizationMember interfaces
  - `services/auth-service.ts` - User registration, login, password reset
  - `services/token-service.ts` - JWT generation, validation, refresh tokens
  - `middleware/auth.ts` - JWT validation, user context injection
  - `middleware/workspace-access.ts` - Verify user has access to workspace
- Create user management routes in `src/features/auth/routes/`:
  - `POST /auth/register` - User registration
  - `POST /auth/login` - User login (returns JWT)
  - `POST /auth/logout` - Invalidate refresh token
  - `POST /auth/refresh` - Refresh access token
  - `POST /auth/forgot-password` - Initiate password reset
  - `POST /auth/reset-password` - Complete password reset
  - `GET /auth/me` - Get current user info
- Create organization management routes:
  - `POST /organizations` - Create new organization
  - `GET /organizations` - List user's organizations
  - `GET /organizations/:id` - Get organization details
  - `PATCH /organizations/:id` - Update organization
  - `POST /organizations/:id/members` - Invite member
  - `DELETE /organizations/:id/members/:userId` - Remove member
- Create workspace management routes:
  - `POST /workspaces` - Create workspace (org-scoped)
  - `GET /workspaces` - List accessible workspaces
  - `GET /workspaces/:id` - Get workspace details
  - `PATCH /workspaces/:id` - Update workspace
  - `DELETE /workspaces/:id` - Delete workspace
  - `POST /workspaces/:id/members` - Share workspace with user
  - `DELETE /workspaces/:id/members/:userId` - Revoke access
- Update all tool routes to:
  - Require authentication (JWT in Authorization header)
  - Extract workspace_id from URL path (`/workspaces/:workspaceId/projects`)
  - Verify user has access to workspace via middleware
  - Pass workspace context to storage layer
- Implement rate limiting with per-user quotas:
  - Free tier: 100 req/hour
  - Pro tier: 1000 req/hour
  - Enterprise: Unlimited
- Add environment variables: `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`

**Security Considerations:**
- Hash passwords with bcrypt (cost factor 12)
- Use secure JWT secrets (minimum 256 bits)
- Implement refresh token rotation
- Add CSRF protection for browser clients
- Store refresh tokens in database (can be revoked)
- Implement account lockout after failed login attempts
- Add email verification for new accounts
- Log all authentication events for audit trail
- Implement tenant isolation at database query level
- Add SQL injection prevention (parameterized queries)
- Validate all workspace access before any data operation

### 4. Migrate dashboard to HTTP client

Remove `dashboard/backend/src/services/mcp-bridge.ts` STDIO bridge. Create HTTP client in `dashboard/backend/src/services/mcp-client.ts`. Update `dashboard/backend/src/routes/projects.ts` and related routes to call HTTP endpoints instead of spawning child processes.

**Actions:**
- Delete `dashboard/backend/src/services/mcp-bridge.ts` (STDIO child process manager)
- Create `dashboard/backend/src/services/mcp-client.ts` with HTTP client:
  - Use `fetch` or `axios` for HTTP requests
  - Handle authentication (API key injection)
  - Implement retry logic and error handling
  - Support configurable MCP server base URL
- Update `dashboard/backend/src/routes/projects.ts` to use HTTP client
- Update `dashboard/backend/src/routes/tasks.ts` to use HTTP client
- Add environment variable: `MCP_HTTP_URL` (default: `http://localhost:3000`)
- Remove direct file system access patterns from dashboard routes
- Test full stack: Browser → Dashboard Backend → MCP HTTP Server

**Configuration Update:**
```typescript
// dashboard/backend/src/config.ts
export interface DashboardConfig {
  // ... existing fields
  mcpServerUrl: string;      // HTTP endpoint instead of command/args
  mcpApiKey: string;         // Authentication
  mcpWorkspaceId: string;    // Target workspace
}
```

### 5. Optimize multi-tenant database performance and caching

Implement Redis caching layer for frequently accessed data, optimize database queries with proper indexes, and add connection pooling. Ensure all queries are tenant-scoped and performant under high concurrent load.

**Actions:**
- Install Redis dependencies: `redis`, `ioredis`
- Set up Redis connection with connection pooling
- Implement caching layer in `src/cache/`:
  - `cache-service.ts` - Redis operations with TTL
  - Cache keys scoped by workspace: `workspace:{id}:projects`, `workspace:{id}:tasks:{projectId}`
  - Implement cache invalidation on write operations
  - Add cache statistics and hit/miss metrics
- Optimize SQLite database:
  - Add indexes on frequently queried columns:
    - `workspaces.org_id`, `projects.workspace_id`, `tasks.project_id`
    - `tasks.status`, `tasks.priority` (for filtering)
    - `memories.workspace_id`, `memories.category`
  - Enable WAL mode for better concurrent read performance
  - Set appropriate cache size and page size
  - Add EXPLAIN QUERY PLAN analysis for slow queries
- Implement database connection pooling:
  - Use connection pool for concurrent request handling
  - Configure pool size based on expected load
  - Add connection timeout and retry logic
- Add query performance monitoring:
  - Log slow queries (>100ms)
  - Track query execution times
  - Identify N+1 query problems
- Run multi-tenant load tests:
  - Simulate 100+ concurrent users across 50+ workspaces
  - Test workspace isolation (no cross-tenant data leakage)
  - Verify cache hit rates (target >80% for reads)
  - Benchmark database performance (target <50ms p95 latency)
- Implement database backup strategy:
  - Daily automated backups
  - Point-in-time recovery capability
  - Backup verification process

**Performance Targets:**
- Read operations: <50ms p95 latency (with cache)
- Write operations: <100ms p95 latency
- Cache hit rate: >80% for read-heavy endpoints
- Support 1000+ concurrent users across 500+ workspaces
- Database size: Efficient up to 10GB+ (100k+ tasks)

### 6. Production hardening and documentation

Add Prometheus metrics for tool latency. Write OpenAPI specification for all HTTP endpoints. Create Docker deployment configuration. Document authentication flows, workspace setup, and migration guide for existing STDIO users.

**Actions:**
- Install `prom-client` for Prometheus metrics
- Add metrics collection:
  - Tool execution duration histogram
  - Request rate counter
  - Error rate counter
  - Storage operation latency
- Create `openapi.yaml` with full API specification:
  - All endpoints documented
  - Request/response schemas
  - Authentication requirements
  - Example requests
- Create `Dockerfile` and `docker-compose.yml`:
  ```yaml
  services:
    mcp-server:
      image: agentic-tools-mcp:http
      ports:
        - "3000:3000"
      environment:
        - HTTP_PORT=3000
        - API_KEY=your-secret-key
      volumes:
        - ./workspaces:/app/workspaces
  ```
- Write documentation:
  - `docs/HTTP_MIGRATION_GUIDE.md` - For existing users
  - `docs/HTTP_API_REFERENCE.md` - Complete endpoint documentation
  - `docs/AUTHENTICATION.md` - Auth setup and best practices
  - `docs/DEPLOYMENT.md` - Production deployment guide
  - `docs/MULTI_TENANCY.md` - Multi-tenant architecture guide
- Update `README.md` with HTTP mode examples

### 7. SaaS-specific features and billing integration

Implement subscription management, usage tracking, billing integration, and admin dashboard for SaaS operations. Add features for team collaboration, workspace limits, and usage analytics.

**Actions:**
- Create subscription and billing system:
  - Add `subscriptions` table: id, org_id, plan_id, status, current_period_start, current_period_end
  - Add `plans` table: id, name, price, features (JSON), limits (JSON)
  - Add `usage_tracking` table: id, org_id, workspace_id, metric_type, value, recorded_at
  - Implement plan tiers:
    - **Free**: 1 workspace, 100 tasks, 50 memories, 100 req/hour
    - **Pro**: 10 workspaces, unlimited tasks/memories, 1000 req/hour, $29/month
    - **Team**: 50 workspaces, team collaboration, 5000 req/hour, $99/month
    - **Enterprise**: Unlimited, custom limits, SLA, dedicated support
- Integrate Stripe for payment processing:
  - Install `stripe` SDK
  - Create `src/features/billing/` module
  - Implement webhook handlers for subscription events
  - Add payment method management routes
  - Handle subscription lifecycle (create, upgrade, downgrade, cancel)
  - Implement proration for plan changes
- Add usage metering and enforcement:
  - Track API requests per organization
  - Count tasks, projects, memories per workspace
  - Enforce plan limits (reject requests if exceeded)
  - Display usage in dashboard
  - Send usage alerts (80%, 90%, 100% of limits)
- Create admin dashboard routes:
  - `GET /admin/stats` - System-wide statistics
  - `GET /admin/organizations` - List all organizations
  - `GET /admin/users` - List all users
  - `POST /admin/organizations/:id/suspend` - Suspend organization
  - `POST /admin/users/:id/reset-password` - Admin password reset
  - `GET /admin/usage` - Usage analytics across all tenants
- Implement team collaboration features:
  - Real-time task updates via WebSocket
  - Task comments and activity log
  - @mentions for team members
  - Task assignments and notifications
  - Workspace activity feed
- Add email notifications:
  - Welcome email on registration
  - Email verification
  - Password reset emails
  - Subscription renewal reminders
  - Usage limit warnings
  - Team collaboration notifications (mentions, assignments)
- Implement audit logging:
  - Log all CRUD operations with user context
  - Track login attempts and IP addresses
  - Store audit logs for compliance (GDPR, SOC2)
  - Provide audit log export for enterprises
- Add workspace templates:
  - Pre-configured project templates
  - Sample tasks for onboarding
  - Import/export workspace functionality
- Implement data export and portability:
  - `GET /workspaces/:id/export` - Export all data as JSON
  - Support GDPR data portability requirements
  - Allow users to delete all their data

**Environment Variables:**
```bash
# Billing & Subscriptions
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email (e.g., SendGrid, AWS SES)
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=SG...
EMAIL_FROM=noreply@agentic-tools.com

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Feature Flags
FEATURE_BILLING_ENABLED=true
FEATURE_TEAM_COLLABORATION=true
FEATURE_USAGE_LIMITS=true
```

## Further Considerations

### 1. Storage backend migration

**Decision:** Migrate to SQLite in Phase 1 as the foundation for multi-tenant SaaS architecture.

**Rationale:**
- **Multi-tenancy requires database:** File-based storage cannot support efficient multi-tenant queries and workspace isolation
- **ACID transactions:** Critical for data integrity with concurrent users
- **Performance:** SQLite with proper indexes handles 1000s of tasks efficiently
- **Advanced features:** Enables filtering, sorting, pagination, full-text search
- **Scalability path:** Can later migrate to PostgreSQL for horizontal scaling

**Implementation Approach:**
- Use `better-sqlite3` for synchronous, high-performance SQLite access
- Design schema with tenant isolation (workspace_id in all tables)
- Add comprehensive indexes for multi-tenant queries
- Implement connection pooling for concurrent requests
- Create migration script to convert existing JSON files
- Keep JSON file support for backward compatibility (STDIO mode only)

**Migration Strategy:**
- SQLite becomes the primary storage for HTTP mode
- STDIO mode can continue using JSON files (optional)
- Provide migration tool: `npx agentic-tools-mcp migrate-to-sqlite`

### 2. Multi-tenancy scope

**Decision:** Implement full multi-tenancy with user accounts from the start (Phase 3).

**Rationale:**
- **SaaS is the goal:** Building single-tenant first requires complete refactoring later
- **Architecture decisions matter:** Database schema, authentication, and API design must be multi-tenant from day one
- **Time to market:** Better to take extra 4 weeks now than 12 weeks of refactoring later
- **Competitive advantage:** SaaS-ready MCP server differentiates from competitors

**Implementation Approach:**
- Organizations own multiple workspaces
- Users can be members of multiple organizations
- Workspaces can be shared with specific users (collaboration)
- Role-based access control: owner, admin, member, viewer
- All API routes scoped by workspace ID
- Database queries always filtered by workspace/org context

**Organization Structure:**
```
Organization "Acme Corp"
  ├── Workspace "Marketing"
  │   ├── Project "Q1 Campaign"
  │   └── Project "Website Redesign"
  ├── Workspace "Engineering"
  │   ├── Project "API Rewrite"
  │   └── Project "Mobile App"
  └── Members: alice@acme.com (owner), bob@acme.com (admin)
```

**Backward Compatibility:**
- STDIO mode continues to use local file storage
- HTTP mode requires authentication by default
- Environment variable `AUTH_REQUIRED=false` for development/testing

### 3. Tool registration discrepancy

**Question:** Research found only 20 tool registrations in `server.ts` despite documentation claiming 27 tools. `update_task` and `delete_task` imports exist but aren't registered. Should these be added, or is the documentation outdated?

**Investigation needed:**
- Verify if `update_task` and `delete_task` tool implementations exist in `src/features/task-management/tools/tasks/`
- Check git history to see if these tools were removed or never completed
- Search for references to these tools in tests, docs, dashboard code
- Compare with `list_subtasks`, `create_subtask` tools (deprecated in v1.8.2)

**Actions:**
- If implementations exist: Add missing registrations to `src/server.ts`
- If implementations missing: Create them (following existing patterns)
- If intentionally removed: Update all documentation to reflect 20 tools
- Update copilot instructions to match reality

### 4. WebSocket integration strategy

**Decision:** Integrate Socket.IO into main MCP HTTP server (Option B) with Redis Pub/Sub for multi-instance scaling.

**Rationale:**
- **Team collaboration requires real-time:** Task updates, comments, assignments need instant sync
- **Better user experience:** No polling delays, immediate feedback
- **SaaS standard:** Modern SaaS apps provide real-time collaboration
- **Simpler for clients:** Single connection point for REST + WebSocket
- **Redis already required:** Using Redis for caching, so Pub/Sub comes free

**Implementation Approach:**
- Integrate Socket.IO alongside Fastify HTTP server
- Use Redis Pub/Sub for multi-instance coordination:
  ```
  Instance 1 (WS client A) ← Redis Pub/Sub → Instance 2 (WS client B)
  ```
- Workspace-scoped rooms: `workspace:{id}`
- Emit events on all write operations:
  - `task:created`, `task:updated`, `task:deleted`
  - `project:created`, `project:updated`, `project:deleted`
  - `memory:created`, `memory:updated`
  - `comment:added`, `assignment:changed`
- Authenticate WebSocket connections using JWT
- Add presence tracking (who's online in workspace)
- Implement typing indicators for comments

**WebSocket Events:**
```typescript
// Client subscribes to workspace
socket.emit('subscribe', { workspaceId: 'ws-123' });

// Server broadcasts updates
socket.on('task:updated', (data) => {
  // { taskId, workspaceId, changes, updatedBy }
});
```

**Scaling Considerations:**
- Redis Pub/Sub handles cross-instance communication
- Can scale horizontally with load balancer (sticky sessions)
- Future: Consider Kafka for event streaming at large scale

## Timeline Estimate

**Phase 1:** Testing, Refactoring & SQLite Migration (3 weeks)
- Week 1: Add Vitest, write integration tests, resolve tool discrepancies
- Week 2: Refactor `server.ts`, establish baseline test coverage
- Week 3: Design and implement SQLite schema, data migration scripts

**Phase 2:** HTTP Transport Core (2 weeks)
- Week 4: Implement `src/transports/http.ts`, tool-to-route mapping
- Week 5: Add CLI flag support, test dual-mode operation

**Phase 3:** Multi-Tenant Authentication & User Management (4 weeks)
- Week 6: User authentication system (registration, login, JWT)
- Week 7: Organization and workspace management
- Week 8: Role-based access control, permission middleware
- Week 9: Security hardening, rate limiting, audit logging

**Phase 4:** Dashboard Migration & Real-Time Features (3 weeks)
- Week 10: Create HTTP client, remove STDIO bridge
- Week 11: Integrate Socket.IO, implement real-time updates
- Week 12: Update all dashboard routes, end-to-end testing

**Phase 5:** Multi-Tenant Optimization & Caching (2 weeks)
- Week 13: Redis caching layer, database optimization
- Week 14: Multi-tenant load testing, performance tuning

**Phase 6:** Production Hardening (2 weeks)
- Week 15: Metrics, monitoring, documentation
- Week 16: Docker deployment, CI/CD pipeline

**Phase 7:** SaaS Features & Billing (3 weeks)
- Week 17: Subscription management, Stripe integration
- Week 18: Usage tracking, plan limits enforcement
- Week 19: Team collaboration features, email notifications

**Total:** 19 weeks (~4.5 months) for production-ready multi-tenant SaaS platform

**Milestones:**
- **Week 5:** Internal beta (HTTP + basic auth)
- **Week 12:** Private beta (multi-tenant, real-time)
- **Week 16:** Public beta (production infrastructure)
- **Week 19:** General availability (full SaaS features)

## Success Criteria

Multi-tenant SaaS platform is production-ready when:

**Core Functionality:**
- ✅ All 20+ tools accessible via REST API with correct HTTP methods
- ✅ SQLite database with multi-tenant schema operational
- ✅ User registration, login, and JWT authentication working
- ✅ Organization and workspace management fully functional
- ✅ Role-based access control enforced (owner, admin, member roles)
- ✅ STDIO transport still fully functional (backward compatibility)

**Security & Isolation:**
- ✅ Workspace isolation enforced (zero cross-tenant data leakage in tests)
- ✅ All database queries properly tenant-scoped
- ✅ Authentication required by default, JWT validation working
- ✅ Rate limiting per user/organization functional
- ✅ Audit logging operational for all CRUD operations
- ✅ CSRF protection enabled for browser clients

**Performance:**
- ✅ Multi-tenant load testing successful (100+ concurrent users, 50+ workspaces)
- ✅ Database queries <50ms p95 latency with caching
- ✅ Redis caching layer operational (>80% hit rate)
- ✅ Zero data corruption incidents in concurrent testing
- ✅ WebSocket real-time updates working across multiple instances

**SaaS Features:**
- ✅ Stripe billing integration functional (subscriptions, webhooks)
- ✅ Usage tracking and plan limits enforced
- ✅ Email notifications working (welcome, verification, alerts)
- ✅ Team collaboration features operational (assignments, comments)
- ✅ Admin dashboard accessible with system-wide stats

**Infrastructure:**
- ✅ Dashboard fully migrated to HTTP client (no STDIO bridge)
- ✅ Docker deployment tested and documented
- ✅ CI/CD pipeline operational with automated testing
- ✅ Database backup and restore procedures tested
- ✅ Prometheus metrics and Grafana dashboards configured
- ✅ Production deployment playbook documented

**Documentation:**
- ✅ OpenAPI specification published and validated
- ✅ API reference complete with examples
- ✅ Multi-tenancy architecture guide published
- ✅ Authentication and security best practices documented
- ✅ Migration guide for existing STDIO users
- ✅ SaaS deployment guide complete

**Testing:**
- ✅ Test coverage >80% for HTTP paths and multi-tenant logic
- ✅ Integration tests for all authentication flows
- ✅ Tenant isolation tests (verify no data leakage)
- ✅ Performance benchmarks documented

## Risk Mitigation

### Testing Strategy

**Unit Tests:**
- Storage layer operations (CRUD, locking, caching)
- Tool handlers in isolation
- Authentication logic (token validation, workspace access)
- Workspace resolution and path validation

**Integration Tests:**
- End-to-end STDIO workflows (existing behavior)
- End-to-end HTTP workflows (new behavior)
- Dashboard ↔ MCP server communication (HTTP mode)
- Concurrent request handling (race condition prevention)

**Performance Tests:**
- Load testing with `autocannon` (100 concurrent connections)
- Storage operation benchmarks (read/write latency)
- Tool execution profiling (identify bottlenecks)

### Rollback Plan

If HTTP migration encounters critical issues:

1. **Dual-mode allows instant fallback:**
   ```bash
   # Rollback: Remove --http flag, use STDIO
   npx agentic-tools-mcp  # Default STDIO mode
   ```

2. **Feature flags for gradual rollout:**
   ```typescript
   if (config.features.httpTransport && !config.features.httpTransportDisabled) {
     await startHttpServer(server, config.http);
   } else {
     await startStdioServer(server);
   }
   ```

3. **Version pinning for stability:**
   ```json
   {
     "mcpServers": {
       "agentic-tools": {
         "command": "npx",
         "args": ["-y", "@scarecr0w12/agentic-tools-mcp@1.9.0"]
       }
     }
   }
   ```

### Communication Plan

**For Users:**
- Announce HTTP transport as experimental feature in v1.10.0-beta
- Provide clear migration guide with examples
- Document breaking changes (if any)
- Offer support channel (GitHub Discussions, Discord)
- Publish blog post explaining benefits and use cases

**For Contributors:**
- Write Architecture Decision Records (ADRs) for major decisions
- Update CONTRIBUTING.md with HTTP-specific development setup
- Create HTTP development guide with example tool additions
- Document testing requirements for new HTTP features

## Architecture Diagram

### Current Architecture (STDIO)
```
┌─────────────────┐
│  MCP Client     │
│  (Claude, etc)  │
└────────┬────────┘
         │ stdin/stdout (JSON-RPC)
         │
┌────────▼────────┐
│   MCP Server    │
│   (STDIO mode)  │
└────────┬────────┘
         │ File I/O
         │
┌────────▼────────┐
│  .agentic-tools │
│   -mcp/         │
│  ├── tasks/     │
│  └── memories/  │
└─────────────────┘
```

### Target Architecture (Multi-Tenant HTTP)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  MCP Client     │     │   Dashboard     │     │  Mobile/Web     │
│  (Claude, etc)  │     │   Frontend      │     │   Client        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ stdin/stdout          │ HTTP/WebSocket        │ HTTP/WS
         │ (backward compat)     │ (authenticated)       │ (JWT)
         │                       │                       │
┌────────▼───────────────────────▼───────────────────────▼────────┐
│                  MCP Server (Dual Mode)                         │
│  ┌──────────────┐    ┌──────────────────────────────────┐      │
│  │ STDIO Trans- │    │     HTTP Transport + WebSocket   │      │
│  │ port         │    │  ┌────────────┐  ┌─────────────┐ │      │
│  │ (local files)│    │  │ Auth       │  │ Real-time   │ │      │
│  │              │    │  │ Middleware │  │ (Socket.IO) │ │      │
│  └──────┬───────┘    │  └──────┬─────┘  └──────┬──────┘ │      │
│         │            │         │               │        │      │
│         └────────────┴─────────▼───────────────▼────────┘      │
│                               │                                │
│                      ┌────────▼────────┐                       │
│                      │   Tool Layer    │                       │
│                      │   (27 tools)    │                       │
│                      │  (tenant-aware) │                       │
│                      └────────┬────────┘                       │
│                               │                                │
│                      ┌────────▼────────┐                       │
│                      │ Storage Layer   │                       │
│                      │  SQLite + Redis │                       │
│                      │ (tenant-scoped) │                       │
│                      └────────┬────────┘                       │
└───────────────────────────────┼────────────────────────────────┘
                                │
         ┌──────────────────────┴──────────────────────┐
         │                                             │
┌────────▼────────┐                          ┌─────────▼────────┐
│  SQLite DB      │                          │  Redis Cache     │
│  ┌───────────┐  │                          │  ┌────────────┐  │
│  │ users     │  │                          │  │ sessions   │  │
│  │ orgs      │  │◄─────Pub/Sub────────────►│  │ cache      │  │
│  │ workspaces│  │      (real-time)         │  │ rate_limit │  │
│  │ projects  │  │                          │  └────────────┘  │
│  │ tasks     │  │                          └──────────────────┘
│  │ memories  │  │
│  └───────────┘  │
└─────────────────┘
```

### Multi-Tenant Data Model
```
┌─────────────────────────────────────────────────────────┐
│                    Organization                         │
│  id: org_123                                           │
│  name: "Acme Corp"                                     │
│  plan: "pro"                                           │
├─────────────────────────────────────────────────────────┤
│  Members:                                              │
│    - alice@acme.com (owner)                           │
│    - bob@acme.com (admin)                             │
│    - charlie@acme.com (member)                        │
├─────────────────────────────────────────────────────────┤
│  Workspaces:                                           │
│    ┌──────────────────────────────────────────┐       │
│    │ Workspace: "Engineering"                 │       │
│    │   Projects:                              │       │
│    │     - API Rewrite (50 tasks)            │       │
│    │     - Mobile App (30 tasks)             │       │
│    │   Memories: 120 items                   │       │
│    └──────────────────────────────────────────┘       │
│    ┌──────────────────────────────────────────┐       │
│    │ Workspace: "Marketing"                   │       │
│    │   Projects:                              │       │
│    │     - Q1 Campaign (25 tasks)            │       │
│    │   Memories: 45 items                    │       │
│    └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### Tenant Isolation Pattern
```typescript
// Every database query is tenant-scoped
const tasks = await db
  .select()
  .from(tasksTable)
  .where(
    and(
      eq(tasksTable.workspaceId, context.workspaceId),
      eq(tasksTable.projectId, projectId)
    )
  );

// Middleware ensures context is set from JWT
interface RequestContext {
  userId: string;        // From JWT
  orgId: string;         // From JWT
  workspaceId: string;   // From URL or JWT
  role: 'owner' | 'admin' | 'member' | 'viewer';
}
```

## REST API Examples

### Create Project
```http
POST /api/projects HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Authorization: Bearer your-api-key
X-Workspace-ID: ws-abc123

{
  "name": "My New Project",
  "description": "A project for tracking development tasks"
}
```

**Response:**
```json
{
  "id": "proj_xyz789",
  "name": "My New Project",
  "description": "A project for tracking development tasks",
  "createdAt": "2025-11-16T10:30:00Z",
  "updatedAt": "2025-11-16T10:30:00Z"
}
```

### List Tasks
```http
GET /api/projects/proj_xyz789/tasks?status=pending&priority=high HTTP/1.1
Host: localhost:3000
Authorization: Bearer your-api-key
X-Workspace-ID: ws-abc123
```

**Response:**
```json
{
  "tasks": [
    {
      "id": "task_001",
      "name": "Implement authentication",
      "status": "pending",
      "priority": 10,
      "complexity": 8,
      "projectId": "proj_xyz789",
      "createdAt": "2025-11-16T10:32:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

### Search Memories
```http
GET /api/memories/search?q=authentication&category=technical&limit=10 HTTP/1.1
Host: localhost:3000
Authorization: Bearer your-api-key
X-Workspace-ID: ws-abc123
```

**Response:**
```json
{
  "results": [
    {
      "id": "mem_abc123",
      "title": "Authentication best practices",
      "content": "Always use bcrypt for password hashing...",
      "category": "technical",
      "relevance": 0.95,
      "createdAt": "2025-11-15T14:20:00Z"
    }
  ],
  "total": 1,
  "query": "authentication"
}
```

## Environment Variables Reference

### MCP HTTP Server (Multi-Tenant)
```bash
# HTTP Transport
HTTP_ENABLED=true               # Enable HTTP mode
HTTP_PORT=3000                  # HTTP server port
HTTP_HOST=0.0.0.0               # Bind address
HTTP_CORS_ORIGINS=http://localhost:5173,http://localhost:4800,https://app.yourdomain.com

# Authentication & Security
JWT_SECRET=your-256-bit-secret-key-here  # JWT signing secret (REQUIRED)
JWT_EXPIRES_IN=1h                        # Access token expiration
REFRESH_TOKEN_EXPIRES_IN=7d              # Refresh token expiration
AUTH_REQUIRED=true                       # Enforce authentication
BCRYPT_ROUNDS=12                         # Password hashing cost
CSRF_ENABLED=true                        # CSRF protection for web clients

# Database
DATABASE_URL=sqlite:///data/agentic-tools.db  # SQLite database path
DATABASE_POOL_SIZE=10                         # Connection pool size
DATABASE_TIMEOUT=5000                         # Query timeout (ms)
DATABASE_BACKUP_ENABLED=true                  # Auto backups
DATABASE_BACKUP_INTERVAL=24h                  # Backup frequency

# Redis Cache
REDIS_URL=redis://localhost:6379        # Redis connection URL
REDIS_PASSWORD=your-redis-password      # Redis auth password
REDIS_DB=0                              # Redis database number
REDIS_KEY_PREFIX=agentic:               # Key prefix for namespacing
CACHE_TTL=300                           # Default cache TTL (seconds)

# Rate Limiting (Per-User)
RATE_LIMIT_FREE=100                     # Free tier: req/hour
RATE_LIMIT_PRO=1000                     # Pro tier: req/hour
RATE_LIMIT_TEAM=5000                    # Team tier: req/hour
RATE_LIMIT_ENTERPRISE=0                 # Enterprise: unlimited (0)

# Usage Limits (Per-Plan)
LIMIT_FREE_WORKSPACES=1
LIMIT_FREE_TASKS=100
LIMIT_FREE_MEMORIES=50
LIMIT_PRO_WORKSPACES=10
LIMIT_PRO_TASKS=0                       # 0 = unlimited
LIMIT_PRO_MEMORIES=0
LIMIT_TEAM_WORKSPACES=50

# Billing & Subscriptions
STRIPE_SECRET_KEY=sk_live_...          # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # Stripe webhook signing secret
STRIPE_PUBLISHABLE_KEY=pk_live_...     # Stripe publishable key
BILLING_ENABLED=true                    # Enable billing features

# Email
EMAIL_PROVIDER=sendgrid                 # sendgrid, ses, smtp
EMAIL_API_KEY=SG...                     # SendGrid API key
EMAIL_FROM=noreply@yourdomain.com       # From address
EMAIL_FROM_NAME=Agentic Tools           # From name
EMAIL_VERIFICATION_REQUIRED=true        # Require email verification

# WebSocket
WEBSOCKET_ENABLED=true                  # Enable real-time features
WEBSOCKET_PATH=/socket.io               # Socket.IO path
WEBSOCKET_PING_INTERVAL=25000           # Ping interval (ms)
WEBSOCKET_PING_TIMEOUT=20000            # Ping timeout (ms)

# Monitoring
METRICS_ENABLED=true                    # Enable Prometheus metrics
METRICS_PORT=9090                       # Metrics endpoint port
LOG_LEVEL=info                          # debug, info, warn, error
SENTRY_DSN=https://...                  # Sentry error tracking (optional)

# Feature Flags
FEATURE_BILLING=true                    # Enable billing
FEATURE_TEAM_COLLABORATION=true         # Enable team features
FEATURE_USAGE_LIMITS=true               # Enforce usage limits
FEATURE_ADMIN_DASHBOARD=true            # Enable admin routes
FEATURE_AUDIT_LOGS=true                 # Enable audit logging

# Backward Compatibility
STDIO_MODE_ENABLED=true                 # Allow STDIO mode
STDIO_USE_JSON_FILES=true               # STDIO uses JSON files (not SQLite)
```

### Dashboard Backend (HTTP Mode)
```bash
# MCP Connection
MCP_HTTP_URL=http://localhost:3000      # MCP server base URL
MCP_API_KEY=your-api-key                # Authentication
MCP_WORKSPACE_ID=ws-abc123              # Target workspace

# Dashboard Server (existing)
DASHBOARD_PORT=4800
DASHBOARD_HOST=0.0.0.0
DASHBOARD_CORS=http://localhost:5173
DASHBOARD_AUTOSTART=0
DASHBOARD_MAX_LOGS=5000
```

## Next Steps

After this plan is approved:

1. **Create GitHub Repository** - Fork to new repo: `agentic-tools-cloud` or `agentic-saas`
2. **Initial Setup (Week 1):**
   - Update package.json with new name and version
   - Create new README focused on SaaS platform
   - Set up CI/CD pipelines (GitHub Actions)
   - Configure staging and production environments
   - Create project board with all tasks
3. **Begin Phase 1 (Week 2)** - Start with test coverage, tool registration audit, and SQLite migration
4. **Weekly Check-ins** - Review progress, adjust timeline if needed
5. **Documentation First** - Write HTTP API and multi-tenant architecture docs alongside implementation
6. **Alpha Release (Week 6)** - v0.1.0-alpha with HTTP + basic multi-tenancy
7. **Beta Release (Week 13)** - v0.5.0-beta with full SaaS features
8. **Production Release (Week 20)** - v1.0.0 with multi-tenant SaaS platform

## Relationship Between Projects

### Original Project (agentic-tools-mcp)
**Continues as:** Local MCP tools for individual developers
- Maintained independently
- Focus on STDIO transport and local file storage
- Simple CLI tool for VS Code and Claude Desktop
- MIT licensed
- No breaking changes to existing users

**Benefits from fork:**
- Can cherry-pick tool improvements from SaaS version
- Stays lean and focused on local use case
- No bloat from SaaS-specific features

### New Project (agentic-tools-cloud)
**Becomes:** Commercial SaaS platform
- HTTP/WebSocket APIs for team collaboration
- Multi-tenant architecture from day one
- Billing, authentication, role-based access control
- Commercial or AGPL license
- Hosted at app.agentic-tools.cloud

**Benefits from fork:**
- Freedom to add commercial features
- Can evolve rapidly without backward compatibility concerns
- Separate branding and marketing
- Independent release cycle

### Shared Components Strategy

If significant code sharing is needed, extract to common packages:
```
@scarecr0w12/agentic-tools-core    # Shared tool interfaces and types
@scarecr0w12/agentic-tools-mcp     # Local CLI tool (STDIO)
@scarecr0w12/agentic-tools-cloud   # SaaS platform (HTTP)
```

This allows both projects to benefit from improvements to core tool logic while maintaining independence.

## Launch Strategy

### Phase-Based Rollout

**Week 1: Repository Setup**
- Fork repository to `agentic-tools-cloud`
- Update branding, documentation, license
- Set up staging environment
- Configure CI/CD pipelines

**Week 6: Internal Alpha**
- HTTP transport working
- Basic authentication and workspace isolation
- Target: Development team + 5-10 trusted users
- Goal: Validate architecture and gather feedback
- Deploy to: alpha.agentic-tools.cloud

**Week 13: Private Beta**
- Full multi-tenancy operational
- Real-time collaboration features
- Billing integration (Stripe test mode)
- Target: 50-100 early adopters (invite-only)
- Goal: Stress test under real-world usage
- Deploy to: beta.agentic-tools.cloud

**Week 17: Public Beta**
- Production infrastructure deployed
- Billing live (Stripe production)
- Documentation complete
- Support channels established
- Target: Open registration, soft launch
- Goal: Final validation before general availability
- Deploy to: app.agentic-tools.cloud

**Week 20: General Availability**
- Full SaaS platform operational
- Marketing launch
- Open registration
- SLA commitments for paid plans
- Public launch announcement
- Deploy to: app.agentic-tools.cloud (production)

### Pricing Strategy (Initial)

**Free Tier:**
- 1 workspace
- 100 tasks per workspace
- 50 memories
- 100 API requests/hour
- Community support

**Pro Tier - $29/month:**
- 10 workspaces
- Unlimited tasks and memories
- 1,000 API requests/hour
- Email support
- Advanced analytics

**Team Tier - $99/month:**
- 50 workspaces
- Team collaboration features
- 5,000 API requests/hour
- Priority support
- Audit logs

**Enterprise - Custom:**
- Unlimited workspaces
- Dedicated infrastructure option
- Custom rate limits
- SLA guarantees
- Dedicated support
- SSO integration
- Custom contracts

## References

- **MCP SDK Documentation:** https://github.com/modelcontextprotocol/sdk
- **Fastify Documentation:** https://fastify.dev/
- **OpenAPI Specification:** https://swagger.io/specification/
- **File Locking (proper-lockfile):** https://github.com/moxystudio/node-proper-lockfile
- **Load Testing (autocannon):** https://github.com/mcollina/autocannon
- **Prometheus Client:** https://github.com/siimon/prom-client
