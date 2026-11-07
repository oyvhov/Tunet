import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import AccessibleModalShell from './AccessibleModalShell';
import Button from './Button';
import { ModalBody, ModalFooter, ModalHeader } from './ModalParts';

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  message?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A small Tunet-styled replacement for window.confirm(). */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  closeLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const messageId = 'confirm-dialog-message';
  return (
    <AccessibleModalShell
      open={open}
      onClose={onCancel}
      size="s"
      nested
      describedBy={message ? messageId : undefined}
    >
      {() => (
        <>
          <ModalHeader title={title} closeLabel={closeLabel} onClose={onCancel} />
          {message && (
            <ModalBody>
              <p id={messageId} className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {message}
              </p>
            </ModalBody>
          )}
          <ModalFooter>
            <Button variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'primary'}
              onClick={onConfirm}
              data-autofocus
            >
              {confirmLabel}
            </Button>
          </ModalFooter>
        </>
      )}
    </AccessibleModalShell>
  );
}

interface ConfirmRequest {
  title: ReactNode;
  message?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
}

/**
 * Promise-based confirm: `const ok = await confirm({...})`. Render `dialog`
 * somewhere in the component that calls it.
 */
export function useConfirmDialog(labels: { cancel: string; close: string }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmRequest) => {
    resolverRef.current?.(false);
    setRequest(next);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setRequest(null);
  };

  const dialog = (
    <ConfirmDialog
      open={!!request}
      title={request?.title ?? ''}
      message={request?.message}
      confirmLabel={request?.confirmLabel ?? ''}
      destructive={request?.destructive}
      cancelLabel={labels.cancel}
      closeLabel={labels.close}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, dialog };
}
