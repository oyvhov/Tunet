import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Home,
  Lock,
  LogOut,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  Unlock,
  X,
} from '../icons';
import MdiIcon from '@mdi/react';
import { mdiShieldHome, mdiShieldLock, mdiShieldOff } from '@mdi/js';

const FEATURE_ARM_HOME = 1;
const FEATURE_ARM_AWAY = 2;
const FEATURE_ARM_NIGHT = 4;
const FEATURE_ARM_CUSTOM_BYPASS = 16;
const FEATURE_ARM_VACATION = 32;

const ACTIONS = [
  { key: 'arm_home', feature: FEATURE_ARM_HOME, labelKey: 'alarm.action.armHome', icon: Home },
  { key: 'arm_away', feature: FEATURE_ARM_AWAY, labelKey: 'alarm.action.armAway', icon: LogOut },
  { key: 'arm_night', feature: FEATURE_ARM_NIGHT, labelKey: 'alarm.action.armNight', icon: Moon },
  {
    key: 'arm_vacation',
    feature: FEATURE_ARM_VACATION,
    labelKey: 'alarm.action.armVacation',
    icon: Sun,
  },
  {
    key: 'arm_custom_bypass',
    feature: FEATURE_ARM_CUSTOM_BYPASS,
    labelKey: 'alarm.action.armCustomBypass',
    icon: Shield,
  },
];

const DISARM_ACTION = { key: 'disarm', labelKey: 'alarm.action.disarm', icon: Unlock };

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

  const parseBooleanLike = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (
        normalized === 'true' ||
        normalized === '1' ||
        normalized === 'yes' ||
        normalized === 'on'
      )
        return true;
      if (
        normalized === 'false' ||
        normalized === '0' ||
        normalized === 'no' ||
        normalized === 'off'
      )
        return false;
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

function getStateLabel(state, t) {
  const key = `alarm.state.${state}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return state || t('common.unknown');
}

function getStateVisual(state) {
  if (state === 'disarmed') {
    return {
      mdiPath: mdiShieldOff,
      iconColor: '#3b82f6',
      iconBgStyle: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
    };
  }
  if (state === 'armed_home') {
    return {
      mdiPath: mdiShieldHome,
      iconColor: '#22c55e',
      iconBgStyle: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
    };
  }
  if (state === 'armed_away') {
    return {
      mdiPath: mdiShieldLock,
      iconColor: '#22c55e',
      iconBgStyle: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
    };
  }
  if (state === 'triggered')
    return {
      Icon: AlertTriangle,
      iconColor: 'var(--text-primary)',
      iconBgStyle: { backgroundColor: 'var(--glass-bg)' },
    };
  if (state === 'arming' || state === 'disarming' || state === 'pending')
    return {
      Icon: RefreshCw,
      iconColor: 'var(--text-primary)',
      iconBgStyle: { backgroundColor: 'var(--glass-bg)' },
    };
  if (state === 'unavailable' || state === 'unknown')
    return {
      Icon: AlertTriangle,
      iconColor: 'var(--text-primary)',
      iconBgStyle: { backgroundColor: 'var(--glass-bg)' },
    };
  return {
    Icon: Lock,
    iconColor: 'var(--text-primary)',
    iconBgStyle: { backgroundColor: 'var(--glass-bg)' },
  };
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
  const actionButtons = useMemo(
    () => [
      ...(canDisarm ? [DISARM_ACTION] : []),
      ...availableArmActions.map((action) => ({
        key: action.key,
        labelKey: action.labelKey,
        icon: action.icon,
      })),
    ],
    [canDisarm, availableArmActions]
  );

  const name = customName || safeEntity.attributes?.friendly_name || entityId;
  const stateVisual = getStateVisual(state);
  const StateIcon = stateVisual.Icon || Lock;

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
      if (needsCode) setPin('');
      setError(translate('alarm.error.serviceFailed'));
    } finally {
      setBusyAction(null);
    }
  };

  const runSelectedAction = async () => {
    if (!selectedAction) return;
    await callAlarmService(selectedAction);
  };

  const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
  const selectedActionMeta = actionButtons.find((action) => action.key === selectedAction) || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border p-6 font-sans backdrop-blur-xl md:rounded-[3rem] md:p-10"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-6 right-6 md:top-8 md:right-8"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 flex items-center gap-4">
          <div className="popup-surface rounded-2xl p-4" style={stateVisual.iconBgStyle}>
            {stateVisual.mdiPath ? (
              <MdiIcon
                path={stateVisual.mdiPath}
                size={1.2}
                color={stateVisual.iconColor}
                className={
                  state === 'arming' || state === 'disarming' || state === 'pending'
                    ? 'animate-spin'
                    : ''
                }
              />
            ) : (
              <StateIcon
                className={`h-7 w-7 ${state === 'arming' || state === 'disarming' || state === 'pending' ? 'animate-spin' : ''}`}
                color={stateVisual.iconColor}
                style={{ color: stateVisual.iconColor }}
              />
            )}
          </div>
          <div>
            <h3 className="text-2xl leading-none font-light tracking-tight uppercase italic">
              {name}
            </h3>
            <p className="mt-2 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              {translate('alarm.title')} · {getStateLabel(state, translate)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="popup-surface space-y-4 rounded-3xl p-5 lg:col-span-3">
            <p className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              {translate('alarm.modal.actions')}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {actionButtons.map((action) => {
                const needsCode = requiresCode(action.key, entity);
                const disabled = !!busyAction || isUnavailable || (unsupportedCode && needsCode);
                const isBusy = busyAction === action.key;
                const isSelected = selectedAction === action.key;
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => {
                      setSelectedAction(action.key);
                      setError('');
                    }}
                    disabled={disabled}
                    className="w-full rounded-2xl border p-3 text-left transition-colors disabled:opacity-50"
                    style={
                      selectedAction === action.key
                        ? {
                            backgroundColor: 'var(--accent-bg)',
                            borderColor: 'var(--accent-color)',
                            color: 'var(--accent-color)',
                          }
                        : {
                            backgroundColor: 'var(--glass-bg)',
                            borderColor: 'var(--glass-border)',
                            color: 'var(--text-primary)',
                          }
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                        <action.icon className="h-4 w-4" />
                        {translate(action.labelKey)}
                      </span>
                      {isBusy ? (
                        <span className="text-[10px] tracking-widest uppercase">
                          {translate('common.loading')}
                        </span>
                      ) : isSelected ? (
                        <Check className="h-5 w-5" />
                      ) : null}
                    </div>
                    {needsCode && (
                      <p className="mt-1 text-[10px] tracking-wider uppercase opacity-80">
                        {translate('alarm.pin.required')}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            {actionButtons.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">
                {translate('alarm.modal.noActions')}
              </p>
            )}
          </div>

          <div className="popup-surface space-y-4 rounded-3xl p-5 lg:col-span-2">
            <p className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              {translate('alarm.pin.title')}
            </p>
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
              className="w-full rounded-2xl bg-[var(--glass-bg)] px-4 py-3 text-center text-lg tracking-[0.35em] text-[var(--text-primary)] outline-none"
            />

            <div className="grid grid-cols-3 gap-3">
              {keypadDigits.map((digit, index) => {
                if (digit === '⌫') {
                  return (
                    <button
                      key={`undo-${index}`}
                      type="button"
                      onClick={() => setPin((value) => value.slice(0, -1))}
                      className="h-14 rounded-2xl bg-[var(--glass-bg)] text-xl font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
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
                      onClick={runSelectedAction}
                      className="h-14 rounded-2xl bg-[var(--accent-bg)] text-2xl font-semibold text-[var(--accent-color)]"
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
                    className="h-14 rounded-2xl bg-[var(--glass-bg)] text-2xl font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
                  >
                    {digit}
                  </button>
                );
              })}
            </div>

            {selectedActionMeta && (
              <p className="text-center text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                {translate(selectedActionMeta.labelKey)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-2 text-sm text-[var(--text-secondary)]">
          {entity.attributes?.changed_by && (
            <p>
              {translate('alarm.changedBy')}: {entity.attributes.changed_by}
            </p>
          )}
          {unsupportedCode && (
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {translate('alarm.code.numberOnlyHint')}
            </p>
          )}
          {error && <p className="text-[var(--text-primary)]">{error}</p>}
        </div>
      </div>
    </div>
  );
}
