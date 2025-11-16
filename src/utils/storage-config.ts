import { homedir } from 'os';
import { join } from 'path';

/**
 * Configuration for storage directory resolution
 */
export interface StorageConfig {
  /** Whether to use global directory mode (--claude flag) */
  useGlobalDirectory: boolean;
  /** Whether to launch the dashboard (--dashboard flag) */
  launchDashboard: boolean;
  /** Dashboard port (--dashboard-port flag) */
  dashboardPort: number;
}

/**
 * Parse command-line arguments for storage configuration
 */
export function parseCommandLineArgs(): StorageConfig {
  const args = process.argv.slice(2);
  const useGlobalDirectory = args.includes('--claude');
  const launchDashboard = args.includes('--dashboard');
  
  // Get dashboard port from --dashboard-port flag or default to 4800
  let dashboardPort = 4800;
  const portIndex = args.indexOf('--dashboard-port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    const parsedPort = parseInt(args[portIndex + 1], 10);
    if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
      dashboardPort = parsedPort;
    }
  }

  return {
    useGlobalDirectory,
    launchDashboard,
    dashboardPort,
  };
}

/**
 * Get the global storage directory path
 * - Windows: C:\Users\{username}\.agentic-tools-mcp\
 * - macOS/Linux: ~/.agentic-tools-mcp/
 */
export function getGlobalStorageDirectory(): string {
  const userHome = homedir();
  return join(userHome, '.agentic-tools-mcp');
}

/**
 * Resolve the actual working directory based on configuration
 * 
 * @param providedPath - The working directory path provided by the user
 * @param config - Storage configuration including global directory flag
 * @returns The actual working directory to use for storage
 */
export function resolveWorkingDirectory(providedPath: string, config: StorageConfig): string {
  if (config.useGlobalDirectory) {
    return getGlobalStorageDirectory();
  }
  
  return providedPath;
}

/**
 * Get updated parameter description for workingDirectory that includes --claude flag behavior
 */
export function getWorkingDirectoryDescription(config: StorageConfig): string {
  const baseDescription = 'The full absolute path to the working directory where data is stored. MUST be an absolute path, never relative. Windows: "C:\\Users\\username\\project" or "D:\\projects\\my-app". Unix/Linux/macOS: "/home/username/project" or "/Users/username/project". Do NOT use: ".", "..", "~", "./folder", "../folder" or any relative paths. Ensure the path exists and is accessible before calling this tool.';
  
  if (config.useGlobalDirectory) {
    return baseDescription + ' NOTE: Server started with --claude flag, so this parameter is ignored and a global user directory is used instead.';
  }
  
  return baseDescription + ' NOTE: When server is started with --claude flag, this parameter is ignored and a global user directory is used instead.';
}
