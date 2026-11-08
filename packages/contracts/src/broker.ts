import type {
  DecimalString,
  InstrumentId,
  IsoDateTime,
  OrderSide,
  OrderStatus,
  OrderType,
  UUID,
} from '@moex/domain';

export type BrokerAccount = {
  providerAccountId: string;
  accountType: string | null;
  currency: string | null;
  isSandbox: boolean;
  name: string | null;
};

export type BrokerPosition = {
  providerAccountId: string;
  providerInstrumentId: string;
  instrumentId: InstrumentId | null;
  quantity: DecimalString;
  averagePrice: DecimalString | null;
  currentPrice: DecimalString | null;
  currency: string | null;
};

export type BrokerOrder = {
  providerAccountId: string;
  brokerOrderId: string;
  clientOrderId: UUID | null;
  providerInstrumentId: string;
  instrumentId: InstrumentId | null;
  side: OrderSide;
  orderType: OrderType;
  quantityLots: number;
  filledLots: number;
  limitPrice: DecimalString | null;
  status: OrderStatus;
  submittedAt: IsoDateTime | null;
  updatedAt: IsoDateTime;
};

export type PlaceOrderCommand = {
  accountId: string;
  instrumentId: InstrumentId;
  providerInstrumentId: string;
  clientOrderId: UUID;
  side: OrderSide;
  orderType: OrderType;
  quantityLots: number;
  limitPrice: DecimalString | null;
};

export type PlaceOrderResult = {
  brokerOrderId: string;
  clientOrderId: UUID;
  status: OrderStatus;
};

export type CancelOrderCommand = {
  accountId: string;
  brokerOrderId: string;
  clientOrderId: UUID | null;
};

export type CancelOrderResult = {
  brokerOrderId: string;
  status: OrderStatus;
};

export type ReplaceOrderCommand = {
  accountId: string;
  brokerOrderId: string;
  clientOrderId: UUID;
  quantityLots: number;
  limitPrice: DecimalString | null;
};

export type ReplaceOrderResult = {
  brokerOrderId: string;
  clientOrderId: UUID;
  status: OrderStatus;
};

/**
 * Broker execution/read port. Strategy code must not depend on a concrete SDK.
 * Write methods are intended for worker-execution only.
 */
export type BrokerGateway = {
  listAccounts: () => Promise<BrokerAccount[]>;
  getPositions: (accountId: string) => Promise<BrokerPosition[]>;
  getOrders: (accountId: string) => Promise<BrokerOrder[]>;
  getOrderState: (accountId: string, brokerOrderId: string) => Promise<BrokerOrder>;
  placeOrder: (command: PlaceOrderCommand) => Promise<PlaceOrderResult>;
  cancelOrder: (command: CancelOrderCommand) => Promise<CancelOrderResult>;
  replaceOrder: (command: ReplaceOrderCommand) => Promise<ReplaceOrderResult>;
};
