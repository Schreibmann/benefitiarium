import {
  createFixtureSandboxAccountProvider,
  createSandboxSdk,
  createSdkSandboxAccountProvider,
} from '@moex/broker-tinvest';
import type { AppEnv } from '@moex/config';
import { resolveTinvestToken } from '@moex/config';
import {
  createAuditLogService,
  createMemoryAuditLogStore,
  createMemoryOutboxStore,
} from '@moex/persistence';
import {
  createMemoryOperationJournal,
  createMemorySandboxAccountStore,
  createSandboxAccountService,
} from '@moex/sandbox-management';
import type { SandboxAdminRouteDeps } from './admin/sandbox-routes.js';

/**
 * Compose Sandbox Admin dependencies for the API process.
 * Uses live sandbox SDK when TINVEST_SANDBOX_TOKEN is set; otherwise fixture provider.
 * Stores default to in-memory until Postgres session wiring is promoted in production deploy.
 */
export async function composeSandboxAdminDeps(
  env: AppEnv,
): Promise<Omit<SandboxAdminRouteDeps, 'env'>> {
  const sandboxToken = resolveTinvestToken(env, 'sandbox');
  const provider =
    sandboxToken === null
      ? createFixtureSandboxAccountProvider()
      : createSdkSandboxAccountProvider({
          sdk: await createSandboxSdk({ token: sandboxToken }),
        });

  const sandbox = createSandboxAccountService({
    provider,
    accounts: createMemorySandboxAccountStore(),
    journal: createMemoryOperationJournal(),
    allowProviderWrites: false,
  });

  return {
    sandbox,
    provider,
    audit: createAuditLogService(createMemoryAuditLogStore()),
    outbox: createMemoryOutboxStore(),
  };
}
