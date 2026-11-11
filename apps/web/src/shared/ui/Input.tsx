import type { InputHTMLAttributes, ReactNode } from 'react';
import './input.css';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  className?: string;
  invalid?: boolean;
};

export function Input(props: InputProps) {
  const { invalid, className, ...rest } = props;
  const parts = ['ui-input'];
  if (invalid === true) {
    parts.push('ui-input--invalid');
  }
  if (className !== undefined && className.length > 0) {
    parts.push(className);
  }
  return <input className={parts.join(' ')} aria-invalid={invalid === true} {...rest} />;
}

type FormFieldProps = {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
  error?: string;
};

export function FormField(props: FormFieldProps) {
  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={props.htmlFor}>
        {props.label}
      </label>
      {props.children}
      {props.error !== undefined ? <p className="ui-field__error">{props.error}</p> : null}
      {props.error === undefined && props.hint !== undefined ? (
        <p className="ui-field__hint">{props.hint}</p>
      ) : null}
    </div>
  );
}
