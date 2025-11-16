import { EventEmitter } from 'eventemitter3';

export type DashboardEventMap = {
  'bridge:status': { instanceId: string; status: string };
  'bridge:log': { instanceId: string; level: 'debug' | 'info' | 'warn' | 'error'; message: string; details?: Record<string, unknown> };
  'bridge:task': { instanceId: string; task: Record<string, unknown> };
  'bridge:metrics': { instanceId: string; metrics: Record<string, unknown> };
};

export class EventBus extends EventEmitter<DashboardEventMap> {
  emitStatus(payload: DashboardEventMap['bridge:status']) {
    this.emit('bridge:status', payload);
  }

  emitLog(payload: DashboardEventMap['bridge:log']) {
    this.emit('bridge:log', payload);
  }

  emitTask(payload: DashboardEventMap['bridge:task']) {
    this.emit('bridge:task', payload);
  }

  emitMetrics(payload: DashboardEventMap['bridge:metrics']) {
    this.emit('bridge:metrics', payload);
  }
}
