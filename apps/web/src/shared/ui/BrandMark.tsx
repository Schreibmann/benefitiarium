import './brand-mark.css';

type Props = {
  compact?: boolean;
};

export function BrandMark(props: Props) {
  const className = props.compact === true ? 'brand-mark brand-mark--compact' : 'brand-mark';
  return (
    <a className={className} href="/" aria-label="BENEFITIARIUM home">
      <span className="brand-mark__glyph" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {props.compact === true ? null : <span className="brand-mark__name">BENEFITIARIUM</span>}
    </a>
  );
}
