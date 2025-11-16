import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { DashboardConfig } from './config.js';
import { EventBus } from './services/event-bus.js';
import { TaskStore } from './services/task-store.js';
import { McpBridge } from './services/mcp-bridge.js';
import { SocketGateway } from './ws/gateway.js';
import { instancesRoutes } from './routes/instances.js';
import { tasksRoutes } from './routes/tasks.js';
import { MockDataService } from './services/mock-data.js';

export interface ServerContext {
  app: FastifyInstance;
  bridge: McpBridge;
  gateway: SocketGateway;
  store: TaskStore;
  eventBus: EventBus;
}

export async function buildServer(config: DashboardConfig): Promise<ServerContext> {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true
  });

  const eventBus = new EventBus();
  const store = new TaskStore(eventBus, { maxLogs: config.maxLogEntries });
  const bridge = new McpBridge({ config, eventBus, store, logger: app.log });
  const gateway = new SocketGateway(eventBus, store, config);
  const mockData = new MockDataService({ config, store, events: eventBus });

  if (config.enableMockData) {
    mockData.start();
    app.log.warn('Mock data generator enabled; disable with DASHBOARD_ENABLE_MOCKS=0');
  }

  await app.register(instancesRoutes, { store, bridge, config });
  await app.register(tasksRoutes, { store });

  gateway.attach(app.server);

  return { app, bridge, gateway, store, eventBus };
}
