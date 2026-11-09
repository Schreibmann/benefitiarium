import { loadEnv } from '@moex/config';
import { createLogger } from '@moex/observability';
import { composeSandboxAdminDeps } from './compose-sandbox-admin.js';
import { createApp } from './create-app.js';

const env = loadEnv(process.env);
const logger = createLogger({ service: '@moex/api', level: env.LOG_LEVEL });

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  const adminConfigured = env.ADMIN_API_TOKEN.trim().length > 0;
  const sandboxAdmin = adminConfigured ? await composeSandboxAdminDeps(env) : undefined;
  const app = await createApp({
    env,
    ...(sandboxAdmin !== undefined ? { sandboxAdmin } : {}),
  });
  await app.listen({ port, host: '0.0.0.0' });
  logger.info('api listening', {
    port,
    sandboxAdminEnabled: adminConfigured,
  });
}

main().catch((error: unknown) => {
  logger.error('api failed to start', { error: String(error) });
  process.exit(1);
});
