import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Home, Lock, LogOut, Moon, RefreshCw, Shield, Sun, Unlock, X } from '../icons';

const FEATURE_ARM_HOME = 1;
const FEATURE_ARM_AWAY = 2;
const FEATURE_ARM_NIGHT = 4;
const FEATURE_ARM_CUSTOM_BYPASS = 16;
const FEATURE_ARM_VACATION = 32;

const ACTIONS = [
  { key: 'arm_home', feature: FEATURE_ARM_HOME, labelKey: 'alarm.action.armHome', icon: Home },
  { key: 'arm_away', feature: FEATURE_ARM_AWAY, labelKey: 'alarm.action.armAway', icon: LogOut },
  { key: 'arm_night', feature: FEATURE_ARM_NIGHT, labelKey: 'alarm.action.armNight', icon: Moon },
  { key: 'arm_vacation', feature: FEATURE_ARM_VACATION, labelKey: 'alarm.action.armVacation', icon: Sun },
  { key: 'arm_custom_bypass', feature: FEATURE_ARM_CUSTOM_BYPASS, labelKey: 'alarm.action.armCustomBypass', icon: Shield },
];

const DISARM_ACTION = { key: 'disarm', labelKey: 'alarm.action.disarm', icon: Unlock, emphasized: true };

const SERVICE_MAP = {
  arm_home: 'alarm_arm_home',
  arm_away: 'alarm_arm_away',
  arm_night: 'alarm_arm_night',
  arm_vacation: 'alarm_arm_vacation',
  arm_custom_bypass: 'alarm_arm_custom_bypass',
  disarm: 'alarm_disarm',
};

function isUnsupportedCodeFormat(entity) {
  const codeFormat = entity?.attributes?.code_format || 'none';
  return codeFormat !== 'none' && codeFormat !== 'number';
}

function requiresCode(actionKey, entity) {
  const codeFormat = entity?.attributes?.code_format || 'none';
  const hasCode = codeFormat !== 'none';
  if (!hasCode) return false;

  if (actionKey === 'disarm') return true;
  return entity?.attributes?.code_arm_required === true;
}

function getStateLabel(state, t) {
  const key = `alarm.state.${state}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return state || t('common.unknown');
}

function getStateIcon(state) {
  if (state === 'triggered') return AlertTriangle;
  if (state === 'disarmed') return Unlock;
  if (state === 'arming' || state === 'disarming' || state === 'pending') return RefreshCw;
  if (state === 'unavailable' || state === 'unknown') return AlertTriangle;
  return Lock;
}

export default function AlarmModal({
  show,
  onClose,
  entityId,
  entity,
  callService,
  customName,
  t,
}) {
  const [pin, setPin] = useState('');
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState('');
  const [selectedAction, setSelectedAction] = useState(null);

  const safeEntity = entity || { attributes: {} };
  const translate = t || ((key) => key);
  const state = safeEntity.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown';
  const unsupportedCode = isUnsupportedCodeFormat(safeEntity);
  const supportedFeatures = Number(safeEntity.attributes?.supported_features || 0);

  const availableArmActions = useMemo(() => {
    return ACTIONS.filter((action) => (supportedFeatures & action.feature) !== 0);
  }, [supportedFeatures]);

  const canDisarm = !isUnavailable && state !== 'disarmed';
  const actionButtons = useMemo(() => ([
    ...(canDisarm ? [DISARM_ACTION] : []),
    ...availableArmActions.map((action) => ({ key: action.key, labelKey: action.labelKey, icon: action.icon, emphasized: false })),
  ]), [canDisarm, availableArmActions]);

  const codeFormat = safeEntity.attributes?.code_format || 'none';
  const name = customName || safeEntity.attributes?.friendly_name || entityId;
  const StateIcon = getStateIcon(state);

  useEffect(() => {
    if (!show) return;
    if (actionButtons.length === 0) {
      setSelectedAction(null);
      return;
    }
    if (canDisarm) {
      setSelectedAction('disarm');
      return;
    }
    setSelectedAction(actionButtons[0].key);
  }, [show, state, canDisarm, actionButtons]);

  if (!show || !entityId || !entity) return null;

  const callAlarmService = async (actionKey) => {
    if (isUnavailable || busyAction) return;
    if (unsupportedCode && requiresCode(actionKey, entity)) {
      setError(translate('alarm.code.numberOnlyHint'));
      return;
    }

    const needsCode = requiresCode(actionKey, entity);
    if (needsCode && !pin.trim()) {
      setError(translate('alarm.pin.required'));
      return;
    }

    const service = SERVICE_MAP[actionKey];
    if (!service) return;

    setBusyAction(actionKey);
    setError('');

    try {
      const payload = { entity_id: entityId };
      if (needsCode) payload.code = pin.trim();
      await callService('alarm_control_panel', service, payload);
      if (needsCode) setPin('');
    } catch {
      setError(translate('alarm.error.serviceFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const runSelectedAction = async () => {
    if (!selectedAction) return;
    await callAlarmService(selectedAction);
  };

  const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '✓'];
  const selectedActionMeta = actionButtons.find((action) => action.key === selectedAction) || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-4xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 font-sans relative max-h-[90vh] overflow-y-auto backdrop-blur-xl popup-anim"
        style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 md:top-8 md:right-8 modal-close">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 rounded-2xl border popup-surface">
            <StateIcon className={`w-7 h-7 ${state === 'arming' || state === 'disarming' || state === 'pending' ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h3 className="text-2xl font-light tracking-tight uppercase italic leading-none">{name}</h3>
            <p className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)] mt-2">
              {translate('alarm.title')} · {getStateLabel(state, translate)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 popup-surface rounded-3xl p-5 space-y-4">
            <p className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]">{translate('alarm.modal.actions')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {actionButtons.map((action) => {
                const needsCode = requiresCode(action.key, entity);
                const disabled = !!busyAction || isUnavailable || (unsupportedCode && needsCode);
                const selected = busyAction === action.key;
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => {
                      setSelectedAction(action.key);
                      setError('');
                    }}
                    disabled={disabled}
                    className="w-full p-3 rounded-2xl border text-left transition-colors disabled:opacity-50"
                    style={(selectedAction === action.key || action.emphasized)
                      ? {
                          backgroundColor: 'var(--accent-bg)',
                          borderColor: 'var(--accent-color)',
                          color: 'var(--accent-color)',
                        }
                      : {
                          backgroundColor: 'var(--glass-bg)',
                          borderColor: 'var(--glass-border)',
                          color: 'var(--text-primary)',
                        }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                        <action.icon className="w-4 h-4" />
                        {translate(action.labelKey)}
                      </span>
                      {selected ? <span className="text-[10px] uppercase tracking-widest">{translate('common.loading')}</span> : <Check className="w-4 h-4" />}
                    </div>
                    {needsCode && (
                      <p className="text-[10px] mt-1 uppercase tracking-wider opacity-80">{translate('alarm.pin.required')}</p>
                    )}
                  </button>
                );
              })}
            </div>
            {actionButtons.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">{translate('alarm.modal.noActions')}</p>
            )}
          </div>

          <div className="lg:col-span-2 popup-surface rounded-3xl p-5 space-y-4">
            <p className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]">{translate('alarm.pin.title')}</p>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 12));
                if (error) setError('');
              }}
              placeholder={translate('alarm.pin.placeholder')}
              className="w-full px-3 py-2 rounded-xl border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] text-sm outline-none"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  runSelectedAction();
                }
              }}
            />

            <div className="grid grid-cols-3 gap-2">
              {keypadDigits.map((digit, index) => {
                if (digit === '') return <div key={`blank-${index}`} />;
                if (digit === '✓') {
                  return (
                    <button
                      key="ok"
                      type="button"
                      onClick={runSelectedAction}
                      className="h-10 rounded-xl border bg-[var(--accent-bg)] border-[var(--accent-color)] text-[var(--accent-color)] font-semibold"
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
                    className="h-10 rounded-xl border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] font-semibold"
                  >
                    {digit}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setPin((value) => value.slice(0, -1))}
              className="w-full py-2 rounded-xl border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest"
            >
              ⌫
            </button>

            <button
              type="button"
              onClick={runSelectedAction}
              disabled={!selectedAction || !!busyAction || isUnavailable}
              className="w-full py-2.5 rounded-xl border text-xs font-bold uppercase tracking-widest disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-bg)',
                borderColor: 'var(--accent-color)',
                color: 'var(--accent-color)',
              }}
            >
              {translate('common.ok')}
              {selectedActionMeta ? ` · ${translate(selectedActionMeta.labelKey)}` : ''}
            </button>
          </div>
        </div>

        <div className="mt-5 text-sm text-[var(--text-secondary)] space-y-2">
          <p>{translate('alarm.code.format')}: {codeFormat}</p>
          {entity.attributes?.changed_by && <p>{translate('alarm.changedBy')}: {entity.attributes.changed_by}</p>}
          {unsupportedCode && (
            <p className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {translate('alarm.code.numberOnlyHint')}
            </p>
          )}
          {error && <p className="text-[var(--text-primary)]">{error}</p>}
        </div>
      </div>
    </div>
  );
}
