import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import './button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  disabled?: boolean;
  title?: string;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

function buildClassName(props: CommonProps): string {
  const variant = props.variant ?? 'primary';
  const size = props.size ?? 'md';
  const parts = ['ui-btn', `ui-btn--${variant}`];
  if (size === 'sm') {
    parts.push('ui-btn--sm');
  }
  if (props.block === true) {
    parts.push('ui-btn--block');
  }
  if (props.className !== undefined && props.className.length > 0) {
    parts.push(props.className);
  }
  return parts.join(' ');
}

function isLinkProps(props: ButtonProps): props is ButtonAsLink {
  return typeof props.href === 'string';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const className = buildClassName(props);

  if (isLinkProps(props)) {
    if (props.disabled === true) {
      return (
        <a
          className={className}
          href={props.href}
          aria-disabled="true"
          title={props.title}
          onClick={(event) => {
            event.preventDefault();
          }}
        >
          {props.children}
        </a>
      );
    }
    return (
      <a className={className} href={props.href} title={props.title}>
        {props.children}
      </a>
    );
  }

  const { variant: _v, size: _s, block: _b, className: _c, type, children, ...rest } = props;

  return (
    <button className={className} type={type ?? 'button'} ref={ref} {...rest}>
      {children}
    </button>
  );
});
