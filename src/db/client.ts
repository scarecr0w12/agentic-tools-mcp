import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export interface DbConfig {
  path: string;
  verbose?: boolean;
}

let db: Database.Database | null = null;

export function initializeDatabase(config: DbConfig): Database.Database {
  if (db) {
    return db;
  }

  // Ensure data directory exists
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Initialize database connection
  db = new Database(config.path, {
    verbose: config.verbose ? console.log : undefined
  });

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  
  // Set recommended pragmas for performance
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('temp_store = MEMORY');
  db.pragma('mmap_size = 30000000000'); // 30GB memory-mapped I/O

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  console.log('[Database] Initialized SQLite database at:', config.path);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[Database] Closed database connection');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});
