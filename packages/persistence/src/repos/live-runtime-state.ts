import type { DbExecutor } from '../db/client.js';

export type LiveDesiredStatus = 'STOPPED' | 'RUNNING';

export type LiveRuntimeStateRow = {
  id: string;
  desiredStatus: LiveDesiredStatus;
  updatedAt: string;
};

export type LiveRuntimeStateRepository = {
  get: () => Promise<LiveRuntimeStateRow>;
  setDesiredStatus: (status: LiveDesiredStatus) => Promise<LiveRuntimeStateRow>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mapRow(value: unknown): LiveRuntimeStateRow {
  if (!isRecord(value)) {
    throw new Error('Invalid live_runtime_state row');
  }
  const id = value.id;
  const desiredStatus = value.desiredStatus;
  const updatedAt = value.updatedAt;
  if (typeof id !== 'string' || typeof updatedAt !== 'string') {
    throw new Error('Invalid live_runtime_state fields');
  }
  if (desiredStatus !== 'STOPPED' && desiredStatus !== 'RUNNING') {
    throw new Error('Invalid live_runtime_state desiredStatus');
  }
  return { id, desiredStatus, updatedAt };
}

const STATE_COLS = `
  id,
  desired_status AS "desiredStatus",
  updated_at AS "updatedAt"
`;

export function createLiveRuntimeStateRepository(db: DbExecutor): LiveRuntimeStateRepository {
  return {
    async get() {
      const row = await db.queryJsonValue(
        `SELECT row_to_json(q) FROM (SELECT ${STATE_COLS} FROM live_runtime_state WHERE id = 'default') AS q`,
      );
      if (row === null || row === undefined) {
        return {
          id: 'default',
          desiredStatus: 'STOPPED',
          updatedAt: new Date().toISOString(),
        };
      }
      return mapRow(row);
    },

    async setDesiredStatus(status) {
      const row = await db.queryJsonValue(
        `
        WITH upserted AS (
          INSERT INTO live_runtime_state (id, desired_status, updated_at)
          VALUES ('default', $1, now())
          ON CONFLICT (id) DO UPDATE SET
            desired_status = EXCLUDED.desired_status,
            updated_at = now()
          RETURNING ${STATE_COLS}
        )
        SELECT row_to_json(upserted) FROM upserted
        `.trim(),
        [status],
      );
      return mapRow(row);
    },
  };
}

export function createMemoryLiveRuntimeStateRepository(): LiveRuntimeStateRepository {
  let state: LiveRuntimeStateRow = {
    id: 'default',
    desiredStatus: 'STOPPED',
    updatedAt: new Date().toISOString(),
  };

  return {
    async get() {
      return state;
    },
    async setDesiredStatus(status) {
      state = {
        id: 'default',
        desiredStatus: status,
        updatedAt: new Date().toISOString(),
      };
      return state;
    },
  };
}
