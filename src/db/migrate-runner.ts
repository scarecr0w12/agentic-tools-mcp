#!/usr/bin/env node
import { initializeDatabase } from './client.js';
import { runMigrations } from './migrate.js';
import { join } from 'path';

async function main() {
  try {
    console.log('[Migration Runner] Starting...');

    // Initialize database
    const dbPath = process.env.DATABASE_URL?.replace('sqlite:///', '') || 
                   join(process.cwd(), 'data', 'agentic-tools.db');
    
    initializeDatabase({
      path: dbPath,
      verbose: process.env.NODE_ENV === 'development'
    });

    // Run migrations
    await runMigrations();

    console.log('[Migration Runner] ✓ Complete');
    process.exit(0);
  } catch (error) {
    console.error('[Migration Runner] ✗ Failed:', error);
    process.exit(1);
  }
}

main();
