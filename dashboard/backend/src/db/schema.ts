import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// MCP Instances - metadata about running MCP runtimes
export const mcpInstances = sqliteTable('mcp_instances', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status', { enum: ['running', 'paused', 'stopped', 'error'] }).notNull(),
  uptime: integer('uptime').default(0), // milliseconds
  host: text('host'),
  port: integer('port'),
  pid: integer('pid'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Task Runtime - latest snapshot of each task
export const tasksRuntime = sqliteTable('tasks_runtime', {
  id: text('id').primaryKey(),
  mcpInstanceId: text('mcp_instance_id').notNull().references(() => mcpInstances.id),
  taskId: text('task_id').notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
  }).notNull(),
  progress: integer('progress').default(0), // 0-100
  executionTime: integer('execution_time'), // milliseconds
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Task History - append-only log of task lifecycle events
export const taskHistory = sqliteTable('task_history', {
  id: text('id').primaryKey(),
  mcpInstanceId: text('mcp_instance_id').notNull().references(() => mcpInstances.id),
  taskId: text('task_id').notNull(),
  eventType: text('event_type', {
    enum: ['queued', 'started', 'progress', 'completed', 'failed', 'cancelled'],
  }).notNull(),
  details: text('details'), // JSON string
  timestamp: integer('timestamp').notNull(),
});

// Operation Queue - control commands audit trail
export const operationQueue = sqliteTable('operation_queue', {
  id: text('id').primaryKey(),
  mcpInstanceId: text('mcp_instance_id').notNull().references(() => mcpInstances.id),
  commandType: text('command_type', {
    enum: ['start', 'pause', 'resume', 'stop', 'rerun', 'cancel'],
  }).notNull(),
  targetTaskId: text('target_task_id'),
  status: text('status', { enum: ['pending', 'executing', 'completed', 'failed'] }).notNull(),
  createdAt: integer('created_at').notNull(),
  completedAt: integer('completed_at'),
});

// Logs - structured log entries
export const logs = sqliteTable('logs', {
  id: text('id').primaryKey(),
  mcpInstanceId: text('mcp_instance_id').notNull().references(() => mcpInstances.id),
  level: text('level', { enum: ['debug', 'info', 'warn', 'error'] }).notNull(),
  message: text('message').notNull(),
  tags: text('tags'), // JSON array as string
  correlationId: text('correlation_id'),
  payload: text('payload'), // JSON string
  timestamp: integer('timestamp').notNull(),
});

// Metrics Timeseries - aggregated resource metrics (10s buckets)
export const metricsTimeseries = sqliteTable('metrics_timeseries', {
  id: text('id').primaryKey(),
  mcpInstanceId: text('mcp_instance_id').notNull().references(() => mcpInstances.id),
  timestamp: integer('timestamp').notNull(),
  cpuPercent: real('cpu_percent'),
  memoryRss: integer('memory_rss'), // bytes
  memoryHeap: integer('memory_heap'), // bytes
  avgExecutionTime: real('avg_execution_time'), // milliseconds
  tasksThroughput: integer('tasks_throughput'), // tasks in bucket
});

// Config Revisions - JSON blob per save with audit trail
export const configRevisions = sqliteTable('config_revisions', {
  id: text('id').primaryKey(),
  mcpInstanceId: text('mcp_instance_id').notNull().references(() => mcpInstances.id),
  configJson: text('config_json').notNull(), // full JSON config
  author: text('author'),
  diffSummary: text('diff_summary'),
  createdAt: integer('created_at').notNull(),
});

// Users - authentication records
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  role: text('role', { enum: ['viewer', 'operator', 'admin'] }).notNull().default('viewer'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Sessions - auth sessions
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
});
