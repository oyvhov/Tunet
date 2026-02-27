import {
  AlertTriangle,
  Home,
  Lock,
  LogOut,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  Unlock,
} from '../../icons';
import MdiIcon from '@mdi/react';
import { mdiShieldHome, mdiShieldLock, mdiShieldOff } from '@mdi/js';

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

function isUnsupportedCodeFormat(entity) {
  const codeFormat = entity?.attributes?.code_format || 'none';
  return codeFormat !== 'none' && codeFormat !== 'number';
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

export default function AlarmCard({
  cardId,
  entityId,
  entity,
  dragProps,
  controls,
  settings,
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
  const isSmall = settings?.size === 'small';
  const unsupportedCode = isUnsupportedCodeFormat(entity);
  const availableArmActions = getAvailableArmActions(entity);
  const stateVisual = getStateVisual(state);
  const StateIcon = stateVisual.Icon || Lock;

  const name = customNames?.[cardId] || entity.attributes?.friendly_name || entityId;

  const quickActions = [];
  if (!inTransition && !isUnavailable) {
    if (isDisarmed) {
      quickActions.push(...availableArmActions.slice(0, isSmall ? 1 : 2));
    } else {
      quickActions.push(DISARM_ACTION);
    }
  }

  const primaryAction = quickActions[0] || null;

  const runQuickAction = async (event, actionKey) => {
    event.stopPropagation();
    if (editMode || isUnavailable || inTransition) return;
    const mustOpenModal = unsupportedCode || requiresCode(actionKey, entity);
    if (mustOpenModal && onOpenAction) {
      onOpenAction(actionKey);
      return;
    }
    if (mustOpenModal && onOpen) {
      onOpen();
      return;
    }
    await onAction(actionKey);
  };

  if (isSmall) {
    return (
      <div
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(event) => {
          event.stopPropagation();
          if (!editMode && onOpen) onOpen();
        }}
        className={`glass-texture touch-feedback group relative flex h-full items-center justify-between gap-3 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${
          !editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'
        }`}
        style={{ ...cardStyle, containerType: 'inline-size' }}
      >
        {controls}

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
            style={stateVisual.iconBgStyle}
          >
            {stateVisual.mdiPath ? (
              <MdiIcon
                path={stateVisual.mdiPath}
                size={0.95}
                color={stateVisual.iconColor}
                className={inTransition ? 'animate-spin' : ''}
              />
            ) : (
              <StateIcon
                className={`h-5 w-5 ${inTransition ? 'animate-spin' : ''}`}
                color={stateVisual.iconColor}
                style={{ color: stateVisual.iconColor }}
              />
            )}
          </div>

          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-[11px] leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase">
                {name}
              </p>
            </div>
          </div>
        </div>

        {primaryAction ? (
          <button
            type="button"
            onClick={(event) => runQuickAction(event, primaryAction.key)}
            className="h-11 min-w-[6.5rem] rounded-2xl bg-[var(--glass-bg)] px-3 text-[10px] font-bold tracking-wider text-[var(--text-primary)] uppercase transition-colors hover:bg-[var(--glass-bg-hover)] disabled:opacity-50"
            disabled={isUnavailable || inTransition}
          >
            <span className="flex items-center justify-center gap-1.5">
              <primaryAction.icon className="h-3.5 w-3.5" />
              {translate(primaryAction.labelKey)}
            </span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(event) => {
        event.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
      className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-3xl border p-5 font-sans transition-all duration-500 ${
        !editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'
      }`}
      style={cardStyle}
    >
      {controls}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
            style={stateVisual.iconBgStyle}
          >
            {stateVisual.mdiPath ? (
              <MdiIcon
                path={stateVisual.mdiPath}
                size={0.95}
                color={stateVisual.iconColor}
                className={inTransition ? 'animate-spin' : ''}
              />
            ) : (
              <StateIcon
                className={`h-5 w-5 ${inTransition ? 'animate-spin' : ''}`}
                color={stateVisual.iconColor}
                style={{ color: stateVisual.iconColor }}
              />
            )}
          </div>
        </div>

        <div className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
          {translate('alarm.title')}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-1 leading-none">
          <span className="truncate text-3xl leading-none font-thin text-[var(--text-primary)]">
            {getStateLabel(state, translate)}
          </span>
        </div>
        <p className="truncate text-[10px] leading-none font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase opacity-60">
          {name}
        </p>
        {entity.attributes?.changed_by && (
          <p className="truncate text-[11px] text-[var(--text-secondary)]">
            {translate('alarm.changedBy')}: {entity.attributes.changed_by}
          </p>
        )}
        {unsupportedCode && (
          <p className="text-[11px] text-[var(--text-secondary)]">
            {translate('alarm.code.numberOnlyHint')}
          </p>
        )}
        {isTriggered && (
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-primary)]">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="font-bold tracking-wider uppercase">{translate('status.alert')}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {quickActions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={(event) => runQuickAction(event, action.key)}
            className="h-12 flex-1 rounded-2xl bg-[var(--glass-bg)] px-3 text-[11px] font-bold tracking-wider text-[var(--text-primary)] uppercase transition-colors hover:bg-[var(--glass-bg-hover)] disabled:opacity-50"
            disabled={isUnavailable || inTransition}
          >
            <span className="flex items-center justify-center gap-1.5">
              <action.icon className="h-3.5 w-3.5" />
              {translate(action.labelKey)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
