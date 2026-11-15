import {
  type GetLastTradesRequest,
  type Quotation,
  TradeDirection,
  TradeSourceType,
} from '@ttech-pub/grpc-node-client';
import { BaseCommand } from '@ttech-pub/invest-sdk-node';
import type { APIService } from '@ttech-pub/invest-sdk-node/src/lib/core/shared/command.js';
import { quotationToDecimalString } from './mappers/quotation.js';
import type { TinvestTradeDirection, TinvestTradeRaw } from './raw.js';

/** T-Invest documents GetLastTrades as anonymized trades for the last hour. */
export const TINVEST_LAST_TRADES_MAX_WINDOW_MS = 60 * 60 * 1000;

type CommandInput = {
  instrumentUid: string;
  from: Date;
  to: Date;
  tradeSource?: TradeSourceType;
};

type CommandOutput = {
  trades: Array<{
    instrumentUid: string;
    direction: TradeDirection;
    price: Quotation | undefined;
    quantity: number | bigint;
    time: Date | undefined;
  }>;
};

class GetLastTradesCommand extends BaseCommand<CommandInput, Promise<CommandOutput>> {
  override call(client: APIService): Promise<CommandOutput> {
    const options = this.options;
    const request: GetLastTradesRequest = {
      instrumentId: options.instrumentUid,
      from: options.from,
      to: options.to,
      tradeSource: options.tradeSource ?? TradeSourceType.TRADE_SOURCE_EXCHANGE,
    };
    return client.marketdata.getLastTrades(request).then((response) => ({
      trades: response.trades.map((trade) => ({
        instrumentUid: trade.instrumentUid,
        direction: trade.direction,
        price: trade.price,
        quantity: trade.quantity,
        time: trade.time,
      })),
    }));
  }
}

export function buildGetLastTradesCommand(input: {
  instrumentUid: string;
  from: Date;
  to: Date;
}): GetLastTradesCommand {
  return new GetLastTradesCommand({
    instrumentUid: input.instrumentUid,
    from: input.from,
    to: input.to,
    tradeSource: TradeSourceType.TRADE_SOURCE_EXCHANGE,
  });
}

function mapDirection(value: TradeDirection): TinvestTradeDirection {
  if (value === TradeDirection.TRADE_DIRECTION_BUY) {
    return 'buy';
  }
  if (value === TradeDirection.TRADE_DIRECTION_SELL) {
    return 'sell';
  }
  return 'unspecified';
}

function quantityToString(value: number | bigint): string {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (!Number.isFinite(value)) {
    throw new Error('Invalid trade quantity');
  }
  return String(Math.trunc(value));
}

export function mapLastTradesResponse(trades: CommandOutput['trades']): TinvestTradeRaw[] {
  const mapped: TinvestTradeRaw[] = [];
  for (const trade of trades) {
    if (trade.price === undefined || trade.time === undefined) {
      continue;
    }
    const instrumentUid =
      typeof trade.instrumentUid === 'string' && trade.instrumentUid.length > 0
        ? trade.instrumentUid
        : null;
    if (instrumentUid === null) {
      continue;
    }
    mapped.push({
      instrumentUid,
      price: quotationToDecimalString(trade.price, 'price'),
      quantity: quantityToString(trade.quantity),
      direction: mapDirection(trade.direction),
      time: trade.time.toISOString(),
    });
  }
  return mapped;
}

/**
 * Clamp [from, to] into the provider's last-hour window ending at `to`
 * (or `now` when `to` is in the future).
 */
export function clampLastTradesWindow(input: { from: Date; to: Date; now?: Date }): {
  from: Date;
  to: Date;
  windowClamped: boolean;
  maxWindowMs: typeof TINVEST_LAST_TRADES_MAX_WINDOW_MS;
} {
  const now = input.now ?? new Date();
  const to = input.to.getTime() > now.getTime() ? now : input.to;
  const earliest = new Date(to.getTime() - TINVEST_LAST_TRADES_MAX_WINDOW_MS);
  const from = input.from.getTime() < earliest.getTime() ? earliest : input.from;
  const windowClamped =
    from.getTime() !== input.from.getTime() || to.getTime() !== input.to.getTime();
  if (!(from < to)) {
    throw new Error('GetLastTrades window is empty after clamping to the last hour');
  }
  return {
    from,
    to,
    windowClamped,
    maxWindowMs: TINVEST_LAST_TRADES_MAX_WINDOW_MS,
  };
}
