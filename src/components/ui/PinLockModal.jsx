import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from '../../icons';

export default function PinLockModal({ open, onClose, onSubmit, t, error }) {
  const [pin, setPin] = useState('');
  const inputRef = useRef(null);

  const digits = useMemo(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'], []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const addDigit = (digit) => {
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

  return (
    <div className="popup-anim fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-[360px] rounded-2xl border p-4"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--glass-border)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('settings.lock.pinPrompt')}
          </h3>
          <button
            type="button"
            onClick={() => {
              setPin('');
              onClose();
            }}
            className="rounded-lg border p-2"
            style={{
              backgroundColor: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
              color: 'var(--text-secondary)',
            }}
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="popup-surface mb-3 rounded-xl p-3">
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
            className="w-full rounded-lg border px-3 py-2 text-center text-sm tracking-[0.35em] outline-none"
            style={{
              backgroundColor: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
              color: 'var(--text-primary)',
            }}
            placeholder={t('settings.lock.pin')}
            aria-label={t('settings.lock.pin')}
          />
          {error && (
            <p className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
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
                  className="flex h-12 items-center justify-center rounded-xl border"
                  style={{
                    backgroundColor: 'var(--glass-bg)',
                    borderColor: 'var(--glass-border)',
                    color: 'var(--text-primary)',
                  }}
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
                className="h-12 rounded-xl border text-base font-semibold"
                style={{
                  backgroundColor: 'var(--glass-bg)',
                  borderColor: 'var(--glass-border)',
                  color: 'var(--text-primary)',
                }}
              >
                {value}
              </button>
            );
          })}
        </div>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={submit}
            disabled={pin.length !== 4}
            className="h-11 w-full rounded-xl border text-sm font-semibold disabled:opacity-50"
            style={{
              backgroundColor: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
              color: 'var(--text-primary)',
            }}
          >
            {t('settings.lock.unlock')}
          </button>
        </div>
      </div>
    </div>
  );
}
