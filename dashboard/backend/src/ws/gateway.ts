import { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type { EventBus } from '../services/event-bus.js';
import type { TaskStore } from '../services/task-store.js';
import type { DashboardConfig } from '../config.js';

export class SocketGateway {
  private io?: SocketIOServer;

  constructor(private readonly events: EventBus, private readonly store: TaskStore, private readonly config: DashboardConfig) {}

  attach(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: this.config.corsOrigins,
        credentials: true
      },
      path: '/ws'
    });

    this.io.on('connection', async (socket) => {
      // Send initial state when client connects
      const instances = await this.store.listInstances();
      const tasks = await this.store.listTasks();
      socket.emit('instances:init', instances);
      socket.emit('tasks:init', tasks);
    });

    this.events.on('bridge:status', (payload) => {
      this.io?.emit('instances:status', payload);
    });

    this.events.on('bridge:task', (payload) => {
      this.io?.emit('tasks:update', payload);
    });

    this.events.on('bridge:log', (payload) => {
      this.io?.emit('logs:append', payload);
    });

    this.events.on('bridge:metrics', (payload) => {
      this.io?.emit('metrics:update', payload);
    });
  }
}
