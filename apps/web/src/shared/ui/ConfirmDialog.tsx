import { useEffect, useId, useRef } from 'react';
import { Button } from './Button.js';
import './dialog.css';

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog(props: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!props.open) {
      return;
    }
    cancelRef.current?.focus();
  }, [props.open]);

  useEffect(() => {
    if (!props.open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && props.busy !== true) {
        props.onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [props.open, props.busy, props.onCancel]);

  if (!props.open) {
    return null;
  }

  return (
    <div className="ui-dialog-backdrop" role="presentation">
      <div
        className="ui-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 className="ui-dialog__title" id={titleId}>
          {props.title}
        </h2>
        <p className="ui-dialog__body" id={descriptionId}>
          {props.description}
        </p>
        <div className="ui-dialog__actions">
          <Button
            ref={cancelRef}
            variant="ghost"
            onClick={props.onCancel}
            disabled={props.busy === true}
          >
            {props.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant={props.danger === true ? 'danger' : 'primary'}
            onClick={props.onConfirm}
            disabled={props.busy === true}
          >
            {props.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}
