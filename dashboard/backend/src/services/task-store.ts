import { db } from '../db/client.js';
import { mcpInstances, tasksRuntime, logs, metricsTimeseries } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import type { EventBus } from './event-bus.js';
import type { InstanceSummary, TaskSnapshot, LogEntry, MetricsSnapshot } from '../types.js';

interface TaskStoreOptions {
  maxLogs: number;
}

export class TaskStore {
  private readonly options: TaskStoreOptions;

  constructor(private readonly events: EventBus, options: TaskStoreOptions) {
    this.options = options;
  }

  async upsertInstance(summary: InstanceSummary) {
    const now = Date.now();
    // Map InstanceStatus to database status
    const dbStatus = this.mapInstanceStatusToDb(summary.status);
    
    await db.insert(mcpInstances).values({
      id: summary.id,
      name: summary.label,
      status: dbStatus,
      uptime: summary.uptimeMs,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: mcpInstances.id,
      set: {
        name: summary.label,
        status: dbStatus,
        uptime: summary.uptimeMs,
        updatedAt: now,
      },
    });
    this.events.emitStatus({ instanceId: summary.id, status: summary.status });
  }

  async listInstances(): Promise<InstanceSummary[]> {
    const rows = await db.select().from(mcpInstances);
    return rows.map((row) => ({
      id: row.id,
      label: row.name,
      status: this.mapDbStatusToInstance(row.status as any),
      queueDepth: 0,
      activeTasks: 0,
      uptimeMs: row.uptime ?? 0,
      lastHeartbeat: undefined,
      version: undefined,
    }));
  }

  async upsertTask(task: TaskSnapshot) {
    const now = Date.now();
    const dbStatus = this.mapTaskStatusToDb(task.status);
    
    await db.insert(tasksRuntime).values({
      id: task.id,
      mcpInstanceId: task.instanceId,
      taskId: task.name,
      status: dbStatus,
      progress: task.progress ?? 0,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: tasksRuntime.id,
      set: {
        status: dbStatus,
        progress: task.progress ?? 0,
        updatedAt: now,
      },
    });
    this.events.emitTask({ instanceId: task.instanceId, task });
  }

  async listTasks(): Promise<TaskSnapshot[]> {
    const rows = await db.select().from(tasksRuntime);
    return rows.map((row) => ({
      id: row.id,
      instanceId: row.mcpInstanceId,
      name: row.taskId,
      status: this.mapDbStatusToTask(row.status as any),
      progress: row.progress ?? 0,
      startedAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
      finishedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
      metadata: {},
    }));
  }

  async addLog(entry: LogEntry) {
    const now = Date.now();
    await db.insert(logs).values({
      id: `${entry.instanceId}-${now}-${Math.random()}`,
      mcpInstanceId: entry.instanceId,
      level: entry.level,
      message: entry.message,
      payload: entry.details ? JSON.stringify(entry.details) : null,
      timestamp: now,
    });

    // Get total log count and delete oldest if exceeding maxLogs
    const allLogs = await db.select({ id: logs.id }).from(logs).orderBy(desc(logs.timestamp));
    
    if (allLogs.length > this.options.maxLogs) {
      const logIds = allLogs.map((l) => l.id);
      const idsToDelete = logIds.slice(this.options.maxLogs);
      
      for (const id of idsToDelete) {
        await db.delete(logs).where(eq(logs.id, id));
      }
    }

    this.events.emitLog({ instanceId: entry.instanceId, level: entry.level, message: entry.message, details: entry.details });
  }

  async listLogs(filters?: { instanceId?: string; level?: string; search?: string }): Promise<LogEntry[]> {
    const conditions: any[] = [];

    if (filters?.instanceId) {
      conditions.push(eq(logs.mcpInstanceId, filters.instanceId));
    }

    if (filters?.level) {
      conditions.push(eq(logs.level, filters.level));
    }

    let query: any;
    if (conditions.length > 0) {
      query = db.select().from(logs).where(and(...conditions)).orderBy(desc(logs.timestamp)).limit(this.options.maxLogs);
    } else {
      query = db.select().from(logs).orderBy(desc(logs.timestamp)).limit(this.options.maxLogs);
    }

    const rows: any[] = await query;
    
    // Apply client-side search filter after database query
    let results = rows.map((row) => ({
      instanceId: row.mcpInstanceId,
      level: row.level as any,
      message: row.message,
      timestamp: new Date(row.timestamp).toISOString(),
      details: row.payload ? JSON.parse(row.payload) : undefined,
    }));

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter((log) => log.message.toLowerCase().includes(searchLower));
    }

    return results;
  }

  async addMetrics(snapshot: MetricsSnapshot) {
    const timestamp = new Date(snapshot.timestamp).getTime();
    await db.insert(metricsTimeseries).values({
      id: `${snapshot.instanceId}-${timestamp}-${Math.random()}`,
      mcpInstanceId: snapshot.instanceId,
      timestamp,
      cpuPercent: snapshot.cpu,
      memoryRss: Math.floor(snapshot.memoryMb * 1024 * 1024),
      tasksThroughput: snapshot.activeTasks,
    });
    this.events.emitMetrics({ instanceId: snapshot.instanceId, metrics: snapshot });
  }

  async recentMetrics(instanceId?: string): Promise<MetricsSnapshot[]> {
    let query: any;
    
    if (instanceId) {
      query = db.select().from(metricsTimeseries)
        .where(eq(metricsTimeseries.mcpInstanceId, instanceId))
        .orderBy(desc(metricsTimeseries.timestamp))
        .limit(1000);
    } else {
      query = db.select().from(metricsTimeseries).orderBy(desc(metricsTimeseries.timestamp)).limit(1000);
    }
    
    const rows: any[] = await query;
    return rows.map((row: any) => ({
      instanceId: row.mcpInstanceId,
      timestamp: new Date(row.timestamp).toISOString(),
      cpu: row.cpuPercent ?? 0,
      memoryMb: row.memoryRss ? row.memoryRss / (1024 * 1024) : 0,
      activeTasks: row.tasksThroughput ?? 0,
      queueDepth: 0,
    }));
  }

  private mapInstanceStatusToDb(status: string): 'running' | 'paused' | 'stopped' | 'error' {
    switch (status) {
      case 'ready': return 'running';
      case 'starting': return 'paused';
      case 'offline': return 'stopped';
      case 'error': return 'error';
      default: return 'stopped';
    }
  }

  private mapDbStatusToInstance(dbStatus: string): 'offline' | 'starting' | 'ready' | 'error' {
    switch (dbStatus) {
      case 'running': return 'ready';
      case 'paused': return 'starting';
      case 'stopped': return 'offline';
      case 'error': return 'error';
      default: return 'offline';
    }
  }

  private mapTaskStatusToDb(status: string): 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' {
    switch (status) {
      case 'queued': return 'pending';
      case 'running': return 'running';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      case 'cancelled': return 'cancelled';
      default: return 'pending';
    }
  }

  private mapDbStatusToTask(dbStatus: string): 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' {
    switch (dbStatus) {
      case 'pending': return 'queued';
      case 'running': return 'running';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      case 'cancelled': return 'cancelled';
      default: return 'queued';
    }
  }
}
