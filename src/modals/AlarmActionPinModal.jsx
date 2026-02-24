import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Home, LogOut, Moon, Shield, Sun, Unlock, X } from '../icons';

const ACTION_META = {
  arm_home: { labelKey: 'alarm.action.armHome', icon: Home, service: 'alarm_arm_home' },
  arm_away: { labelKey: 'alarm.action.armAway', icon: LogOut, service: 'alarm_arm_away' },
  arm_night: { labelKey: 'alarm.action.armNight', icon: Moon, service: 'alarm_arm_night' },
  arm_vacation: { labelKey: 'alarm.action.armVacation', icon: Sun, service: 'alarm_arm_vacation' },
  arm_custom_bypass: { labelKey: 'alarm.action.armCustomBypass', icon: Shield, service: 'alarm_arm_custom_bypass' },
  disarm: { labelKey: 'alarm.action.disarm', icon: Unlock, service: 'alarm_disarm' },
};

function requiresCode(actionKey, entity) {
  const codeFormat = entity?.attributes?.code_format || 'none';
  const hasCode = codeFormat !== 'none';
  if (!hasCode) return false;

  const parseBooleanLike = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
      if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
    }
    return undefined;
  };

  const codeArmRequired = parseBooleanLike(entity?.attributes?.code_arm_required);
  const codeDisarmRequired = parseBooleanLike(entity?.attributes?.code_disarm_required);

  if (actionKey === 'disarm') {
    if (codeDisarmRequired !== undefined) return codeDisarmRequired;
    return true;
  }

  if (codeArmRequired !== undefined) return codeArmRequired;
  return false;
}

export default function AlarmActionPinModal({
  show,
  onClose,
  actionKey,
  entityId,
  entity,
  callService,
  t,
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const translate = useMemo(() => t || ((key) => key), [t]);
  const actionMeta = ACTION_META[actionKey] || null;
  const ActionIcon = actionMeta?.icon || Shield;
  const needsCode = useMemo(() => requiresCode(actionKey, entity), [actionKey, entity]);

  const submit = useCallback(async () => {
    if (!actionMeta || !entityId || submitting) return;

    if (needsCode && !pin.trim()) {
      setError(translate('alarm.pin.required'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = { entity_id: entityId };
      if (needsCode && pin.trim()) payload.code = pin.trim();
      await callService('alarm_control_panel', actionMeta.service, payload);
      setPin('');
      onClose();
    } catch {
      setPin('');
      setError(translate('alarm.error.serviceFailed'));
    } finally {
      setSubmitting(false);
    }
  }, [actionMeta, entityId, submitting, needsCode, pin, callService, onClose, translate]);

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(timer);
  }, [show]);

  useEffect(() => {
    if (!show) return;
    setError('');
  }, [show]);

  if (!show || !actionMeta || !entityId || !entity) return null;

  const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-md rounded-3xl p-6 font-sans relative backdrop-blur-xl popup-anim"
        style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 modal-close">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl popup-surface border border-[var(--glass-border)]">
            <ActionIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)]">{translate('alarm.modal.actions')}</p>
            <p className="text-sm font-semibold uppercase tracking-wide">{translate(actionMeta.labelKey)}</p>
          </div>
        </div>

        <div className="popup-surface rounded-2xl p-4 space-y-3">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, '').slice(0, 12));
              if (error) setError('');
            }}
            placeholder={translate('alarm.pin.placeholder')}
            className="w-full px-4 py-3 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-primary)] text-lg tracking-[0.35em] text-center outline-none"
          />

          <div className="grid grid-cols-3 gap-3">
            {keypadDigits.map((digit, index) => {
              if (digit === '⌫') {
                return (
                  <button
                    key={`undo-${index}`}
                    type="button"
                    onClick={() => setPin((value) => value.slice(0, -1))}
                    className="h-14 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] text-xl font-semibold transition-colors hover:bg-[var(--glass-bg-hover)]"
                  >
                    {digit}
                  </button>
                );
              }

              if (digit === '✓') {
                return (
                  <button
                    key="ok"
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="h-14 rounded-2xl bg-[var(--accent-bg)] text-[var(--accent-color)] text-2xl font-semibold disabled:opacity-50"
                  >
                    {digit}
                  </button>
                );
              }

              return (
                <button
                  key={digit}
                  type="button"
                  onClick={() => setPin((value) => `${value}${digit}`.slice(0, 12))}
                  className="h-14 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-primary)] text-2xl font-semibold transition-colors hover:bg-[var(--glass-bg-hover)]"
                >
                  {digit}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-[var(--text-primary)]">{error}</p>}
      </div>
    </div>
  );
}
