import { spawn, type ChildProcess } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DashboardProcesses {
  backend: ChildProcess;
  frontend: ChildProcess;
}

let dashboardProcesses: DashboardProcesses | null = null;

/**
 * Launch the dashboard backend and frontend servers
 */
export async function launchDashboard(port: number = 4800): Promise<void> {
  if (dashboardProcesses) {
    console.error('⚠️  Dashboard is already running');
    return;
  }

  const projectRoot = path.resolve(__dirname, '../../');
  const backendDir = path.join(projectRoot, 'dashboard/backend');
  const frontendDir = path.join(projectRoot, 'dashboard/frontend');

  console.error('📊 Starting dashboard...');
  console.error(`   Backend:  http://localhost:${port}`);
  console.error(`   Frontend: http://localhost:5173`);
  console.error('');

  try {
    // Start backend
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: backendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DASHBOARD_PORT: port.toString(),
        DASHBOARD_AUTOSTART: '1', // Auto-start MCP instance
      },
      detached: false,
    });

    backend.stdout?.on('data', (chunk) => {
      const msg = chunk.toString().trim();
      if (msg) console.error(`[dashboard-backend] ${msg}`);
    });

    backend.stderr?.on('data', (chunk) => {
      const msg = chunk.toString().trim();
      if (msg && !msg.includes('deprecated')) {
        console.error(`[dashboard-backend] ${msg}`);
      }
    });

    backend.on('exit', (code) => {
      console.error(`[dashboard-backend] Process exited with code ${code}`);
      dashboardProcesses = null;
    });

    // Wait for backend to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Start frontend
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        VITE_API_URL: `http://localhost:${port}`,
      },
      detached: false,
    });

    frontend.stdout?.on('data', (chunk) => {
      const msg = chunk.toString().trim();
      if (msg) console.error(`[dashboard-frontend] ${msg}`);
    });

    frontend.stderr?.on('data', (chunk) => {
      const msg = chunk.toString().trim();
      if (msg && !msg.includes('deprecated')) {
        console.error(`[dashboard-frontend] ${msg}`);
      }
    });

    frontend.on('exit', (code) => {
      console.error(`[dashboard-frontend] Process exited with code ${code}`);
      dashboardProcesses = null;
    });

    dashboardProcesses = { backend, frontend };

    console.error('✅ Dashboard started successfully!');
    console.error('');
  } catch (error) {
    console.error('❌ Failed to start dashboard:', error);
    throw error;
  }
}

/**
 * Stop the dashboard servers
 */
export async function stopDashboard(): Promise<void> {
  if (!dashboardProcesses) {
    return;
  }

  console.error('🛑 Stopping dashboard...');

  const { backend, frontend } = dashboardProcesses;

  // Helper to wait for a process to exit, with SIGKILL fallback after timeout
  async function waitForExit(proc: ChildProcess, name: string, timeoutMs = 5000): Promise<void> {
    if (proc.exitCode !== null) return; // Already exited
    return new Promise((resolve) => {
      let exited = false;
      const onExit = () => {
        if (!exited) {
          exited = true;
          resolve();
        }
      };
      proc.once('exit', onExit);
      setTimeout(() => {
        if (!exited) {
          console.warn(`⚠️ ${name} did not exit after ${timeoutMs}ms, sending SIGKILL`);
          try {
            proc.kill('SIGKILL');
          } catch (e) {
            // Ignore
          }
        }
      }, timeoutMs);
    });
  }

  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');

  // Wait for both processes to exit, with SIGKILL fallback
  await Promise.all([
    waitForExit(backend, 'Dashboard backend'),
    waitForExit(frontend, 'Dashboard frontend'),
  ]);
  dashboardProcesses = null;
  console.error('✅ Dashboard stopped');
}

/**
 * Check if dashboard is running
 */
export function isDashboardRunning(): boolean {
  return dashboardProcesses !== null;
}
