import type { ReactNode, TableHTMLAttributes } from 'react';
import './table.css';

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  caption: string;
  children: ReactNode;
  className?: string;
};

export function Table(props: TableProps) {
  const { caption, children, className, ...rest } = props;
  const tableClass =
    className === undefined || className.length === 0 ? 'ui-table' : `ui-table ${className}`;
  return (
    <div className="ui-table-wrap">
      <table className={tableClass} {...rest}>
        <caption className="visually-hidden">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

type NumericCellProps = {
  children: ReactNode;
};

export function NumericCell(props: NumericCellProps) {
  return <td className="ui-table__numeric">{props.children}</td>;
}
