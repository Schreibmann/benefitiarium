import { loadEnv } from '@moex/config';
import { createLogger } from '@moex/observability';
import { createApp } from './create-app.js';

const env = loadEnv(process.env);
const logger = createLogger({ service: '@moex/api', level: env.LOG_LEVEL });

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

async function main(): Promise<void> {
  // Sandbox Admin routes are registered by the composition root when provider/stores are wired.
  // Until persistence wiring lands in this process, health remains available; Admin requires deps.
  const app = await createApp({ env });
  await app.listen({ port, host: '0.0.0.0' });
  logger.info('api listening', { port });
}

main().catch((error: unknown) => {
  logger.error('api failed to start', { error: String(error) });
  process.exit(1);
});
