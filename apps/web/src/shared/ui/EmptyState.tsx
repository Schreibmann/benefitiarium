import type { ReactNode } from 'react';
import './empty-state.css';

type Props = {
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  icon?: ReactNode;
};

function DefaultIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h16v2H4v-2z" />
    </svg>
  );
}

export function EmptyState(props: Props) {
  return (
    <div className="ui-empty" role="status">
      <div className="ui-empty__icon">{props.icon ?? <DefaultIcon />}</div>
      <p className="ui-empty__title">{props.title}</p>
      <p className="ui-empty__description">{props.description}</p>
      {props.action !== undefined || props.secondaryAction !== undefined ? (
        <div className="ui-empty__actions">
          {props.action}
          {props.secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
