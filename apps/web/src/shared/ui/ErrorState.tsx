import type { ReactNode } from 'react';
import './error-state.css';

type Props = {
  title?: string;
  description: string;
  action?: ReactNode;
};

export function ErrorState(props: Props) {
  return (
    <div className="ui-error" role="alert">
      <p className="ui-error__title">{props.title ?? 'Something went wrong'}</p>
      <p className="ui-error__description">{props.description}</p>
      {props.action !== undefined ? <div className="ui-error__actions">{props.action}</div> : null}
    </div>
  );
}
