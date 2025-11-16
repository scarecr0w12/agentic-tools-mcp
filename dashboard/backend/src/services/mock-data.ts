import type { TaskStore } from './task-store.js';
import type { EventBus } from './event-bus.js';
import type { DashboardConfig } from '../config.js';
import { randomUUID } from 'node:crypto';

interface MockDataServiceOptions {
  config: DashboardConfig;
  store: TaskStore;
  events: EventBus;
}

const TASK_NAMES = [
  'list_projects',
  'create_task',
  'update_task',
  'search_memories',
  'parse_prd',
  'get_next_task_recommendation'
];

const STATUS_SEQUENCE = ['queued', 'running', 'completed'] as const;

export class MockDataService {
  private interval?: NodeJS.Timeout;
  private taskIndex = 0;

  constructor(private readonly options: MockDataServiceOptions) {}

  start() {
    if (this.interval) return;

    const instanceId = 'mock-instance';
    this.options.store.upsertInstance({
      id: instanceId,
      label: 'Mock MCP',
      status: 'ready',
      queueDepth: 0,
      activeTasks: 0,
      uptimeMs: 0,
      version: 'mock'
    });

    this.interval = setInterval(() => {
      const id = `${Date.now()}-${this.taskIndex++}`;
      const taskName = TASK_NAMES[Math.floor(Math.random() * TASK_NAMES.length)];

      STATUS_SEQUENCE.forEach((status, idx) => {
        setTimeout(() => {
          this.options.store.upsertTask({
            id,
            instanceId,
            name: taskName,
            status,
            progress: (idx / (STATUS_SEQUENCE.length - 1)) * 100,
            startedAt: new Date(Date.now() - 1000).toISOString(),
            finishedAt: status === 'completed' ? new Date().toISOString() : undefined
          });
        }, idx * 300);
      });

      this.options.store.addLog({
        instanceId,
        level: 'info',
        message: `[mock] ${taskName} simulated`,
        timestamp: new Date().toISOString(),
        details: { id }
      });

      this.options.store.addMetrics({
        instanceId,
        timestamp: new Date().toISOString(),
        cpu: Number((Math.random() * 40 + 10).toFixed(2)),
        memoryMb: Number((Math.random() * 200 + 150).toFixed(2)),
        activeTasks: Math.floor(Math.random() * 3),
        queueDepth: Math.floor(Math.random() * 5)
      });
    }, 2000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}