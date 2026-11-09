import { useEffect, useMemo, useRef, useState } from 'react';
import AccessibleModalShell from './AccessibleModalShell';
import Button from './Button';
import { ModalBody, ModalHeader } from './ModalParts';
import { hasTouchScreen } from '../../utils/touchScreen';
import type { Translate } from '../../types/ha';

interface PinLockModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  t: Translate;
  error?: string | null;
  title?: string;
}

export default function PinLockModal({
  open,
  onClose,
  onSubmit,
  t,
  error,
  title,
}: PinLockModalProps) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const digits = useMemo(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'], []);

  useEffect(() => {
    // Touch devices use the on-screen keypad, so skip the system keyboard.
    if (!open || hasTouchScreen()) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const addDigit = (digit: string) => {
    if (!digit || pin.length >= 4) return;
    setPin((prev) => `${prev}${digit}`);
  };

  const backspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const submit = () => {
    if (pin.length !== 4) return;
    onSubmit(pin);
    setPin('');
  };

  const handleClose = () => {
    setPin('');
    onClose();
  };

  const keyClassName =
    'flex h-12 items-center justify-center rounded-[var(--modal-control-radius)] border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)] active:scale-95';

  return (
    <AccessibleModalShell open={open} onClose={handleClose} size="s" nested>
      {() => (
        <>
          <ModalHeader
            title={title || t('settings.lock.pinPrompt')}
            closeLabel={t('common.close')}
            onClose={handleClose}
            className="[&_.modal-title]:whitespace-normal"
          />

          <ModalBody className="space-y-3">
            <div className="popup-surface rounded-[var(--modal-surface-radius)] p-3">
              <div className="mb-2 flex justify-center gap-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: pin[index] ? 'var(--text-primary)' : 'var(--glass-border)',
                    }}
                  />
                ))}
              </div>
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="w-full rounded-[var(--modal-control-radius)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-center text-sm tracking-[0.35em] text-[var(--text-primary)] outline-none"
                placeholder={t('settings.lock.pin')}
                aria-label={t('settings.lock.pin')}
              />
              {error && (
                <p role="alert" className="mt-2 text-center text-xs text-[var(--status-error-fg)]">
                  {error}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {digits.map((value, index) => {
                if (value === '') {
                  return <div key={`empty-${index}`} />;
                }

                if (value === '⌫') {
                  return (
                    <button
                      key="backspace"
                      type="button"
                      onClick={backspace}
                      className={keyClassName}
                      aria-label={t('settings.lock.backspace')}
                    >
                      <span className="text-sm font-semibold">⌫</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => addDigit(value)}
                    className={`${keyClassName} text-base font-semibold`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>

            <Button variant="primary" block onClick={submit} disabled={pin.length !== 4}>
              {t('settings.lock.unlock')}
            </Button>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
