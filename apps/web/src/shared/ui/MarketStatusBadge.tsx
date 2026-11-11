import { Badge } from './Badge.js';
import { type MarketDataStatus, marketStatusLabel, marketStatusTone } from './status.js';

type Props = {
  status: MarketDataStatus;
};

export function MarketStatusBadge(props: Props) {
  return <Badge tone={marketStatusTone(props.status)}>{marketStatusLabel(props.status)}</Badge>;
}
