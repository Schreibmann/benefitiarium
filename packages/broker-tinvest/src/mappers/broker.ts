import type { BrokerAccount, BrokerOrder, BrokerPosition } from '@moex/contracts';
import {
  type OrderSide,
  type OrderStatus,
  type OrderType,
  parseDecimalString,
  parseInstrumentId,
  parseIsoDateTime,
  tryParseUuid,
} from '@moex/domain';
import type { TinvestAccountRaw, TinvestOrderRaw, TinvestPositionRaw } from '../raw.js';

export function mapTinvestAccount(raw: TinvestAccountRaw, isSandbox: boolean): BrokerAccount {
  return {
    providerAccountId: raw.id,
    accountType: raw.type,
    currency: null,
    isSandbox,
    name: raw.name,
  };
}

export function mapTinvestPosition(
  raw: TinvestPositionRaw,
  accountId: string,
  instrumentIdByUid: ReadonlyMap<string, string>,
): BrokerPosition {
  const mappedId = instrumentIdByUid.get(raw.instrumentUid);
  return {
    providerAccountId: accountId,
    providerInstrumentId: raw.instrumentUid,
    instrumentId: mappedId ? parseInstrumentId(mappedId) : null,
    quantity: parseDecimalString(raw.quantity),
    averagePrice: raw.averagePositionPrice ? parseDecimalString(raw.averagePositionPrice) : null,
    currentPrice: raw.currentPrice ? parseDecimalString(raw.currentPrice) : null,
    currency: raw.currency,
  };
}

function mapSide(direction: string): OrderSide {
  if (direction.includes('SELL')) {
    return 'sell';
  }
  return 'buy';
}

function mapOrderType(orderType: string): OrderType {
  if (orderType.includes('MARKET')) {
    return 'market';
  }
  if (orderType.includes('BESTPRICE') || orderType.includes('BEST_PRICE')) {
    return 'best_price';
  }
  return 'limit';
}

function mapOrderStatus(status: string): OrderStatus {
  const normalized = status.toUpperCase();
  if (normalized.includes('FILL') && normalized.includes('PARTIAL')) {
    return 'partially_filled';
  }
  if (normalized.includes('FILL')) {
    return 'filled';
  }
  if (normalized.includes('CANCEL')) {
    return 'cancelled';
  }
  if (normalized.includes('REJECT')) {
    return 'rejected';
  }
  if (normalized.includes('NEW') || normalized.includes('ACTIVE')) {
    return 'active';
  }
  if (normalized.includes('EXPIRED')) {
    return 'expired';
  }
  return 'unknown';
}

export function mapTinvestOrder(
  raw: TinvestOrderRaw,
  accountId: string,
  instrumentIdByUid: ReadonlyMap<string, string>,
  updatedAtFallbackIso: string,
): BrokerOrder {
  const mappedId = instrumentIdByUid.get(raw.instrumentUid);
  return {
    providerAccountId: accountId,
    brokerOrderId: raw.orderId,
    clientOrderId: raw.orderRequestId ? tryParseUuid(raw.orderRequestId) : null,
    providerInstrumentId: raw.instrumentUid,
    instrumentId: mappedId ? parseInstrumentId(mappedId) : null,
    side: mapSide(raw.direction),
    orderType: mapOrderType(raw.orderType),
    quantityLots: raw.lotsRequested,
    filledLots: raw.lotsExecuted,
    limitPrice: raw.initialSecurityPrice ? parseDecimalString(raw.initialSecurityPrice) : null,
    status: mapOrderStatus(raw.executionReportStatus),
    submittedAt: raw.orderDate ? parseIsoDateTime(raw.orderDate) : null,
    updatedAt: parseIsoDateTime(raw.orderDate ?? updatedAtFallbackIso),
  };
}
