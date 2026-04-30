import { useEffect, useState, memo } from 'react';
import { AlertTriangle, Key, Lock, Unlock } from '../../icons';
import { getIconComponent } from '../../icons';

const FEATURE_OPEN = 1;
const normalizeState = (state) => String(state || 'unknown').toLowerCase();

function getLockStateLabel(state, t) {
  const normalized = normalizeState(state);
  const key = `lock.state.${normalized}`;
  const translated = t(key);
  return translated === key ? state || t('common.unknown') : translated;
}

const LockCard = memo(/** @param {any} props */ function LockCard({
  lockId,
  dragProps,
  controls,
  cardStyle,
  entities,
  conn,
  editMode,
  cardSettings,
  settingsKey,
  customNames,
  customIcons,
  getA,
  callService,
  onOpen,
  isMobile,
  t,
}) {
  const entity = entities[lockId];
  const [confirmUnlock, setConfirmUnlock] = useState(false);

  useEffect(() => {
    if (!confirmUnlock) return undefined;
    const timeout = setTimeout(() => setConfirmUnlock(false), 3000);
    return () => clearTimeout(timeout);
  }, [confirmUnlock]);

  if (!entity) {
    if (editMode) {
      return (
        <div
          key={lockId}
          {...dragProps}
          className="touch-feedback relative flex h-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-[var(--status-error-border)] bg-[var(--card-bg)] p-4"
          style={cardStyle}
        >
          {controls}
          <AlertTriangle className="mb-2 h-8 w-8 text-[var(--status-error-fg)] opacity-80" />
          <p className="text-center text-xs font-bold tracking-widest text-[var(--status-error-fg)] uppercase">
            {t('common.missing')}
          </p>
          <p className="mt-1 line-clamp-2 text-center font-mono text-[10px] break-all text-[var(--status-error-fg)]/70">
            {lockId}
          </p>
        </div>
      );
    }
    return null;
  }

  const settings = cardSettings[settingsKey] || cardSettings[lockId] || {};
  const isSmall = settings.size === 'small';
  const normalizedState = normalizeState(entity.state);
  const isLocked = normalizedState === 'locked' || normalizedState === 'locking';
  const isUnlocked = normalizedState === 'unlocked' || normalizedState === 'unlocking';
  const isOpen = normalizedState === 'open' || normalizedState === 'opening';
  const isJammed = normalizedState === 'jammed';
  const isUnavailable = normalizedState === 'unavailable' || normalizedState === 'unknown';
  const isActionDisabled = editMode || !conn || isUnavailable;
  const supportsOpen = (Number(entity?.attributes?.supported_features || 0) & FEATURE_OPEN) !== 0;
  const codeFormat = entity?.attributes?.code_format;
  const requiresCode = typeof codeFormat === 'string' && codeFormat.trim() && codeFormat !== 'none';
  const name = customNames[lockId] || getA(lockId, 'friendly_name', lockId);
  const iconName = customIcons[lockId] || entity?.attributes?.icon;
  const Icon = iconName ? getIconComponent(iconName) || Lock : Lock;
  const statusText = getLockStateLabel(entity.state, t);
  const useDenseMobileLargeLayout = isMobile && !isSmall;

  const iconTone = isJammed
    ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]'
    : isUnlocked || isOpen
      ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]'
      : isLocked
        ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]'
        : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]';

  const statusTone = isJammed
    ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-fg)]'
    : isUnlocked || isOpen
      ? 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]'
      : isLocked
        ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]'
        : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]';

  const buildServicePayload = () => {
    const payload = { entity_id: lockId };
    if (!requiresCode) return payload;
    const code = globalThis.window?.prompt?.(t('lock.code.prompt'));
    if (code === null || code === undefined) return null;
    const trimmed = code.trim();
    if (trimmed) payload.code = trimmed;
    return payload;
  };

  const runLockService = (event) => {
    event.stopPropagation();
    setConfirmUnlock(false);
    if (isActionDisabled || isLocked) return;
    const payload = buildServicePayload();
    if (!payload) return;
    callService('lock', 'lock', payload);
  };

  const runUnlockService = (event) => {
    event.stopPropagation();
    if (isActionDisabled || isUnlocked || isOpen) return;
    if (!confirmUnlock) {
      setConfirmUnlock(true);
      return;
    }
    setConfirmUnlock(false);
    const payload = buildServicePayload();
    if (!payload) return;
    callService('lock', 'unlock', payload);
  };

  const runOpenService = (event) => {
    event.stopPropagation();
    setConfirmUnlock(false);
    if (isActionDisabled || !supportsOpen || isOpen) return;
    const payload = buildServicePayload();
    if (!payload) return;
    callService('lock', 'open', payload);
  };

  const lockButtonDisabled = isActionDisabled || isLocked;
  const unlockButtonDisabled = isActionDisabled || isUnlocked || isOpen;
  const openButtonDisabled = isActionDisabled || !supportsOpen || isOpen;
  const actionButtonBase = 'flex items-center justify-center rounded-xl transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-40';
  const lockButtonClass = `${actionButtonBase} bg-[var(--status-success-bg)] text-[var(--status-success-fg)] hover:bg-[var(--status-success-border)]`;
  const unlockButtonClass = `${actionButtonBase} ${confirmUnlock ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)] ring-1 ring-[var(--status-warning-border)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`;
  const openButtonClass = `${actionButtonBase} bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]`;

  if (isSmall) {
    const primaryAction = isUnlocked || isOpen ? runLockService : runUnlockService;
    const primaryLabel = isUnlocked || isOpen
      ? t('lock.action.lock')
      : confirmUnlock
        ? t('lock.action.confirmUnlock')
        : t('lock.action.unlock');
    const PrimaryIcon = isUnlocked || isOpen ? Lock : Key;
    const primaryDisabled = isUnlocked || isOpen ? lockButtonDisabled : unlockButtonDisabled;

    return (
      <div
        key={lockId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(event) => {
          event.stopPropagation();
          if (!editMode) onOpen();
        }}
        className={`glass-texture touch-feedback group relative flex h-full items-center justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isMobile ? 'gap-3 p-3 pl-4' : 'gap-4 p-4 pl-5'} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={{ ...cardStyle, backgroundColor: 'var(--card-bg)', containerType: 'inline-size' }}
      >
        {controls}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all group-hover:scale-110 ${iconTone}`}>
            <Icon className="h-6 w-6 stroke-[1.5px]" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-70">
              {name}
            </p>
            <span className="truncate text-xl leading-none font-medium text-[var(--text-primary)]">
              {statusText}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          {supportsOpen && (
            <button
              type="button"
              onClick={runOpenService}
              disabled={openButtonDisabled}
              aria-label={t('lock.action.open')}
              title={t('lock.action.open')}
              className={`${openButtonClass} h-10 w-10`}
            >
              <Key className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={primaryAction}
            disabled={primaryDisabled}
            aria-label={primaryLabel}
            title={primaryLabel}
            className={`${isUnlocked || isOpen ? lockButtonClass : unlockButtonClass} h-10 w-10`}
          >
            <PrimaryIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      key={lockId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(event) => {
        event.stopPropagation();
        if (!editMode) onOpen();
      }}
      className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isMobile ? 'p-5' : 'p-7'} ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{ ...cardStyle, backgroundColor: 'var(--card-bg)' }}
    >
      {controls}
      <div className={`flex items-start justify-between ${useDenseMobileLargeLayout ? 'gap-3' : 'gap-4'}`}>
        <div className={`transition-all group-hover:scale-110 group-hover:rotate-3 ${isMobile ? 'rounded-xl p-2.5' : 'rounded-2xl p-3'} ${iconTone}`}>
          <Icon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} stroke-[1.5px]`} />
        </div>
        <div className={`flex items-center rounded-full border ${statusTone} ${useDenseMobileLargeLayout ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3 py-1'}`}>
          {isUnlocked || isOpen ? (
            <Unlock className={useDenseMobileLargeLayout ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          ) : (
            <Lock className={useDenseMobileLargeLayout ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          )}
          <span className={`${useDenseMobileLargeLayout ? 'text-[10px]' : 'text-xs'} font-bold tracking-widest uppercase`}>
            {statusText}
          </span>
        </div>
      </div>

      <div className={`${useDenseMobileLargeLayout ? 'mt-2 flex flex-col gap-3' : 'flex items-end justify-between gap-4'}`}>
        <div className="min-w-0">
          <p className={`${useDenseMobileLargeLayout ? 'mb-0.5 text-[10px]' : 'mb-1 text-xs'} truncate font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60`}>
            {name}
          </p>
          <h3 className={`${useDenseMobileLargeLayout ? 'text-[1.4rem]' : isMobile ? 'text-[1.65rem]' : 'text-3xl'} truncate leading-none font-thin text-[var(--text-primary)]`}>
            {statusText}
          </h3>
        </div>
        <div className={`${useDenseMobileLargeLayout ? `grid w-full ${supportsOpen ? 'grid-cols-3' : 'grid-cols-2'} gap-2` : 'flex gap-2'}`}>
          <button
            type="button"
            onClick={runLockService}
            disabled={lockButtonDisabled}
            aria-label={t('lock.action.lock')}
            title={t('lock.action.lock')}
            className={`${lockButtonClass} ${useDenseMobileLargeLayout ? 'h-10' : isMobile ? 'p-2.5' : 'p-3'}`}
          >
            <Lock className={useDenseMobileLargeLayout ? 'h-4 w-4' : 'h-5 w-5'} />
          </button>
          <button
            type="button"
            onClick={runUnlockService}
            disabled={unlockButtonDisabled}
            aria-label={confirmUnlock ? t('lock.action.confirmUnlock') : t('lock.action.unlock')}
            title={confirmUnlock ? t('lock.action.confirmUnlock') : t('lock.action.unlock')}
            className={`${unlockButtonClass} ${useDenseMobileLargeLayout ? 'h-10' : isMobile ? 'p-2.5' : 'p-3'}`}
          >
            {confirmUnlock ? (
              <Key className={useDenseMobileLargeLayout ? 'h-4 w-4' : 'h-5 w-5'} />
            ) : (
              <Unlock className={useDenseMobileLargeLayout ? 'h-4 w-4' : 'h-5 w-5'} />
            )}
          </button>
          {supportsOpen && (
            <button
              type="button"
              onClick={runOpenService}
              disabled={openButtonDisabled}
              aria-label={t('lock.action.open')}
              title={t('lock.action.open')}
              className={`${openButtonClass} ${useDenseMobileLargeLayout ? 'h-10' : isMobile ? 'p-2.5' : 'p-3'}`}
            >
              <Key className={useDenseMobileLargeLayout ? 'h-4 w-4' : 'h-5 w-5'} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default LockCard;
