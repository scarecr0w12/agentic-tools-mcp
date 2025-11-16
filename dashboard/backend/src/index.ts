import { loadConfig } from './config.js';
import { buildServer } from './server.js';
import { runMigrations } from './db/migrate.js';

async function main() {
  // Run migrations before starting the server
  await runMigrations();

  const config = loadConfig();
  const { app, bridge } = await buildServer(config);

  app.addHook('onClose', async () => {
    await bridge.stopAll();
  });

  if (config.autoStartInstances) {
    await bridge.startAll();
  } else {
    app.log.warn('DASHBOARD_AUTOSTART is disabled; start MCP instances via POST /api/instances/:id/actions.');
  }

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Dashboard backend listening on http://${config.host}:${config.port}`);
}

main().catch((error) => {
  console.error('[dashboard] Failed to start server', error);
  process.exit(1);
});
