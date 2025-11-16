import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import * as schema from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists - go up from src/db to dashboard/backend, then to dashboard
const backendDir = path.resolve(__dirname, '../..');
const dashboardDir = path.resolve(backendDir, '..');
const dataDir = path.resolve(dashboardDir, 'data');
mkdirSync(dataDir, { recursive: true });

const dbPath = path.resolve(dataDir, 'mcp-dashboard.db');

// Initialize SQLite database
const sqliteDb = new Database(dbPath);
sqliteDb.pragma('journal_mode = WAL');

// Initialize Drizzle ORM client
export const db = drizzle(sqliteDb, { schema });

// Export database instance for testing/shutdown
export function closeDb() {
  sqliteDb.close();
}

export default db;
