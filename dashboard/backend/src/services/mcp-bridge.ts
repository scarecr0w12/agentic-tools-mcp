import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import pidusage from 'pidusage';
import type { InstanceConfig, DashboardConfig } from '../config.js';
import type { EventBus } from './event-bus.js';
import type { TaskStore } from './task-store.js';
import type { InstanceSummary } from '../types.js';

interface BridgeOptions {
  config: DashboardConfig;
  eventBus: EventBus;
  store: TaskStore;
  logger: any;
}

interface ManagedInstance {
  config: InstanceConfig;
  process?: ChildProcessWithoutNullStreams;
  status: InstanceSummary['status'];
  restartAttempts: number;
  lastStart?: number;
  metricsInterval?: NodeJS.Timeout;
}

export class McpBridge {
  private readonly instances = new Map<string, ManagedInstance>();

  constructor(private readonly options: BridgeOptions) {
    for (const instance of options.config.instances) {
      this.instances.set(instance.id, {
        config: instance,
        status: 'offline',
        restartAttempts: 0
      });
    }
  }

  list() {
    return Array.from(this.instances.entries()).map(([id, instance]) => ({
      id,
      config: instance.config,
      status: instance.status
    }));
  }

  async startAll() {
    await Promise.all(Array.from(this.instances.keys()).map((id) => this.start(id)));
  }

  async stopAll() {
    await Promise.all(Array.from(this.instances.keys()).map((id) => this.stop(id)));
  }

  async start(id: string) {
    const managed = this.instances.get(id);
    if (!managed) throw new Error(`Unknown instance ${id}`);
    if (managed.process) return;

    this.options.logger.info({ id }, 'Starting MCP instance');
    const child = spawn(managed.config.command, managed.config.args, {
      cwd: managed.config.cwd,
      env: { ...process.env, ...managed.config.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    managed.process = child;
    managed.status = 'starting';
    managed.lastStart = Date.now();

    await this.options.store.upsertInstance({
      id,
      label: managed.config.label,
      status: 'starting',
      queueDepth: 0,
      activeTasks: 0,
      uptimeMs: 0
    });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      this.options.logger.debug({ id }, chunk.toString());
      this.options.store.addLog({
        instanceId: id,
        level: 'debug',
        message: chunk.toString(),
        timestamp: new Date().toISOString()
      }).catch((err) => this.options.logger.error(err, 'Failed to add log'));
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      this.options.logger.warn({ id }, chunk.toString());
      this.options.store.addLog({
        instanceId: id,
        level: 'warn',
        message: chunk.toString(),
        timestamp: new Date().toISOString()
      }).catch((err) => this.options.logger.error(err, 'Failed to add log'));
    });

    child.once('exit', (code) => {
      this.options.logger.warn({ id, code }, 'MCP instance exited');
      managed.process = undefined;
      managed.status = 'offline';
      this.options.store.upsertInstance({
        id,
        label: managed.config.label,
        status: 'offline',
        queueDepth: 0,
        activeTasks: 0,
        uptimeMs: 0
      }).catch((err) => this.options.logger.error(err, 'Failed to update instance'));
      if (managed.config.autoRestart) {
        managed.restartAttempts += 1;
        setTimeout(() => this.start(id).catch((err) => this.options.logger.error(err, 'Auto-restart failed')), 1000 * managed.restartAttempts);
      }
    });

    await once(child.stdout, 'data');
    managed.status = 'ready';
    managed.restartAttempts = 0;
    await this.options.store.upsertInstance({
      id,
      label: managed.config.label,
      status: 'ready',
      queueDepth: 0,
      activeTasks: 0,
      uptimeMs: 0
    });

    this.startMetricsCollector(id, managed);
  }

  private startMetricsCollector(id: string, managed: ManagedInstance) {
    if (managed.metricsInterval) {
      clearInterval(managed.metricsInterval);
    }

    managed.metricsInterval = setInterval(async () => {
      if (!managed.process) {
        return;
      }

      try {
        const stats = await pidusage(managed.process.pid!);
        const memoryMb = stats.memory / (1024 * 1024);

        await this.options.store.addMetrics({
          instanceId: id,
          timestamp: new Date().toISOString(),
          cpu: stats.cpu,
          memoryMb,
          activeTasks: 0,
          queueDepth: 0
        });
      } catch (err) {
        this.options.logger.error({ id, err }, 'Failed to collect metrics');
      }
    }, 10000);
  }

  async stop(id: string) {
    const managed = this.instances.get(id);
    if (!managed || !managed.process) return;
    
    if (managed.metricsInterval) {
      clearInterval(managed.metricsInterval);
      managed.metricsInterval = undefined;
    }
    
    managed.config.autoRestart = false;
    managed.process.kill('SIGTERM');
    await once(managed.process, 'exit');
    managed.process = undefined;
    managed.status = 'offline';
    await this.options.store.upsertInstance({
      id,
      label: managed.config.label,
      status: 'offline',
      queueDepth: 0,
      activeTasks: 0,
      uptimeMs: 0
    });
  }
}
