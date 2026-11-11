import type { ReactNode } from 'react';
import './card.css';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card(props: CardProps) {
  const className =
    props.className === undefined || props.className.length === 0
      ? 'ui-card'
      : `ui-card ${props.className}`;
  return <article className={className}>{props.children}</article>;
}

type CardHeaderProps = {
  title: string;
  action?: ReactNode;
  titleId?: string;
};

export function CardHeader(props: CardHeaderProps) {
  return (
    <div className="ui-card__header">
      <h3 className="ui-card__title" id={props.titleId}>
        {props.title}
      </h3>
      {props.action}
    </div>
  );
}

type CardBodyProps = {
  children: ReactNode;
  className?: string;
};

export function CardBody(props: CardBodyProps) {
  const className =
    props.className === undefined || props.className.length === 0
      ? 'ui-card__body'
      : `ui-card__body ${props.className}`;
  return <div className={className}>{props.children}</div>;
}
