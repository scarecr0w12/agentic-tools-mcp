import { execSync } from 'node:child_process';

export async function runMigrations() {
  try {
    console.log('[db] Running migrations...');
    execSync('npm run db:migrate', {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    console.log('[db] Migrations completed successfully');
  } catch (error) {
    console.error('[db] Migration failed:', error);
    throw error;
  }
}
