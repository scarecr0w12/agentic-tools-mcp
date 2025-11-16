import type { FastifyPluginAsync } from 'fastify';
import type { TaskStore } from '../services/task-store.js';
import type { McpBridge } from '../services/mcp-bridge.js';
import type { DashboardConfig } from '../config.js';

interface InstancesRoutesDeps {
  store: TaskStore;
  bridge: McpBridge;
  config: DashboardConfig;
}

export const instancesRoutes: FastifyPluginAsync<InstancesRoutesDeps> = async (fastify, opts) => {
  const { store, bridge } = opts;

  fastify.get('/api/instances', async () => {
    return await store.listInstances();
  });

  fastify.post('/api/instances/:id/actions', {
    schema: {
      body: {
        type: 'object',
        required: ['action'],
        properties: {
          action: {
            type: 'string',
            enum: ['start', 'stop', 'restart']
          }
        }
      }
    }
  }, async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const { action } = request.body as { action: 'start' | 'stop' | 'restart' };
    if (action === 'start') {
      await bridge.start(id);
    } else if (action === 'stop') {
      await bridge.stop(id);
    } else if (action === 'restart') {
      await bridge.stop(id);
      await bridge.start(id);
    }
    return reply.status(202).send({ status: 'accepted' });
  });
};
