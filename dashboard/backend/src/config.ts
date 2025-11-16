import { z } from 'zod';

const InstanceSchema = z.object({
  id: z.string(),
  label: z.string(),
  command: z.string(),
  args: z.array(z.string()).default([]),
  cwd: z.string(),
  env: z.record(z.string()).optional(),
  autoRestart: z.boolean().default(true)
});

export type InstanceConfig = z.infer<typeof InstanceSchema>;

export interface DashboardConfig {
  host: string;
  port: number;
  corsOrigins: string[];
  autoStartInstances: boolean;
  maxLogEntries: number;
  instances: InstanceConfig[];
  enableMockData: boolean;
}

function buildDefaultInstance(): InstanceConfig {
  const args = process.env.MCP_ARGS
    ? process.env.MCP_ARGS.split(',').map((arg) => arg.trim()).filter(Boolean)
    : ['-y', '@pimzino/agentic-tools-mcp'];

  if (!args.includes('--stdio')) {
    args.push('--stdio');
  }

  return InstanceSchema.parse({
    id: 'local',
    label: process.env.MCP_LABEL ?? 'Local MCP',
    command: process.env.MCP_COMMAND ?? 'npx',
    args,
    cwd: process.env.MCP_WORKING_DIRECTORY ?? process.cwd(),
    env: undefined,
    autoRestart: process.env.MCP_AUTORESTART !== '0'
  });
}

export function loadConfig(): DashboardConfig {
  const corsOrigins = (process.env.DASHBOARD_CORS ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const port = Number(process.env.DASHBOARD_PORT ?? '4800');
  const host = process.env.DASHBOARD_HOST ?? '0.0.0.0';
  const autoStartInstances = process.env.DASHBOARD_AUTOSTART === '1';
  const maxLogEntries = Number(process.env.DASHBOARD_MAX_LOGS ?? '5000');
  const enableMockData = process.env.DASHBOARD_ENABLE_MOCKS === '1';

  let instances: InstanceConfig[] = [];
  if (process.env.DASHBOARD_INSTANCES) {
    try {
      const parsed = JSON.parse(process.env.DASHBOARD_INSTANCES);
      instances = InstanceSchema.array().parse(parsed);
    } catch (error) {
      console.warn('[dashboard] Failed to parse DASHBOARD_INSTANCES:', error);
    }
  }

  if (instances.length === 0) {
    instances = [buildDefaultInstance()];
  }

  return {
    host,
    port,
    corsOrigins,
    autoStartInstances,
    maxLogEntries,
    instances,
    enableMockData
  };
}
