import type { FastifyPluginAsync } from 'fastify';
import { spawn } from 'node:child_process';
import type { DashboardConfig } from '../config.js';

interface ProjectsRoutesDeps {
  config: DashboardConfig;
}

export const projectsRoutes: FastifyPluginAsync<ProjectsRoutesDeps> = async (fastify, opts) => {
  const { config } = opts;

  // Helper function to call MCP tools
  async function callMcpTool(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = ['-y', '@pimzino/agentic-tools-mcp'];
      const child = spawn('npx', args, {
        cwd: config.instances[0]?.cwd || process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`MCP tool failed: ${stderr}`));
        } else {
          try {
            // Parse JSON-RPC response from stdout
            const lines = stdout.split('\n').filter(Boolean);
            const response = JSON.parse(lines[lines.length - 1]);
            resolve(response.result);
          } catch (err) {
            reject(new Error(`Failed to parse MCP response: ${err}`));
          }
        }
      });

      // Send JSON-RPC request
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      };
      child.stdin.write(JSON.stringify(request) + '\n');
      child.stdin.end();
    });
  }

  // List all projects
  fastify.get('/api/projects', async (request, reply) => {
    try {
      const workingDirectory = config.instances[0]?.cwd || process.cwd();
      const result = await callMcpTool('tools/call', {
        name: 'list_projects',
        arguments: { workingDirectory },
      });
      return result;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to list projects' });
    }
  });

  // Create a new project
  fastify.post('/api/projects', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'description'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { name, description } = request.body as { name: string; description: string };
      const workingDirectory = config.instances[0]?.cwd || process.cwd();
      const result = await callMcpTool('tools/call', {
        name: 'create_project',
        arguments: { workingDirectory, name, description },
      });
      return result;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to create project' });
    }
  });

  // Get project by ID
  fastify.get('/api/projects/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const workingDirectory = config.instances[0]?.cwd || process.cwd();
      const result = await callMcpTool('tools/call', {
        name: 'get_project',
        arguments: { workingDirectory, id },
      });
      return result;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to get project' });
    }
  });

  // List tasks for a project
  fastify.get('/api/projects/:id/tasks', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const workingDirectory = config.instances[0]?.cwd || process.cwd();
      const result = await callMcpTool('tools/call', {
        name: 'list_tasks',
        arguments: { workingDirectory, projectId: id, showHierarchy: false },
      });
      return result;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to list tasks' });
    }
  });

  // Create a task
  fastify.post('/api/projects/:projectId/tasks', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'details'],
        properties: {
          name: { type: 'string' },
          details: { type: 'string' },
          parentId: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'in-progress', 'blocked', 'done'] },
          priority: { type: 'number', minimum: 1, maximum: 10 },
          complexity: { type: 'number', minimum: 1, maximum: 10 },
          estimatedHours: { type: 'number', minimum: 0 },
          tags: { type: 'array', items: { type: 'string' } },
          dependsOn: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string };
      const body = request.body as any;
      const workingDirectory = config.instances[0]?.cwd || process.cwd();
      
      const result = await callMcpTool('tools/call', {
        name: 'create_task',
        arguments: {
          workingDirectory,
          projectId,
          ...body,
        },
      });
      return result;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to create task' });
    }
  });

  // Update a task
  fastify.patch('/api/tasks/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          details: { type: 'string' },
          parentId: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'in-progress', 'blocked', 'done'] },
          priority: { type: 'number', minimum: 1, maximum: 10 },
          complexity: { type: 'number', minimum: 1, maximum: 10 },
          estimatedHours: { type: 'number', minimum: 0 },
          actualHours: { type: 'number', minimum: 0 },
          tags: { type: 'array', items: { type: 'string' } },
          dependsOn: { type: 'array', items: { type: 'string' } },
          completed: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      const workingDirectory = config.instances[0]?.cwd || process.cwd();
      
      const result = await callMcpTool('tools/call', {
        name: 'update_task',
        arguments: {
          workingDirectory,
          id,
          ...body,
        },
      });
      return result;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to update task' });
    }
  });

  // Delete a task
  fastify.delete('/api/tasks/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const workingDirectory = config.instances[0]?.cwd || process.cwd();
      
      const result = await callMcpTool('tools/call', {
        name: 'delete_task',
        arguments: { workingDirectory, id, confirm: true },
      });
      return result;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to delete task' });
    }
  });
};
