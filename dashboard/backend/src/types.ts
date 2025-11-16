import { z } from 'zod';

export const InstanceStatusSchema = z.enum(['offline', 'starting', 'ready', 'error']);
export type InstanceStatus = z.infer<typeof InstanceStatusSchema>;

export const InstanceSummarySchema = z.object({
  id: z.string(),
  label: z.string(),
  status: InstanceStatusSchema,
  queueDepth: z.number().int().nonnegative(),
  activeTasks: z.number().int().nonnegative(),
  uptimeMs: z.number().int().nonnegative(),
  lastHeartbeat: z.string().datetime().optional(),
  version: z.string().optional()
});
export type InstanceSummary = z.infer<typeof InstanceSummarySchema>;

export const TaskStatusSchema = z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSnapshotSchema = z.object({
  id: z.string(),
  instanceId: z.string(),
  name: z.string(),
  status: TaskStatusSchema,
  progress: z.number().min(0).max(100).optional(),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional()
});
export type TaskSnapshot = z.infer<typeof TaskSnapshotSchema>;

export const MetricsSnapshotSchema = z.object({
  instanceId: z.string(),
  timestamp: z.string().datetime(),
  cpu: z.number().min(0),
  memoryMb: z.number().min(0),
  activeTasks: z.number().int().nonnegative(),
  queueDepth: z.number().int().nonnegative()
});
export type MetricsSnapshot = z.infer<typeof MetricsSnapshotSchema>;

export const LogEntrySchema = z.object({
  instanceId: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  timestamp: z.string().datetime(),
  details: z.record(z.unknown()).optional()
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

export type ControlAction = 'start' | 'stop' | 'restart' | 'pause' | 'resume';
