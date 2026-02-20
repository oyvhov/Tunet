import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from '../../icons';

export default function PinLockModal({
  open,
  onClose,
  onSubmit,
  t,
  error,
}) {
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm popup-anim">
      <div className="w-full max-w-[360px] rounded-2xl border p-4" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--glass-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('settings.lock.pinPrompt')}</h3>
          <button
            type="button"
            onClick={() => {
              setPin('');
              onClose();
            }}
            className="p-2 rounded-lg border"
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="popup-surface rounded-xl p-3 mb-3">
          <div className="flex justify-center gap-2 mb-2">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: pin[index] ? 'var(--text-primary)' : 'var(--glass-border)' }}
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
            className="w-full px-3 py-2 rounded-lg border text-sm text-center tracking-[0.35em] outline-none"
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
            placeholder={t('settings.lock.pin')}
            aria-label={t('settings.lock.pin')}
          />
          {error && <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{error}</p>}
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
                  className="h-12 rounded-xl border flex items-center justify-center"
                  style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
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
                style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
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
            className="w-full h-11 rounded-xl border text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
          >
            {t('settings.lock.unlock')}
          </button>
        </div>
      </div>
    </div>
  );
}