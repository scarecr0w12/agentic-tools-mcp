#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { getVersionString } from './utils/version.js';
import { parseCommandLineArgs } from './utils/storage-config.js';
import { launchDashboard, stopDashboard } from './utils/dashboard-launcher.js';

/**
 * Main entry point for the MCP task management server
 * Uses STDIO transport for communication with MCP clients
 */
async function main() {
  try {
    // Parse command-line arguments
    const storageConfig = parseCommandLineArgs();

    // Create the MCP server with configuration
    const server = await createServer(storageConfig);

    // Create STDIO transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);

    // Log server start (to stderr so it doesn't interfere with MCP communication)
    console.error(`🚀 Agentic Tools MCP Server ${getVersionString()} started successfully`);

    // Show storage mode
    if (storageConfig.useGlobalDirectory) {
      console.error('🌐 Global directory mode: Using ~/.agentic-tools-mcp/ for all data storage');
    } else {
      console.error('📁 Project-specific mode: Using .agentic-tools-mcp/ within each working directory');
    }
    console.error('');

    console.error('📋 Task Management features available:');
    console.error('   • Project Management (list, create, get, update, delete)');
    console.error('   • Task Management (list, create, get, update, delete)');
    console.error('   • Subtask Management (list, create, get, update, delete)');
    console.error('');
    console.error('🧠 Agent Memories features available:');
    console.error('   • Memory Management (create, search, get, list, update, delete)');
    console.error('   • Intelligent multi-field text search with relevance scoring');
    console.error('   • JSON file storage with title/content architecture');
    console.error('');
    console.error('💡 Use list_projects to get started with tasks, or create_memory for memories!');
    
    // Launch dashboard if requested
    if (storageConfig.launchDashboard) {
      await launchDashboard(storageConfig.dashboardPort);
    }
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('\n👋 Shutting down MCP server...');
  await stopDashboard();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n👋 Shutting down MCP server...');
  await stopDashboard();
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
