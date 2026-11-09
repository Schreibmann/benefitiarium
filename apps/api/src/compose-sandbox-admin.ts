import {
  createFixtureSandboxAccountProvider,
  createSandboxSdk,
  createSdkSandboxAccountProvider,
} from '@moex/broker-tinvest';
import type { AppEnv } from '@moex/config';
import { resolveTinvestToken } from '@moex/config';
import {
  createAuditLogRepository,
  createAuditLogService,
  createBrokerAccountRepository,
  createMemoryAuditLogStore,
  createMemoryOutboxStore,
  createOutboxRepository,
  createPsqlDbClient,
  createSandboxOperationRepository,
  type DbClient,
} from '@moex/persistence';
import {
  createMemoryOperationJournal,
  createMemorySandboxAccountStore,
  createPostgresOperationJournal,
  createPostgresSandboxAccountStore,
  createSandboxAccountService,
} from '@moex/sandbox-management';
import type { SandboxAdminRouteDeps } from './admin/sandbox-routes.js';

export type SandboxAdminStoreMode = 'memory' | 'postgres' | 'auto';

export type ComposeSandboxAdminOptions = {
  /** Default `auto`: Postgres when reachable, otherwise memory. */
  storeMode?: SandboxAdminStoreMode;
  /** Injected DB client (tests / custom wiring). */
  db?: DbClient;
};

async function canReachPostgres(db: DbClient): Promise<boolean> {
  try {
    await db.queryJsonValue(`SELECT to_json(1)`);
    return true;
  } catch {
    return false;
  }
}

async function resolveStoreMode(
  mode: SandboxAdminStoreMode,
  db: DbClient | undefined,
): Promise<{ mode: 'memory' | 'postgres'; db: DbClient | null }> {
  if (mode === 'memory') {
    return { mode: 'memory', db: null };
  }
  const client = db ?? createPsqlDbClient();
  if (mode === 'postgres') {
    const ok = await canReachPostgres(client);
    if (!ok) {
      throw new Error('SANDBOX_ADMIN_STORE=postgres but PostgreSQL is unreachable');
    }
    return { mode: 'postgres', db: client };
  }
  const ok = await canReachPostgres(client);
  return ok ? { mode: 'postgres', db: client } : { mode: 'memory', db: null };
}

/**
 * Compose Sandbox Admin dependencies for the API process.
 * Provider: live sandbox SDK when TINVEST_SANDBOX_TOKEN is set; otherwise fixture.
 * Stores: Postgres when available (durable journal/audit/outbox); memory fallback.
 */
export async function composeSandboxAdminDeps(
  env: AppEnv,
  options: ComposeSandboxAdminOptions = {},
): Promise<Omit<SandboxAdminRouteDeps, 'env'> & { storeMode: 'memory' | 'postgres' }> {
  const sandboxToken = resolveTinvestToken(env, 'sandbox');
  const provider =
    sandboxToken === null
      ? createFixtureSandboxAccountProvider()
      : createSdkSandboxAccountProvider({
          sdk: await createSandboxSdk({ token: sandboxToken }),
        });

  const requested =
    options.storeMode ??
    (env.SANDBOX_ADMIN_STORE === 'memory' ||
    env.SANDBOX_ADMIN_STORE === 'postgres' ||
    env.SANDBOX_ADMIN_STORE === 'auto'
      ? env.SANDBOX_ADMIN_STORE
      : 'auto');

  const resolved = await resolveStoreMode(requested, options.db);

  if (resolved.mode === 'postgres' && resolved.db !== null) {
    const accounts = createPostgresSandboxAccountStore(createBrokerAccountRepository(resolved.db));
    const journal = createPostgresOperationJournal(createSandboxOperationRepository(resolved.db));
    const sandbox = createSandboxAccountService({
      provider,
      accounts,
      journal,
      allowProviderWrites: false,
    });
    return {
      sandbox,
      provider,
      audit: createAuditLogService(createAuditLogRepository(resolved.db)),
      outbox: createOutboxRepository(resolved.db),
      storeMode: 'postgres',
    };
  }

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
    storeMode: 'memory',
  };
}
