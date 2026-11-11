import './loading.css';

type SpinnerProps = {
  label?: string;
};

export function Spinner(props: SpinnerProps) {
  const label = props.label ?? 'Loading';
  return <span className="ui-spinner" role="status" aria-label={label} />;
}

type LoadingStateProps = {
  label?: string;
};

export function LoadingState(props: LoadingStateProps) {
  const label = props.label ?? 'Loading…';
  return (
    <div className="ui-loading" role="status" aria-live="polite">
      <Spinner label={label} />
      <span>{label}</span>
    </div>
  );
}

type LoadingSkeletonProps = {
  lines?: number;
};

export function LoadingSkeleton(props: LoadingSkeletonProps) {
  const count = props.lines !== undefined && props.lines > 0 ? props.lines : 3;
  const rows = Array.from({ length: count }, (_, index) => index);
  return (
    <div className="ui-skeleton" aria-hidden="true">
      {rows.map((index) => {
        const lineClass =
          index === 0
            ? 'ui-skeleton__line ui-skeleton__line--title'
            : index === rows.length - 1
              ? 'ui-skeleton__line ui-skeleton__line--short'
              : 'ui-skeleton__line ui-skeleton__line--body';
        return <div key={index} className={lineClass} />;
      })}
    </div>
  );
}
