import type {
  DecimalString,
  IsoDateTime,
  SandboxAccountOperation,
  SandboxPortfolio,
  SandboxPosition,
  SandboxProviderAccountStatus,
  UUID,
} from '@moex/domain';

/**
 * Provider-side sandbox account row before local UUID / localStatus assignment.
 * SandboxAccountService owns internal id and local diagnostic status (`missing`/`unknown`).
 */
export type SandboxProviderAccountRow = {
  providerAccountId: string;
  displayName: string | null;
  providerStatus: SandboxProviderAccountStatus;
  openedAt: IsoDateTime | null;
  closedAt: IsoDateTime | null;
};

/**
 * Low-level Sandbox broker port. Implementations live in broker-tinvest only.
 * Must be constructed with sandbox endpoint + sandbox credential — never production.
 */
export type SandboxAccountProvider = {
  readonly environment: 'sandbox';
  /** Must be the allowlisted sandbox host; service rejects anything else. */
  readonly endpointHost: string;
  listAccounts: () => Promise<SandboxProviderAccountRow[]>;
  openAccount: (input: { name: string }) => Promise<{ providerAccountId: string }>;
  closeAccount: (input: { providerAccountId: string }) => Promise<void>;
  payIn: (input: {
    providerAccountId: string;
    amount: DecimalString;
    currency: 'RUB';
  }) => Promise<void>;
  getPortfolio: (providerAccountId: string) => Promise<SandboxPortfolio>;
  getPositions: (providerAccountId: string) => Promise<SandboxPosition[]>;
  getOrders: (providerAccountId: string) => Promise<SandboxOrderView[]>;
  getOperations: (providerAccountId: string) => Promise<SandboxBrokerOperationView[]>;
};

/** Broker order snapshot for Admin UI / sync (sandbox account scoped). */
export type SandboxOrderView = {
  providerAccountId: string;
  brokerOrderId: string;
  providerInstrumentId: string;
  direction: string;
  orderType: string;
  lotsRequested: number;
  lotsExecuted: number;
  status: string;
  orderDate: IsoDateTime | null;
};

/**
 * Broker operation history row. SDK 1.61.0 has no dedicated GetSandboxOperations command;
 * adapters may return an empty list until a supported read path is confirmed.
 */
export type SandboxBrokerOperationView = {
  providerAccountId: string;
  operationId: string;
  type: string;
  payment: DecimalString | null;
  currency: string | null;
  date: IsoDateTime | null;
};

export type EnqueueSandboxCommandInput =
  | {
      type: 'create';
      name: string;
      idempotencyKey: string;
      correlationId: string;
    }
  | {
      type: 'sync';
      /** Null = full discovery sync of all sandbox accounts (BL-079). */
      accountId: UUID | null;
      idempotencyKey: string;
      correlationId: string;
    }
  | {
      type: 'fund';
      accountId: UUID;
      amount: DecimalString;
      currency: 'RUB';
      idempotencyKey: string;
      correlationId: string;
    }
  | {
      type: 'close';
      accountId: UUID;
      confirmation: string;
      idempotencyKey: string;
      correlationId: string;
    };

export type EnqueueSandboxCommandResult = {
  operation: SandboxAccountOperation;
  accepted: true;
};
