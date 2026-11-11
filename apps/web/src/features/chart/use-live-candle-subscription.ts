import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { CandleRow, ChartTimeframe } from './types.js';

export type LiveSubscriptionStatus =
  | 'INACTIVE'
  | 'PENDING'
  | 'SUBSCRIBING'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'REJECTED'
  | 'UNSUBSCRIBING';

export type LiveCandleEventType =
  | 'market.candle.updated'
  | 'market.candle.close_emitted'
  | 'market.candle.finalized'
  | 'market.candle.corrected';

export type LiveCandleEvent = {
  type: LiveCandleEventType;
  subscriptionId: string;
  instrumentId: string;
  interval: string;
  eventId: string;
  occurredAt: string;
  receivedAt: string;
  payload: {
    timeStart: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volumeLots: string;
    deliveryMode: 'LIVE_UPDATES' | 'WAITING_CLOSE';
    barState: 'UPDATING' | 'CLOSE_EMITTED' | 'FINALIZED_BY_SCHEDULE' | 'CORRECTED' | 'UNKNOWN';
  };
};

type Args = {
  instrumentUid: string | null;
  interval: ChartTimeframe;
  enabledByUser: boolean;
  wsUrl?: string;
  onCandleEvent: (event: LiveCandleEvent) => void;
};

function defaultWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws/market-data`;
}

function isLiveStatus(value: unknown): value is LiveSubscriptionStatus {
  return (
    value === 'INACTIVE' ||
    value === 'PENDING' ||
    value === 'SUBSCRIBING' ||
    value === 'ACTIVE' ||
    value === 'DEGRADED' ||
    value === 'REJECTED' ||
    value === 'UNSUBSCRIBING'
  );
}

function isLiveCandleEventType(value: unknown): value is LiveCandleEventType {
  return (
    value === 'market.candle.updated' ||
    value === 'market.candle.close_emitted' ||
    value === 'market.candle.finalized' ||
    value === 'market.candle.corrected'
  );
}

export function useLiveCandleSubscription(args: Args): {
  status: LiveSubscriptionStatus;
  lastReceivedAt: string | null;
  error: { code: string; message: string } | null;
} {
  const [status, setStatus] = useState<LiveSubscriptionStatus>('INACTIVE');
  const [lastReceivedAt, setLastReceivedAt] = useState<string | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const seenEventsRef = useRef(new Set<string>());
  const enabledRef = useRef(args.enabledByUser);
  enabledRef.current = args.enabledByUser;

  const handleMessage = useEffectEvent((raw: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) {
      return;
    }
    const type = Reflect.get(parsed, 'type');
    if (type === 'market.subscription.state') {
      const nextStatus = Reflect.get(parsed, 'status');
      const requestId = Reflect.get(parsed, 'requestId');
      const subscriptionId = Reflect.get(parsed, 'subscriptionId');
      if (typeof requestId === 'string' && requestId !== requestIdRef.current) {
        return;
      }
      if (isLiveStatus(nextStatus)) {
        setStatus(nextStatus);
      }
      if (typeof subscriptionId === 'string' && subscriptionId.length > 0) {
        subscriptionIdRef.current = subscriptionId;
      }
      if (nextStatus === 'REJECTED') {
        const reason = Reflect.get(parsed, 'reason');
        const message = Reflect.get(parsed, 'message');
        setError({
          code: typeof reason === 'string' ? reason : 'REJECTED',
          message: typeof message === 'string' ? message : 'Live subscription rejected',
        });
      } else {
        setError(null);
      }
      return;
    }

    if (!isLiveCandleEventType(type)) {
      return;
    }

    const subscriptionId = Reflect.get(parsed, 'subscriptionId');
    const eventId = Reflect.get(parsed, 'eventId');
    const instrumentId = Reflect.get(parsed, 'instrumentId');
    const interval = Reflect.get(parsed, 'interval');
    const occurredAt = Reflect.get(parsed, 'occurredAt');
    const receivedAt = Reflect.get(parsed, 'receivedAt');
    const payload = Reflect.get(parsed, 'payload');
    if (
      typeof subscriptionId !== 'string' ||
      subscriptionId !== subscriptionIdRef.current ||
      typeof eventId !== 'string' ||
      typeof instrumentId !== 'string' ||
      typeof interval !== 'string' ||
      typeof occurredAt !== 'string' ||
      typeof receivedAt !== 'string' ||
      typeof payload !== 'object' ||
      payload === null
    ) {
      return;
    }
    if (seenEventsRef.current.has(eventId)) {
      return;
    }
    const timeStart = Reflect.get(payload, 'timeStart');
    const open = Reflect.get(payload, 'open');
    const high = Reflect.get(payload, 'high');
    const low = Reflect.get(payload, 'low');
    const close = Reflect.get(payload, 'close');
    const volumeLots = Reflect.get(payload, 'volumeLots') ?? Reflect.get(payload, 'volume');
    const deliveryMode = Reflect.get(payload, 'deliveryMode');
    const barState = Reflect.get(payload, 'barState');
    if (
      typeof timeStart !== 'string' ||
      typeof open !== 'string' ||
      typeof high !== 'string' ||
      typeof low !== 'string' ||
      typeof close !== 'string' ||
      typeof volumeLots !== 'string' ||
      (deliveryMode !== 'LIVE_UPDATES' && deliveryMode !== 'WAITING_CLOSE') ||
      (barState !== 'UPDATING' &&
        barState !== 'CLOSE_EMITTED' &&
        barState !== 'FINALIZED_BY_SCHEDULE' &&
        barState !== 'CORRECTED' &&
        barState !== 'UNKNOWN')
    ) {
      return;
    }
    seenEventsRef.current.add(eventId);
    setLastReceivedAt(receivedAt);
    args.onCandleEvent({
      type,
      subscriptionId,
      instrumentId,
      interval,
      eventId,
      occurredAt,
      receivedAt,
      payload: { timeStart, open, high, low, close, volumeLots, deliveryMode, barState },
    });
  });

  useEffect(() => {
    if (!args.enabledByUser || args.instrumentUid === null) {
      const socket = socketRef.current;
      const subscriptionId = subscriptionIdRef.current;
      if (socket !== null && subscriptionId !== null && socket.readyState === WebSocket.OPEN) {
        setStatus('UNSUBSCRIBING');
        socket.send(
          JSON.stringify({
            type: 'market.unsubscribe',
            requestId: crypto.randomUUID(),
            subscriptionId,
          }),
        );
      }
      if (socket !== null) {
        socket.close();
      }
      socketRef.current = null;
      subscriptionIdRef.current = null;
      requestIdRef.current = null;
      setStatus('INACTIVE');
      return;
    }

    setStatus('PENDING');
    setError(null);
    const ws = new WebSocket(args.wsUrl ?? defaultWsUrl());
    socketRef.current = ws;
    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;

    ws.addEventListener('open', () => {
      setStatus('SUBSCRIBING');
      ws.send(
        JSON.stringify({
          type: 'market.subscribe',
          requestId,
          instrumentId: args.instrumentUid,
          interval: args.interval,
          candleSource: 'EXCHANGE',
        }),
      );
    });
    ws.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        handleMessage(event.data);
      }
    });
    ws.addEventListener('close', () => {
      if (enabledRef.current) {
        setStatus('DEGRADED');
      } else {
        setStatus('INACTIVE');
      }
    });
    ws.addEventListener('error', () => {
      setError({ code: 'SOCKET_ERROR', message: 'WebSocket error' });
      setStatus('REJECTED');
    });

    return () => {
      const subscriptionId = subscriptionIdRef.current;
      if (ws.readyState === WebSocket.OPEN && subscriptionId !== null) {
        ws.send(
          JSON.stringify({
            type: 'market.unsubscribe',
            requestId: crypto.randomUUID(),
            subscriptionId,
          }),
        );
      }
      ws.close();
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
    };
  }, [args.enabledByUser, args.instrumentUid, args.interval, args.wsUrl]);

  return { status, lastReceivedAt, error };
}

export function upsertLiveCandle(candles: CandleRow[], event: LiveCandleEvent): CandleRow[] {
  const isClosed =
    event.payload.barState === 'CLOSE_EMITTED' ||
    event.payload.barState === 'FINALIZED_BY_SCHEDULE' ||
    event.payload.barState === 'CORRECTED' ||
    event.type === 'market.candle.close_emitted' ||
    event.type === 'market.candle.finalized' ||
    event.type === 'market.candle.corrected';
  const nextRow: CandleRow = {
    Date: new Date(event.payload.timeStart),
    Open: Number(event.payload.open),
    High: Number(event.payload.high),
    Low: Number(event.payload.low),
    Close: Number(event.payload.close),
    Volume: Number(event.payload.volumeLots),
    isClosed,
  };
  const index = candles.findIndex((row) => row.Date.getTime() === nextRow.Date.getTime());
  if (index < 0) {
    return [...candles, nextRow].sort((a, b) => a.Date.getTime() - b.Date.getTime());
  }
  const copy = [...candles];
  copy[index] = nextRow;
  return copy;
}
