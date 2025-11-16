# Agentic Tools Cloud

> Multi-tenant SaaS platform for AI-powered task and memory management with real-time team collaboration

**Agentic Tools Cloud** is the hosted, multi-tenant version of the popular [agentic-tools-mcp](https://github.com/scarecr0w12/agentic-tools-mcp) local tool. Built from the ground up for teams and organizations, it provides powerful task management, agent memory storage, and real-time collaboration features through a modern HTTP/WebSocket API.

## 🌟 Key Features

### Multi-Tenant Architecture
- **Organizations & Workspaces** - Organize teams with nested workspace structure
- **Role-Based Access Control** - Owner, admin, member, and viewer roles
- **Workspace Sharing** - Collaborate across teams with fine-grained permissions
- **Data Isolation** - Complete tenant isolation at database level

### Task Management
- **Unlimited Task Hierarchy** - Nest tasks infinitely with parent-child relationships
- **Smart Dependencies** - Define task dependencies and automatic blocking
- **Priority & Complexity** - Built-in priority (1-10) and complexity scoring
- **Status Tracking** - pending, in-progress, blocked, done
- **Bulk Operations** - Create tasks from PRD documents, import/export

### Agent Memories
- **Searchable Knowledge Base** - Store and retrieve AI agent memories
- **Category Organization** - Organize memories by category
- **Full-Text Search** - Intelligent search with relevance scoring
- **Unlimited Storage** - No limits on memory storage (paid plans)

### Real-Time Collaboration
- **Live Updates** - See changes instantly via WebSocket
- **Team Presence** - Know who's online in your workspace
- **Comments & Mentions** - Discuss tasks with @mentions
- **Activity Feed** - Complete audit trail of all changes

### Developer-Friendly API
- **RESTful HTTP API** - Well-documented REST endpoints
- **WebSocket Support** - Real-time event streaming
- **OpenAPI Specification** - Auto-generated API docs
- **SDK Support** - Official TypeScript/JavaScript SDK

## 🚀 Quick Start

### For End Users

Sign up for a free account at [app.agentic-tools.cloud](https://app.agentic-tools.cloud)

### For Self-Hosting

```bash
# Clone the repository
git clone https://github.com/scarecr0w12/agentic-tools-cloud.git
cd agentic-tools-cloud

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start the server
npm run dev
```

The server will start on `http://localhost:3000` (configurable via `HTTP_PORT`).

### Docker Deployment

```bash
# Using docker-compose (recommended)
docker-compose up -d

# Or build and run manually
docker build -t agentic-tools-cloud .
docker run -p 3000:3000 -v ./data:/app/data agentic-tools-cloud
```

## 📚 Documentation

- [API Reference](./docs/API_REFERENCE.md) - Complete HTTP API documentation
- [Architecture](./docs/ARCHITECTURE.md) - System design and technical details
- [Authentication](./docs/AUTHENTICATION.md) - JWT auth and security
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions
- [Multi-Tenancy](./docs/MULTI_TENANCY.md) - Tenant isolation architecture

## 🔑 Environment Variables

See [`.env.example`](./.env.example) for all configuration options. Key variables:

```bash
# HTTP Server
HTTP_PORT=3000
HTTP_HOST=0.0.0.0

# Authentication
JWT_SECRET=your-secret-key-here
AUTH_REQUIRED=true

# Database
DATABASE_URL=sqlite:///data/agentic-tools.db

# Redis (for caching and real-time)
REDIS_URL=redis://localhost:6379

# Billing (optional)
STRIPE_SECRET_KEY=sk_test_...
BILLING_ENABLED=false
```

## 💰 Pricing Plans

### Free Tier
- 1 workspace
- 100 tasks per workspace
- 50 memories
- 100 API requests/hour
- Community support

### Pro - $29/month
- 10 workspaces
- Unlimited tasks & memories
- 1,000 API requests/hour
- Email support
- Advanced analytics

### Team - $99/month
- 50 workspaces
- Team collaboration features
- 5,000 API requests/hour
- Priority support
- Audit logs

### Enterprise - Custom
- Unlimited workspaces
- Dedicated infrastructure
- Custom rate limits
- SLA guarantees
- SSO integration

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Web/Mobile    │     │   MCP Client    │
│     Client      │     │  (Claude, etc)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │ HTTP/WebSocket        │ STDIO (compat)
         │                       │
┌────────▼───────────────────────▼────────┐
│      Fastify HTTP/WebSocket Server      │
│  ┌────────────────────────────────────┐ │
│  │   Authentication & Authorization   │ │
│  │        (JWT, RBAC, CSRF)           │ │
│  └────────────────┬───────────────────┘ │
│                   │                     │
│  ┌────────────────▼───────────────────┐ │
│  │        MCP Tool Layer (27+)        │ │
│  │  (Projects, Tasks, Memories, etc)  │ │
│  └────────────────┬───────────────────┘ │
│                   │                     │
│  ┌────────────────▼───────────────────┐ │
│  │      Multi-Tenant Storage          │ │
│  │   SQLite + Redis (tenant-scoped)   │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Database Schema

- **users** - User accounts with bcrypt password hashing
- **organizations** - Top-level tenant entities
- **workspaces** - Isolated environments within organizations
- **projects** - Project containers for tasks
- **tasks** - Hierarchical task tree with unlimited nesting
- **memories** - Searchable agent memory storage

All queries are tenant-scoped to ensure complete data isolation.

## 🔒 Security

- **Password Hashing** - bcrypt with cost factor 12
- **JWT Tokens** - Secure access and refresh token flow
- **CSRF Protection** - Enabled for browser clients
- **Rate Limiting** - Per-user quotas based on plan
- **Audit Logging** - Complete audit trail of all operations
- **Data Isolation** - Strict tenant boundaries at database level

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](./LICENSE) file for details.

For commercial licensing options, please contact: [support@agentic-tools.cloud](mailto:support@agentic-tools.cloud)

## 🔗 Related Projects

- [agentic-tools-mcp](https://github.com/scarecr0w12/agentic-tools-mcp) - Local STDIO version for individual use
- [agentic-tools-core](https://github.com/scarecr0w12/agentic-tools-core) - Shared tool interfaces (coming soon)

## 📞 Support

- **Documentation**: [docs.agentic-tools.cloud](https://docs.agentic-tools.cloud)
- **Community Discord**: [discord.gg/agentic-tools](https://discord.gg/agentic-tools)
- **Email Support**: [support@agentic-tools.cloud](mailto:support@agentic-tools.cloud)
- **Bug Reports**: [GitHub Issues](https://github.com/scarecr0w12/agentic-tools-cloud/issues)

## 🙏 Acknowledgments

Built with:
- [Fastify](https://fastify.dev) - Fast and low overhead web framework
- [Socket.IO](https://socket.io) - Real-time bidirectional communication
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite driver
- [Redis](https://redis.io) - In-memory data store
- [Stripe](https://stripe.com) - Payment processing
- [MCP SDK](https://github.com/modelcontextprotocol/sdk) - Model Context Protocol

---

**Made with ❤️ by the Agentic Tools team**
