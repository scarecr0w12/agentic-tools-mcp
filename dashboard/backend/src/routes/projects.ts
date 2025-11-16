import type { FastifyPluginAsync } from 'fastify';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { DashboardConfig } from '../config.js';

interface ProjectsRoutesDeps {
  config: DashboardConfig;
}

// Helper to read MCP data files directly
async function readMcpData(workingDir: string) {
  try {
    const dataPath = join(workingDir, '.agentic-tools-mcp', 'tasks', 'tasks.json');
    const content = await readFile(dataPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    // File doesn't exist yet, return empty structure
    return { projects: [], tasks: [], migration: { version: '1.0.0', timestamp: new Date().toISOString() } };
  }
}

// Helper to write MCP data files directly
async function writeMcpData(workingDir: string, data: any) {
  const dataPath = join(workingDir, '.agentic-tools-mcp', 'tasks', 'tasks.json');
  await mkdir(dirname(dataPath), { recursive: true });
  await writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

export const projectsRoutes: FastifyPluginAsync<ProjectsRoutesDeps> = async (fastify, opts) => {
  const { config } = opts;

  // Helper function to call MCP tools
  async function callMcpTool(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = ['-y', '@scarecr0w12/agentic-tools-mcp'];
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

  // Helper to parse MCP tool response and extract structured data
  function parseMcpResponse(result: any): any {
    // MCP responses have format: { content: [{ type: 'text', text: '...' }] }
    if (result?.content?.[0]?.text) {
      const text = result.content[0].text;
      // Try to extract JSON from the response text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          // Not valid JSON, return as-is
        }
      }
    }
    return result;
  }

  // List all projects
    // GET /api/projects - List all projects
  fastify.get('/api/projects', async (request, reply) => {
    try {
      const workingDir = process.cwd();
      const data = await readMcpData(workingDir);
      
      // Return projects array directly
      return reply.send(data.projects || []);
    } catch (err) {
      request.log.error({ err }, 'Failed to list projects');
      return reply.status(500).send({ 
        error: 'Failed to list projects',
        message: err instanceof Error ? err.message : 'Unknown error'
      });
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
      const workingDir = process.cwd();
      const data = await readMcpData(workingDir);
      
      // Filter tasks by projectId and return only root-level tasks (no parentId)
      const projectTasks = (data.tasks || []).filter((task: any) => 
        task.projectId === id && !task.parentId
      );
      
      return reply.send(projectTasks);
    } catch (err) {
      request.log.error({ err }, 'Failed to list tasks');
      return reply.status(500).send({ 
        error: 'Failed to list tasks',
        message: err instanceof Error ? err.message : 'Unknown error'
      });
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
      const workingDir = process.cwd();
      
      const data = await readMcpData(workingDir);
      
      // Create new task
      const newTask = {
        id: randomUUID(),
        projectId,
        name: body.name,
        details: body.details,
        status: body.status || 'pending',
        priority: body.priority || 5,
        complexity: body.complexity || 5,
        estimatedHours: body.estimatedHours || 0,
        tags: body.tags || [],
        dependsOn: body.dependsOn || [],
        parentId: body.parentId || undefined,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        level: 0
      };
      
      data.tasks.push(newTask);
      await writeMcpData(workingDir, data);
      
      return reply.send(newTask);
    } catch (err) {
      request.log.error({ err }, 'Failed to create task');
      return reply.status(500).send({ 
        error: 'Failed to create task',
        message: err instanceof Error ? err.message : 'Unknown error'
      });
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
      const updates = request.body as any;
      const workingDir = process.cwd();
      
      const data = await readMcpData(workingDir);
      const taskIndex = data.tasks.findIndex((t: any) => t.id === id);
      
      if (taskIndex === -1) {
        return reply.status(404).send({ error: 'Task not found' });
      }
      
      // Update task
      data.tasks[taskIndex] = {
        ...data.tasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await writeMcpData(workingDir, data);
      return reply.send(data.tasks[taskIndex]);
    } catch (err) {
      request.log.error({ err }, 'Failed to update task');
      return reply.status(500).send({ 
        error: 'Failed to update task',
        message: err instanceof Error ? err.message : 'Unknown error'
      });
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
