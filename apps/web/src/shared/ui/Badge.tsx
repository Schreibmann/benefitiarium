import type { ReactNode } from 'react';
import './badge.css';

export type BadgeTone = 'neutral' | 'brand' | 'positive' | 'negative' | 'warning' | 'info' | 'demo';

type Props = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

export function Badge(props: Props) {
  const tone = props.tone ?? 'neutral';
  const parts = ['ui-badge', `ui-badge--${tone}`];
  if (props.className !== undefined && props.className.length > 0) {
    parts.push(props.className);
  }
  return <span className={parts.join(' ')}>{props.children}</span>;
}

export function DemoDataBadge() {
  return <Badge tone="demo">DEMO DATA</Badge>;
}
