import { z } from 'zod';
import { Storage } from '../../storage/storage.js';

/**
 * Get task details by ID
 *
 * @param storage - Storage instance
 * @returns MCP tool handler for getting task details
 */
export function createGetTaskTool(storage: Storage) {
  return {
    name: 'get_task',
    description: 'Get detailed information about a specific task by its ID',
    inputSchema: {
      id: z.string()
    },
    handler: async ({ id }: { id: string }) => {
      try {
        // Validate input
        if (!id || id.trim().length === 0) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Error: Task ID is required.'
            }],
            isError: true
          };
        }

        const task = await storage.getTask(id.trim());

        if (!task) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Task with ID "${id}" not found. Use list_tasks to see all available tasks.`
            }],
            isError: true
          };
        }

        // Get project information
        const project = await storage.getProject(task.projectId);
        const projectName = project ? project.name : 'Unknown Project';

        // Get child tasks for summary
        const childTasks = await storage.getTaskChildren(task.id);
        const completedChildTasks = childTasks.filter(t => t.completed || t.status === 'done').length;

        const taskStatus = task.status || (task.completed ? 'done' : 'pending');
        const childTaskSummary = childTasks.length > 0
          ? `\n**Child Tasks:** ${completedChildTasks}/${childTasks.length} completed`
          : '\n**Child Tasks:** None';

        return {
          content: [{
            type: 'text' as const,
            text: `**${task.name}** (ID: ${task.id})

**Project:** ${projectName}
**Status:** ${taskStatus}
**Priority:** ${task.priority || 'Not set'}/10
**Complexity:** ${task.complexity || 'Not set'}/10
**Completed:** ${task.completed ? 'Yes' : 'No'}
**Details:** ${task.details}
**Tags:** ${task.tags?.join(', ') || 'None'}
**Dependencies:** ${task.dependsOn?.length ? task.dependsOn.join(', ') : 'None'}
**Estimated Hours:** ${task.estimatedHours || 'Not set'}
**Actual Hours:** ${task.actualHours || 'Not set'}

**Created:** ${new Date(task.createdAt).toLocaleString()}
**Last Updated:** ${new Date(task.updatedAt).toLocaleString()}${childTaskSummary}

Use list_tasks with parentId="${task.id}" to see all child tasks for this task.`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error retrieving task: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  };
}
