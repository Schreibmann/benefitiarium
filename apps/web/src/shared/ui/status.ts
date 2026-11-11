export type MarketDataStatus = 'realtime' | 'delayed' | 'stale' | 'offline' | 'connecting';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export function marketStatusLabel(status: MarketDataStatus): string {
  switch (status) {
    case 'realtime':
      return 'REALTIME';
    case 'delayed':
      return 'DELAYED';
    case 'stale':
      return 'STALE';
    case 'offline':
      return 'OFFLINE';
    case 'connecting':
      return 'CONNECTING';
  }
}

export function marketStatusTone(
  status: MarketDataStatus,
): 'positive' | 'warning' | 'negative' | 'info' | 'neutral' {
  switch (status) {
    case 'realtime':
      return 'positive';
    case 'delayed':
      return 'warning';
    case 'stale':
      return 'warning';
    case 'offline':
      return 'negative';
    case 'connecting':
      return 'info';
  }
}
