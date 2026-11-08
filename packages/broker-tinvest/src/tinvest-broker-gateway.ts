import type {
  BrokerGateway,
  BrokerOrder,
  BrokerPosition,
  CancelOrderCommand,
  PlaceOrderCommand,
  ReplaceOrderCommand,
} from '@moex/contracts';
import { mapTinvestAccount, mapTinvestOrder, mapTinvestPosition } from './mappers/broker.js';
import type { InstrumentUidResolver, TinvestReadApi } from './read-api.js';

export type TinvestBrokerGatewayOptions = {
  api: TinvestReadApi;
  resolver: InstrumentUidResolver;
  isSandbox: boolean;
  now?: () => Date;
};

/**
 * Read-focused BrokerGateway. Write methods fail closed until live execution path is enabled.
 */
export function createTinvestBrokerGateway(options: TinvestBrokerGatewayOptions): BrokerGateway {
  const now = options.now ?? (() => new Date());

  return {
    listAccounts: async () => {
      const accounts = await options.api.listAccounts();
      return accounts.map((account) => mapTinvestAccount(account, options.isSandbox));
    },

    getPositions: async (accountId: string): Promise<BrokerPosition[]> => {
      const positions = await options.api.getPositions(accountId);
      const instrumentIdByUid = new Map<string, string>();
      for (const position of positions) {
        const instrumentId = options.resolver.toInstrumentId(position.instrumentUid);
        if (instrumentId !== null) {
          instrumentIdByUid.set(position.instrumentUid, instrumentId);
        }
      }
      return positions.map((position) =>
        mapTinvestPosition(position, accountId, instrumentIdByUid),
      );
    },

    getOrders: async (accountId: string): Promise<BrokerOrder[]> => {
      const orders = await options.api.getOrders(accountId);
      const instrumentIdByUid = new Map<string, string>();
      for (const order of orders) {
        const instrumentId = options.resolver.toInstrumentId(order.instrumentUid);
        if (instrumentId !== null) {
          instrumentIdByUid.set(order.instrumentUid, instrumentId);
        }
      }
      const updatedAt = now().toISOString();
      return orders.map((order) => mapTinvestOrder(order, accountId, instrumentIdByUid, updatedAt));
    },

    getOrderState: async (accountId: string, brokerOrderId: string): Promise<BrokerOrder> => {
      const order = await options.api.getOrderById(accountId, brokerOrderId);
      if (!order) {
        throw new Error(`Order not found: ${brokerOrderId}`);
      }
      const instrumentIdByUid = new Map<string, string>();
      const instrumentId = options.resolver.toInstrumentId(order.instrumentUid);
      if (instrumentId !== null) {
        instrumentIdByUid.set(order.instrumentUid, instrumentId);
      }
      return mapTinvestOrder(order, accountId, instrumentIdByUid, now().toISOString());
    },

    placeOrder: async (_command: PlaceOrderCommand) => {
      throw new Error('placeOrder is disabled until live/sandbox write path is explicitly enabled');
    },

    cancelOrder: async (_command: CancelOrderCommand) => {
      throw new Error(
        'cancelOrder is disabled until live/sandbox write path is explicitly enabled',
      );
    },

    replaceOrder: async (_command: ReplaceOrderCommand) => {
      throw new Error(
        'replaceOrder is disabled until live/sandbox write path is explicitly enabled',
      );
    },
  };
}
