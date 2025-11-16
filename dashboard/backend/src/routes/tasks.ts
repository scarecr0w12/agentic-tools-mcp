import type { FastifyPluginAsync } from 'fastify';
import type { TaskStore } from '../services/task-store.js';

interface TasksRoutesDeps {
  store: TaskStore;
}

export const tasksRoutes: FastifyPluginAsync<TasksRoutesDeps> = async (fastify, opts) => {
  fastify.get('/api/tasks', async () => {
    return await opts.store.listTasks();
  });

  fastify.get('/api/logs', async (request) => {
    const instanceId = request.query.instanceId as string | undefined;
    const level = request.query.level as string | undefined;
    const search = request.query.search as string | undefined;
    return await opts.store.listLogs({ instanceId, level, search });
  });

  fastify.get('/api/metrics', async () => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const metrics = await opts.store.recentMetrics();
    // Filter to only the last 30 minutes
    return metrics.filter((m) => new Date(m.timestamp).getTime() >= thirtyMinutesAgo);
  });
};
