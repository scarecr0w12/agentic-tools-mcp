export interface InstanceSummary {
  id: string;
  label: string;
  status: 'offline' | 'starting' | 'ready' | 'error';
  queueDepth: number;
  activeTasks: number;
  uptimeMs: number;
  lastHeartbeat?: string;
  version?: string;
}

export interface LogEntry {
  instanceId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface Task {
  id: string;
  name: string;
  instanceId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  startedAt?: string;
  finishedAt?: string;
}

export interface MetricsSnapshot {
  instanceId: string;
  timestamp: string;
  cpu: number;
  memoryMb: number;
  activeTasks: number;
  queueDepth: number;
}

export const api = {
  async getInstances(): Promise<InstanceSummary[]> {
    const response = await fetch('/api/instances');
    if (!response.ok) throw new Error(`Failed to fetch instances: ${response.statusText}`);
    return response.json();
  },

  async getLogs(): Promise<LogEntry[]> {
    const response = await fetch('/api/logs');
    if (!response.ok) throw new Error(`Failed to fetch logs: ${response.statusText}`);
    return response.json();
  },

  async getTasks(): Promise<Task[]> {
    const response = await fetch('/api/tasks');
    if (!response.ok) throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    return response.json();
  },

  async getMetrics(): Promise<MetricsSnapshot[]> {
    const response = await fetch('/api/metrics');
    if (!response.ok) throw new Error(`Failed to fetch metrics: ${response.statusText}`);
    return response.json();
  },

  async controlInstance(instanceId: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
    const response = await fetch(`/api/instances/${instanceId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!response.ok) throw new Error(`Failed to control instance: ${response.statusText}`);
  },
};