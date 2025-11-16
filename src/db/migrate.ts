import { getDatabase } from './client.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  id: number;
  name: string;
  executed_at: string;
}

export async function runMigrations(): Promise<void> {
  const db = getDatabase();

  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL
    )
  `);

  // Get list of executed migrations
  const executedMigrations = db
    .prepare('SELECT * FROM migrations ORDER BY id')
    .all() as Migration[];

  const executedIds = new Set(executedMigrations.map(m => m.id));

  // Define available migrations
  const migrations = [
    { id: 1, name: '001_initial_schema', file: '001_initial_schema.sql' }
  ];

  console.log('[Migrations] Starting database migrations...');

  for (const migration of migrations) {
    if (executedIds.has(migration.id)) {
      console.log(`[Migrations] ✓ ${migration.name} (already executed)`);
      continue;
    }

    console.log(`[Migrations] → Running ${migration.name}...`);

    try {
      // Read migration file
      const migrationPath = join(__dirname, 'migrations', migration.file);
      const sql = readFileSync(migrationPath, 'utf-8');

      // Execute migration in a transaction
      const runMigration = db.transaction(() => {
        db.exec(sql);
        
        // Record migration
        db.prepare(`
          INSERT INTO migrations (id, name, executed_at)
          VALUES (?, ?, ?)
        `).run(migration.id, migration.name, new Date().toISOString());
      });

      runMigration();

      console.log(`[Migrations] ✓ ${migration.name} (completed)`);
    } catch (error) {
      console.error(`[Migrations] ✗ ${migration.name} (failed):`, error);
      throw error;
    }
  }

  console.log('[Migrations] All migrations completed successfully');
}

export function getMigrationStatus(): Migration[] {
  const db = getDatabase();
  
  try {
    return db
      .prepare('SELECT * FROM migrations ORDER BY id')
      .all() as Migration[];
  } catch (error) {
    // Table doesn't exist yet
    return [];
  }
}
