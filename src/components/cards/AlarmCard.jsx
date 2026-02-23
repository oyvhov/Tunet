import { AlertTriangle, Bell, Home, Lock, LogOut, Moon, RefreshCw, Shield, Sun, Unlock } from '../../icons';

const FEATURE_ARM_HOME = 1;
const FEATURE_ARM_AWAY = 2;
const FEATURE_ARM_NIGHT = 4;
const FEATURE_ARM_CUSTOM_BYPASS = 16;
const FEATURE_ARM_VACATION = 32;

const TRANSITION_STATES = new Set(['arming', 'pending', 'disarming']);

const ACTIONS = [
  { key: 'arm_home', feature: FEATURE_ARM_HOME, labelKey: 'alarm.action.armHome', icon: Home },
  { key: 'arm_away', feature: FEATURE_ARM_AWAY, labelKey: 'alarm.action.armAway', icon: LogOut },
  { key: 'arm_night', feature: FEATURE_ARM_NIGHT, labelKey: 'alarm.action.armNight', icon: Moon },
  { key: 'arm_vacation', feature: FEATURE_ARM_VACATION, labelKey: 'alarm.action.armVacation', icon: Sun },
  { key: 'arm_custom_bypass', feature: FEATURE_ARM_CUSTOM_BYPASS, labelKey: 'alarm.action.armCustomBypass', icon: Shield },
];

const DISARM_ACTION = { key: 'disarm', labelKey: 'alarm.action.disarm', icon: Unlock };

function getStateLabel(state, t) {
  const key = `alarm.state.${state}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return state || t('common.unknown');
}

function getAvailableArmActions(entity) {
  const supportedFeatures = Number(entity?.attributes?.supported_features || 0);
  return ACTIONS.filter((action) => (supportedFeatures & action.feature) !== 0);
}

function requiresCode(actionKey, entity) {
  const codeFormat = entity?.attributes?.code_format || 'none';
  const hasCode = codeFormat !== 'none';
  if (!hasCode) return false;

  if (actionKey === 'disarm') return true;
  const codeArmRequired = entity?.attributes?.code_arm_required === true;
  return codeArmRequired;
}

function isUnsupportedCodeFormat(entity) {
  const codeFormat = entity?.attributes?.code_format || 'none';
  return codeFormat !== 'none' && codeFormat !== 'number';
}

function getStateIcon(state) {
  if (state === 'triggered') return AlertTriangle;
  if (state === 'disarmed') return Unlock;
  if (state === 'arming' || state === 'disarming' || state === 'pending') return RefreshCw;
  if (state === 'unavailable' || state === 'unknown') return AlertTriangle;
  return Lock;
}

export default function AlarmCard({
  cardId,
  entityId,
  entity,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  onOpen,
  onOpenAction,
  onAction,
  t,
}) {
  if (!entity || !entityId) return null;

  const translate = t || ((key) => key);
  const state = entity.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown';
  const isTriggered = state === 'triggered';
  const inTransition = TRANSITION_STATES.has(state);
  const isDisarmed = state === 'disarmed';
  const unsupportedCode = isUnsupportedCodeFormat(entity);
  const availableArmActions = getAvailableArmActions(entity);
  const StateIcon = getStateIcon(state);

  const name = customNames?.[cardId] || entity.attributes?.friendly_name || entityId;

  const quickActions = [];
  if (!inTransition && !isUnavailable) {
    if (isDisarmed) {
      quickActions.push(...availableArmActions.slice(0, 2));
    } else {
      quickActions.push(DISARM_ACTION);
    }
  }

  const runQuickAction = async (event, actionKey) => {
    event.stopPropagation();
    if (editMode || isUnavailable || inTransition) return;
    if (onOpenAction) {
      onOpenAction(actionKey);
      return;
    }
    const mustOpenModal = unsupportedCode || requiresCode(actionKey, entity);
    if (mustOpenModal && onOpen) {
      onOpen();
      return;
    }
    await onAction(actionKey);
  };

  return (
    <div
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(event) => {
        event.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
      className={`glass-texture touch-feedback p-5 rounded-3xl flex flex-col justify-between gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${
        !editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'
      }`}
      style={cardStyle}
    >
      {controls}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--glass-bg)] text-[var(--text-primary)] border border-[var(--glass-border)]">
            <StateIcon className={`w-5 h-5 ${inTransition ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)] truncate">{name}</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{getStateLabel(state, translate)}</p>
          </div>
        </div>

        <div className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)]">
          {translate('alarm.title')}
        </div>
      </div>

      <div className="space-y-2">
        {entity.attributes?.changed_by && (
          <p className="text-[11px] text-[var(--text-secondary)] truncate">
            {translate('alarm.changedBy')}: {entity.attributes.changed_by}
          </p>
        )}
        {unsupportedCode && (
          <p className="text-[11px] text-[var(--text-secondary)]">{translate('alarm.code.numberOnlyHint')}</p>
        )}
        {isTriggered && (
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-primary)]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider font-bold">{translate('status.alert')}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {quickActions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={(event) => runQuickAction(event, action.key)}
            className="flex-1 py-2 px-3 rounded-xl border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)] text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-[var(--glass-bg-hover)] disabled:opacity-50"
            disabled={isUnavailable || inTransition}
          >
            <span className="flex items-center justify-center gap-1.5">
              <action.icon className="w-3.5 h-3.5" />
              {translate(action.labelKey)}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (!editMode && onOpen) onOpen();
          }}
          className="w-9 h-9 rounded-xl border flex items-center justify-center bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label={translate('alarm.action.openControls')}
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
