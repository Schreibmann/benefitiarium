import type { IsoDateTime, UUID } from '@moex/domain';

export type MarketSignalKind = 'approach' | 'cross';
export type MarketSignalSide = 'above' | 'below' | 'up' | 'down';
export type MarketSignalEvalMode = 'close' | 'intrabar';
export type NotificationChannel = 'telegram';
export type NotificationStatus = 'pending' | 'sending' | 'sent' | 'dead';

export type MarketSignal = {
  id: UUID;
  triggerId: string;
  triggerVersion: string;
  instrumentUid: string;
  ticker: string | null;
  timeframe: string;
  kind: MarketSignalKind;
  levelName: string;
  levelValue: string;
  side: MarketSignalSide;
  price: string;
  previousPrice: string | null;
  evalMode: MarketSignalEvalMode;
  periodId: string;
  candleTime: IsoDateTime;
  payload: Record<string, unknown>;
  dedupeKey: string;
  createdAt: IsoDateTime;
};

export type NewMarketSignal = {
  id: UUID;
  triggerId: string;
  triggerVersion: string;
  instrumentUid: string;
  ticker: string | null;
  timeframe: string;
  kind: MarketSignalKind;
  levelName: string;
  levelValue: string;
  side: MarketSignalSide;
  price: string;
  previousPrice: string | null;
  evalMode: MarketSignalEvalMode;
  periodId: string;
  candleTime: string;
  payload: Record<string, unknown>;
  dedupeKey: string;
  createdAt?: IsoDateTime;
};

export type Notification = {
  id: UUID;
  channel: NotificationChannel;
  target: string;
  signalId: UUID;
  status: NotificationStatus;
  attempts: number;
  nextAttemptAt: IsoDateTime;
  lastError: string | null;
  text: string;
  providerMessageId: string | null;
  createdAt: IsoDateTime;
  sentAt: IsoDateTime | null;
};

export type NewNotificationForSignal = {
  id: UUID;
  channel: NotificationChannel;
  target: string;
  text: string;
};

export type InsertSignalWithNotificationResult = {
  inserted: boolean;
  signal: MarketSignal | null;
  notification: Notification | null;
};

export type ApproachStateRow = {
  instrumentUid: string;
  timeframe: string;
  periodId: string;
  levelName: string;
  side: 'above' | 'below';
};
