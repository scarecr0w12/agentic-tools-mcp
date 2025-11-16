import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FileStorage } from './features/task-management/storage/file-storage.js';
import { FileStorage as MemoryFileStorage } from './features/agent-memories/storage/file-storage.js';
import { getVersion } from './utils/version.js';
import { StorageConfig, resolveWorkingDirectory, getWorkingDirectoryDescription } from './utils/storage-config.js';
import { z } from 'zod';

// Project tools
import { createListProjectsTool } from './features/task-management/tools/projects/list.js';
import { createCreateProjectTool } from './features/task-management/tools/projects/create.js';
import { createGetProjectTool } from './features/task-management/tools/projects/get.js';
import { createUpdateProjectTool } from './features/task-management/tools/projects/update.js';
import { createDeleteProjectTool } from './features/task-management/tools/projects/delete.js';

// Task tools
import { createListTasksTool } from './features/task-management/tools/tasks/list.js';
import { createCreateTaskTool } from './features/task-management/tools/tasks/create.js';
import { createGetTaskTool } from './features/task-management/tools/tasks/get.js';
import { createUpdateTaskTool } from './features/task-management/tools/tasks/update.js';
import { createDeleteTaskTool } from './features/task-management/tools/tasks/delete.js';

// Memory tools
import { createCreateMemoryTool } from './features/agent-memories/tools/memories/create.js';
import { createSearchMemoriesTool } from './features/agent-memories/tools/memories/search.js';
import { createGetMemoryTool } from './features/agent-memories/tools/memories/get.js';
import { createListMemoriesTool } from './features/agent-memories/tools/memories/list.js';
import { createUpdateMemoryTool } from './features/agent-memories/tools/memories/update.js';
import { createDeleteMemoryTool } from './features/agent-memories/tools/memories/delete.js';

// Advanced task management tools (TaskMaster-like features)
import { createParsePRDTool } from './features/task-management/tools/prd/parse-prd.js';
import { createNextTaskRecommendationTool } from './features/task-management/tools/recommendations/next-task.js';
import { createComplexityAnalysisTool } from './features/task-management/tools/analysis/complexity-analysis.js';
import { createProgressInferenceTool } from './features/task-management/tools/analysis/progress-inference.js';
import { createTaskResearchTool } from './features/task-management/tools/research/task-research.js';
import { createResearchQueriesGeneratorTool } from './features/task-management/tools/research/research-queries.js';

/**
 * Create storage instance for a specific working directory
 */
async function createStorage(workingDirectory: string, config: StorageConfig): Promise<FileStorage> {
  const resolvedDirectory = resolveWorkingDirectory(workingDirectory, config);
  const storage = new FileStorage(resolvedDirectory);
  await storage.initialize();
  return storage;
}

/**
 * Create memory storage instance for a specific working directory
 */
async function createMemoryStorage(workingDirectory: string, config: StorageConfig): Promise<MemoryFileStorage> {
  const resolvedDirectory = resolveWorkingDirectory(workingDirectory, config);
  const storage = new MemoryFileStorage(resolvedDirectory);
  await storage.initialize();
  return storage;
}

/**
 * Wrap a tool handler with standardized error handling
 */
function wrapToolHandler<TParams extends { workingDirectory: string }, TResult>(
  handler: (params: TParams) => Promise<TResult>
): (params: TParams) => Promise<TResult> {
  return async (params: TParams) => {
    try {
      return await handler(params);
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      } as TResult;
    }
  };
}

/**
 * Create and configure the MCP server for task management and agent memories
 */
export async function createServer(config: StorageConfig = { 
  useGlobalDirectory: false,
  launchDashboard: false,
  dashboardPort: 4800
}): Promise<McpServer> {
  // Create MCP server with dynamic version from package.json
  const server = new McpServer({
    name: '@pimzino/agentic-tools-mcp',
    version: getVersion()
  });

  // Register project management tools
  server.tool(
    'list_projects',
    'Discover and overview all your projects with comprehensive details and progress insights. Perfect for getting a bird\'s-eye view of your work portfolio, tracking project status, and quickly navigating between different initiatives in your workspace with project-specific storage.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config))
    },
    wrapToolHandler(async ({ workingDirectory }: { workingDirectory: string }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createListProjectsTool(storage);
      return await tool.handler();
    })
  );

  server.tool(
    'create_project',
    'Launch new projects with structured organization and detailed documentation. Establishes a solid foundation for task management with Git-trackable project data, enabling seamless collaboration and progress tracking across your development workflow.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      name: z.string().describe('The name of the new project'),
      description: z.string().describe('A detailed description of the project')
    },
    wrapToolHandler(async ({ workingDirectory, name, description }: { workingDirectory: string; name: string; description: string }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createCreateProjectTool(storage);
      return await tool.handler({ name, description });
    })
  );

  server.tool(
    'get_project',
    'Access comprehensive project details including metadata, creation dates, and current status. Essential for project analysis, reporting, and understanding project context when planning tasks or reviewing progress in your development workflow.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      id: z.string().describe('The unique identifier of the project to retrieve')
    },
    wrapToolHandler(async ({ workingDirectory, id }: { workingDirectory: string; id: string }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createGetProjectTool(storage);
      return await tool.handler({ id });
    })
  );

  server.tool(
    'update_project',
    'Evolve and refine your project information as requirements change and scope develops. Maintain accurate project documentation with flexible updates to names and descriptions, ensuring your project data stays current and meaningful throughout the development lifecycle.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      id: z.string().describe('The unique identifier of the project to update'),
      name: z.string().optional().describe('New name for the project (optional)'),
      description: z.string().optional().describe('New description for the project (optional)')
    },
    wrapToolHandler(async ({ workingDirectory, id, name, description }: { workingDirectory: string; id: string; name?: string; description?: string }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createUpdateProjectTool(storage);
      return await tool.handler({ id, name, description });
    })
  );

  server.tool(
    'delete_project',
    'Safely remove completed or obsolete projects from your workspace with built-in confirmation safeguards. Permanently cleans up project data while protecting against accidental deletions, helping maintain an organized and current project portfolio.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      id: z.string().describe('The unique identifier of the project to delete'),
      confirm: z.boolean().describe('Must be set to true to confirm deletion (safety measure)')
    },
    wrapToolHandler(async ({ workingDirectory, id, confirm }: { workingDirectory: string; id: string; confirm: boolean }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createDeleteProjectTool(storage);
      return await tool.handler({ id, confirm });
    })
  );

  // Register task management tools
  server.tool(
    'list_tasks',
    'Explore and organize your task portfolio with intelligent filtering and comprehensive progress tracking. View all tasks across projects or focus on specific project tasks, perfect for sprint planning, progress reviews, and maintaining productivity momentum.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      projectId: z.string().describe('ID of the project to list tasks for'),
      parentId: z.string().optional().describe('Filter to tasks under this parent (optional)'),
      showHierarchy: z.boolean().optional().describe('Show tasks in hierarchical tree format (default: true)'),
      includeCompleted: z.boolean().optional().describe('Include completed tasks in results (default: true)')
    },
    wrapToolHandler(async ({ workingDirectory, projectId, parentId, showHierarchy, includeCompleted }: {
      workingDirectory: string;
      projectId: string;
      parentId?: string;
      showHierarchy?: boolean;
      includeCompleted?: boolean;
    }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createListTasksTool(storage);
      return await tool.handler({ projectId, parentId, showHierarchy, includeCompleted });
    })
  );

  server.tool(
    'create_task',
    'Transform project goals into actionable, trackable tasks with advanced features including dependencies, priorities, complexity estimation, and workflow management. Build structured workflows that break down complex projects into manageable components with unlimited hierarchy depth.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      name: z.string().describe('The name/title of the new task'),
      details: z.string().describe('Detailed description of what the task involves'),
      projectId: z.string().describe('The ID of the project this task belongs to'),
      parentId: z.string().optional().describe('Parent task ID for unlimited nesting (optional - creates top-level task if not specified)'),
      dependsOn: z.array(z.string()).optional().describe('Array of task IDs that must be completed before this task'),
      priority: z.number().min(1).max(10).optional().describe('Task priority level (1-10, where 10 is highest priority)'),
      complexity: z.number().min(1).max(10).optional().describe('Estimated complexity/effort (1-10, where 10 is most complex)'),
      status: z.enum(['pending', 'in-progress', 'blocked', 'done']).optional().describe('Initial task status (defaults to pending)'),
      tags: z.array(z.string()).optional().describe('Tags for categorization and filtering'),
      estimatedHours: z.number().min(0).optional().describe('Estimated time to complete in hours')
    },
    wrapToolHandler(async ({ workingDirectory, name, details, projectId, parentId, dependsOn, priority, complexity, status, tags, estimatedHours }: {
      workingDirectory: string;
      name: string;
      details: string;
      projectId: string;
      parentId?: string;
      dependsOn?: string[];
      priority?: number;
      complexity?: number;
      status?: 'pending' | 'in-progress' | 'blocked' | 'done';
      tags?: string[];
      estimatedHours?: number;
    }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createCreateTaskTool(storage);
      return await tool.handler({ name, details, projectId, parentId, dependsOn, priority, complexity, status, tags, estimatedHours });
    })
  );

  server.tool(
    'get_task',
    'Deep-dive into task specifics with comprehensive details including progress status, creation history, and full context. Essential for task analysis, status reporting, and understanding dependencies when planning work or conducting progress reviews.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      id: z.string().describe('The unique identifier of the task to retrieve')
    },
    wrapToolHandler(async ({ workingDirectory, id }: { workingDirectory: string; id: string }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createGetTaskTool(storage);
      return await tool.handler({ id });
    })
  );

  // Register agent memory management tools
  server.tool(
    'create_memory',
    'Capture and preserve important information, insights, or context as searchable memories with intelligent file-based storage. Ideal for building a knowledge base of user preferences, technical decisions, project context, or any information you want to remember and retrieve later with organized categorization.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      title: z.string().describe('Short title for the memory (max 50 characters for better file organization)'),
      content: z.string().describe('Detailed memory content/text (no character limit)'),
      metadata: z.record(z.any()).optional().describe('Optional metadata as key-value pairs for additional context'),
      category: z.string().optional().describe('Optional category to organize memories (e.g., "user_preferences", "project_context")')
    },
    wrapToolHandler(async ({ workingDirectory, title, content, metadata, category }: {
      workingDirectory: string;
      title: string;
      content: string;
      metadata?: Record<string, any>;
      category?: string;
    }) => {
      const storage = await createMemoryStorage(workingDirectory, config);
      const tool = createCreateMemoryTool(storage);
      return await tool.handler({ title, content, metadata, category });
    })
  );

  server.tool(
    'search_memories',
    'Intelligently search through your stored memories using advanced text matching algorithms to quickly find relevant information. Features multi-field search across titles, content, and metadata with customizable relevance scoring - perfect for retrieving past decisions, preferences, or contextual information when you need it most.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      query: z.string().describe('The search query text to find matching memories'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of results to return (default: 10)'),
      threshold: z.number().min(0).max(1).optional().describe('Minimum relevance threshold 0-1 (default: 0.3)'),
      category: z.string().optional().describe('Filter results to memories in this specific category')
    },
    wrapToolHandler(async ({ workingDirectory, query, limit, threshold, category }: {
      workingDirectory: string;
      query: string;
      limit?: number;
      threshold?: number;
      category?: string;
    }) => {
      const storage = await createMemoryStorage(workingDirectory, config);
      const tool = createSearchMemoriesTool(storage);
      return await tool.handler({ query, limit, threshold, category });
    })
  );

  server.tool(
    'get_memory',
    'Access comprehensive memory details including full content, metadata, creation history, and categorization. Essential for reviewing stored knowledge, understanding context, and retrieving complete information when making decisions or referencing past insights.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      id: z.string().describe('The unique identifier of the memory to retrieve')
    },
    wrapToolHandler(async ({ workingDirectory, id }: { workingDirectory: string; id: string }) => {
      const storage = await createMemoryStorage(workingDirectory, config);
      const tool = createGetMemoryTool(storage);
      return await tool.handler({ id });
    })
  );

  server.tool(
    'list_memories',
    'Browse and explore your knowledge repository with organized memory listings and flexible category filtering. Perfect for reviewing stored information, discovering patterns in your knowledge base, and maintaining awareness of your accumulated insights and decisions.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      category: z.string().optional().describe('Filter to memories in this specific category'),
      limit: z.number().min(1).max(1000).optional().describe('Maximum number of memories to return (default: 50)')
    },
    wrapToolHandler(async ({ workingDirectory, category, limit }: {
      workingDirectory: string;
      category?: string;
      limit?: number;
    }) => {
      const storage = await createMemoryStorage(workingDirectory, config);
      const tool = createListMemoriesTool(storage);
      return await tool.handler({ category, limit });
    })
  );

  server.tool(
    'update_memory',
    'Evolve and refine your stored knowledge with flexible updates to content, categorization, and metadata. Keep your memory repository current and accurate as understanding deepens, ensuring your memory base remains a reliable source of up-to-date insights and decisions.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      id: z.string().describe('The unique identifier of the memory to update'),
      title: z.string().optional().describe('New title for the memory (max 50 characters for better file organization)'),
      content: z.string().optional().describe('New detailed content for the memory (no character limit)'),
      metadata: z.record(z.any()).optional().describe('New metadata as key-value pairs (replaces existing metadata)'),
      category: z.string().optional().describe('New category for organizing the memory')
    },
    wrapToolHandler(async ({ workingDirectory, id, title, content, metadata, category }: {
      workingDirectory: string;
      id: string;
      title?: string;
      content?: string;
      metadata?: Record<string, any>;
      category?: string;
    }) => {
      const storage = await createMemoryStorage(workingDirectory, config);
      const tool = createUpdateMemoryTool(storage);
      return await tool.handler({ id, title, content, metadata, category });
    })
  );

  server.tool(
    'delete_memory',
    'Safely remove outdated or irrelevant memories from your knowledge repository with built-in confirmation safeguards. Maintain a clean, focused memory collection while protecting against accidental loss of valuable information through required confirmation protocols.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      id: z.string().describe('The unique identifier of the memory to delete'),
      confirm: z.boolean().describe('Must be set to true to confirm deletion (safety measure)')
    },
    wrapToolHandler(async ({ workingDirectory, id, confirm }: { workingDirectory: string; id: string; confirm: boolean }) => {
      const storage = await createMemoryStorage(workingDirectory, config);
      const tool = createDeleteMemoryTool(storage);
      return await tool.handler({ id, confirm });
    })
  );

  // Register advanced task management tools
  server.tool(
    'parse_prd',
    'Parse a Product Requirements Document (PRD) and automatically generate structured tasks with dependencies, priorities, and complexity estimates. Transform high-level requirements into actionable task breakdowns with intelligent analysis.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      projectId: z.string().describe('ID of the project to add tasks to'),
      prdContent: z.string().describe('Content of the Product Requirements Document to parse'),
      generateSubtasks: z.boolean().optional().default(true).describe('Whether to generate subtasks for complex tasks'),
      defaultPriority: z.number().min(1).max(10).optional().default(5).describe('Default priority for generated tasks (1-10)'),
      estimateComplexity: z.boolean().optional().default(true).describe('Whether to estimate complexity for tasks')
    },
    wrapToolHandler(async ({ workingDirectory, projectId, prdContent, generateSubtasks, defaultPriority, estimateComplexity }: {
      workingDirectory: string;
      projectId: string;
      prdContent: string;
      generateSubtasks?: boolean;
      defaultPriority?: number;
      estimateComplexity?: boolean;
    }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createParsePRDTool(storage, getWorkingDirectoryDescription, config);
      return await tool.handler({ workingDirectory, projectId, prdContent, generateSubtasks, defaultPriority, estimateComplexity });
    })
  );

  server.tool(
    'get_next_task_recommendation',
    'Get intelligent recommendations for the next task to work on based on dependencies, priorities, complexity, and current project status. Smart task recommendation engine for optimal workflow management and productivity.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      projectId: z.string().optional().describe('Filter recommendations to a specific project'),
      maxRecommendations: z.number().min(1).max(10).optional().default(3).describe('Maximum number of task recommendations to return'),
      considerComplexity: z.boolean().optional().default(true).describe('Whether to factor in task complexity for recommendations'),
      preferredTags: z.array(z.string()).optional().describe('Preferred task tags to prioritize in recommendations'),
      excludeBlocked: z.boolean().optional().default(true).describe('Whether to exclude blocked tasks from recommendations')
    },
    wrapToolHandler(async ({ workingDirectory, projectId, maxRecommendations, considerComplexity, preferredTags, excludeBlocked }: {
      workingDirectory: string;
      projectId?: string;
      maxRecommendations?: number;
      considerComplexity?: boolean;
      preferredTags?: string[];
      excludeBlocked?: boolean;
    }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createNextTaskRecommendationTool(storage, getWorkingDirectoryDescription, config);
      return await tool.handler({ workingDirectory, projectId, maxRecommendations, considerComplexity, preferredTags, excludeBlocked });
    })
  );

  server.tool(
    'analyze_task_complexity',
    'Analyze task complexity and suggest breaking down overly complex tasks into smaller, manageable subtasks. Intelligent complexity analysis to identify tasks that should be split for better productivity and progress tracking.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      taskId: z.string().optional().describe('Specific task ID to analyze (if not provided, analyzes all tasks)'),
      projectId: z.string().optional().describe('Filter analysis to a specific project'),
      complexityThreshold: z.number().min(1).max(10).optional().default(7).describe('Complexity threshold above which tasks should be broken down'),
      suggestBreakdown: z.boolean().optional().default(true).describe('Whether to suggest specific task breakdowns'),
      autoCreateSubtasks: z.boolean().optional().default(false).describe('Whether to automatically create suggested subtasks')
    },
    wrapToolHandler(async ({ workingDirectory, taskId, projectId, complexityThreshold, suggestBreakdown, autoCreateSubtasks }: {
      workingDirectory: string;
      taskId?: string;
      projectId?: string;
      complexityThreshold?: number;
      suggestBreakdown?: boolean;
      autoCreateSubtasks?: boolean;
    }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createComplexityAnalysisTool(storage, getWorkingDirectoryDescription, config);
      return await tool.handler({ workingDirectory, taskId, projectId, complexityThreshold, suggestBreakdown, autoCreateSubtasks });
    })
  );

  server.tool(
    'infer_task_progress',
    'Analyze the codebase to infer which tasks appear to be completed based on code changes, file creation, and implementation evidence. Intelligent progress inference to automatically track task completion from code analysis.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      projectId: z.string().optional().describe('Filter analysis to a specific project'),
      scanDepth: z.number().min(1).max(5).optional().default(3).describe('Directory depth to scan for code files'),
      fileExtensions: z.array(z.string()).optional().default(['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.go', '.rs']).describe('File extensions to analyze'),
      autoUpdateTasks: z.boolean().optional().default(false).describe('Whether to automatically update task status based on inference'),
      confidenceThreshold: z.number().min(0).max(1).optional().default(0.7).describe('Confidence threshold for auto-updating tasks (0-1)')
    },
    wrapToolHandler(async ({ workingDirectory, projectId, scanDepth, fileExtensions, autoUpdateTasks, confidenceThreshold }: {
      workingDirectory: string;
      projectId?: string;
      scanDepth?: number;
      fileExtensions?: string[];
      autoUpdateTasks?: boolean;
      confidenceThreshold?: number;
    }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createProgressInferenceTool(storage, getWorkingDirectoryDescription, config);
      return await tool.handler({ workingDirectory, projectId, scanDepth, fileExtensions, autoUpdateTasks, confidenceThreshold });
    })
  );

  // Register research tools (hybrid web + memory approach)
  server.tool(
    'research_task',
    'Guide the AI agent to perform comprehensive web research for a task, with intelligent research suggestions and automatic memory storage of findings. Combines web research capabilities with local knowledge caching for optimal research workflow.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      taskId: z.string().describe('ID of the task to research'),
      researchAreas: z.array(z.string()).optional().describe('Specific areas to research (auto-generated if not provided)'),
      saveToMemories: z.boolean().optional().default(true).describe('Whether to save research findings to memories'),
      checkExistingMemories: z.boolean().optional().default(true).describe('Whether to check existing memories first'),
      researchDepth: z.enum(['quick', 'standard', 'comprehensive']).optional().default('standard').describe('Depth of research to perform')
    },
    wrapToolHandler(async ({ workingDirectory, taskId, researchAreas, saveToMemories, checkExistingMemories, researchDepth }: {
      workingDirectory: string;
      taskId: string;
      researchAreas?: string[];
      saveToMemories?: boolean;
      checkExistingMemories?: boolean;
      researchDepth?: 'quick' | 'standard' | 'comprehensive';
    }) => {
      const storage = await createStorage( workingDirectory, config);
      const memoryStorage = await createMemoryStorage(workingDirectory, config);
      const tool = createTaskResearchTool(storage, memoryStorage, getWorkingDirectoryDescription, config);
      return await tool.handler({ workingDirectory, taskId, researchAreas, saveToMemories, checkExistingMemories, researchDepth });
    })
  );

  server.tool(
    'generate_research_queries',
    'Generate intelligent, targeted web search queries for task research. Provides structured search strategies to help AI agents find the most relevant information efficiently with optimized search terms and techniques.',
    {
      workingDirectory: z.string().describe(getWorkingDirectoryDescription(config)),
      taskId: z.string().describe('ID of the task to generate research queries for'),
      queryTypes: z.array(z.enum(['implementation', 'best_practices', 'troubleshooting', 'alternatives', 'performance', 'security', 'examples', 'tools'])).optional().describe('Types of queries to generate'),
      includeAdvanced: z.boolean().optional().default(false).describe('Include advanced search operators and techniques'),
      targetYear: z.number().optional().default(new Date().getFullYear()).describe('Target year for recent information (default: current year)')
    },
    wrapToolHandler(async ({ workingDirectory, taskId, queryTypes, includeAdvanced, targetYear }: {
      workingDirectory: string;
      taskId: string;
      queryTypes?: string[];
      includeAdvanced?: boolean;
      targetYear?: number;
    }) => {
      const storage = await createStorage(workingDirectory, config);
      const tool = createResearchQueriesGeneratorTool(storage, getWorkingDirectoryDescription, config);
      return await tool.handler({ workingDirectory, taskId, queryTypes, includeAdvanced, targetYear });
    })
  );

  return server;
}
