import './skip-link.css';

type Props = {
  targetId: string;
  label?: string;
};

export function SkipLink(props: Props) {
  const label = props.label ?? 'Перейти к содержимому';
  return (
    <a className="skip-link" href={`#${props.targetId}`}>
      {label}
    </a>
  );
}
