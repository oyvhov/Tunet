import { memo } from 'react';
import {
  AlertTriangle,
  Fan as FanIconGlyph,
  MoveHorizontal,
  RotateCcw,
  RotateCw,
} from '../../icons';
import { getIconComponent } from '../../icons';
import M3Slider from '../ui/M3Slider';

const FAN_FEATURE = {
  SET_SPEED: 1,
  OSCILLATE: 2,
  DIRECTION: 4,
  PRESET_MODE: 8,
  TURN_OFF: 16,
  TURN_ON: 32,
};

const normalizeState = (state) => {
  if (!state) return 'unknown';
  return String(state).toLowerCase();
};

const supportsFeature = (supportedFeatures, bitMask) => {
  if (!Number.isFinite(supportedFeatures)) return false;
  return (supportedFeatures & bitMask) !== 0;
};

const FanCard = memo(/** @param {any} props */ function FanCard({
  fanId,
  dragProps,
  controls,
  cardStyle,
  entities,
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
  const entity = entities[fanId];

  if (!entity) {
    if (editMode) {
      return (
        <div
          key={fanId}
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
            {fanId}
          </p>
        </div>
      );
    }
    return null;
  }

  const settings = cardSettings[settingsKey] || cardSettings[fanId] || {};
  const isSmall = settings.size === 'small';
  const isDenseMobile = isMobile && !isSmall;
  const disableAnimation = settings.disable_animation;
  const state = normalizeState(entity.state);
  const isOn = state === 'on';
  const isUnavailable = state === 'unavailable' || state === 'unknown';

  const supportedFeatures = Number(entity.attributes?.supported_features || 0);
  const canTurnOn = supportsFeature(supportedFeatures, FAN_FEATURE.TURN_ON);
  const canTurnOff = supportsFeature(supportedFeatures, FAN_FEATURE.TURN_OFF);
  const canTogglePower = canTurnOn || canTurnOff;
  const hasSpeedControl = supportsFeature(supportedFeatures, FAN_FEATURE.SET_SPEED);
  const hasOscillationControl = supportsFeature(supportedFeatures, FAN_FEATURE.OSCILLATE);
  const hasDirectionControl = supportsFeature(supportedFeatures, FAN_FEATURE.DIRECTION);
  const hasPresetControl = supportsFeature(supportedFeatures, FAN_FEATURE.PRESET_MODE);

  const percentageValue = Number(getA(fanId, 'percentage') ?? 0);
  const boundedPercentage = Number.isFinite(percentageValue)
    ? Math.max(0, Math.min(100, Math.round(percentageValue)))
    : 0;
  const oscillating =
    entity.attributes?.oscillating === true || entity.attributes?.oscillating === 'on';
  const direction = entity.attributes?.direction || null;
  const presetMode = entity.attributes?.preset_mode || null;

  const name = customNames[fanId] || getA(fanId, 'friendly_name', fanId);
  const fanIconName = customIcons[fanId] || entity.attributes?.icon;
  const Icon = fanIconName ? getIconComponent(fanIconName) || FanIconGlyph : FanIconGlyph;

  const statusText = (() => {
    if (isUnavailable) return t('common.unknown');
    if (!isOn) return t('status.off');
    if (hasPresetControl && presetMode) return String(presetMode);
    if (hasSpeedControl) return `${boundedPercentage}%`;
    return t('status.on');
  })();

  const mobileBadgeText = (() => {
    if (isUnavailable) return t('common.unknown');
    if (!isOn) return t('status.off');
    if (oscillating) return t('fan.oscillating');
    if (hasPresetControl && presetMode) return String(presetMode);
    return t('status.on');
  })();

  const togglePower = (event) => {
    event.stopPropagation();
    if (isUnavailable || !canTogglePower) return;
    if (isOn) {
      if (!canTurnOff) return;
      callService('fan', 'turn_off', { entity_id: fanId });
      return;
    }
    if (!canTurnOn) return;
    callService('fan', 'turn_on', { entity_id: fanId });
  };

  return (
    <div
      key={fanId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(event) => {
        event.stopPropagation();
        if (!editMode) onOpen();
      }}
      className={`glass-texture touch-feedback ${isSmall ? (isMobile ? 'gap-2 p-3 pl-4' : 'gap-4 p-4 pl-5') : isDenseMobile ? 'p-5' : isMobile ? 'p-5' : 'p-7'} rounded-3xl ${isSmall ? 'flex items-center justify-between' : 'flex flex-col justify-between'} group relative h-full overflow-hidden border font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{
        ...cardStyle,
        backgroundColor: 'var(--card-bg)',
        ...(isSmall ? { containerType: 'inline-size' } : {}),
      }}
    >
      {controls}

      {isSmall ? (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              onClick={canTogglePower ? togglePower : undefined}
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-all group-hover:scale-110 ${
                isOn
                  ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)]'
                  : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
              } ${canTogglePower ? 'cursor-pointer' : 'cursor-default'}`}
              disabled={!canTogglePower}
            >
              <Icon
                className={`h-6 w-6 stroke-[1.5px] ${isOn && !disableAnimation ? 'animate-spin [animation-duration:2.4s]' : ''}`}
              />
            </button>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-70">
                {name}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none font-medium text-[var(--text-primary)]">
                  {hasSpeedControl && isOn ? `${boundedPercentage}%` : statusText}
                </span>
                {/* Dynamic Indicators for Small Card */}
                <div className="flex items-center gap-1.5 opacity-60">
                  {hasDirectionControl && direction === 'reverse' && (
                    <RotateCcw className="h-3 w-3 text-[var(--text-primary)]" />
                  )}
                  {oscillating && <MoveHorizontal className="h-3 w-3 text-[var(--text-primary)]" />}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={`flex items-start justify-between ${isDenseMobile ? 'mb-3 gap-3' : 'mb-4 gap-4'}`}>
            <button
              onClick={togglePower}
              disabled={!canTogglePower}
              className={`flex-shrink-0 transition-all group-hover:scale-110 group-hover:rotate-3 ${isOn ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'} ${isDenseMobile ? 'rounded-xl p-2.5' : 'rounded-2xl p-3'}`}
            >
              <Icon
                className={`${isDenseMobile ? 'h-4 w-4' : 'h-5 w-5'} stroke-[1.5px] ${isOn && !disableAnimation ? 'animate-spin [animation-duration:2.4s]' : ''}`}
              />
            </button>
            {isDenseMobile ? (
              <div
                className={`flex items-center rounded-full border transition-all ${isUnavailable ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-fg)]' : isOn ? 'border-[var(--accent-color)]/20 bg-[var(--accent-color)]/10 text-[var(--accent-color)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'} gap-1 px-2.5 py-1`}
              >
                <span className="text-[10px] font-bold tracking-widest uppercase">
                  {mobileBadgeText}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {hasDirectionControl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newDirection = direction === 'forward' ? 'reverse' : 'forward';
                    callService('fan', 'set_direction', {
                      entity_id: fanId,
                      direction: newDirection,
                    });
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${direction === 'reverse' ? 'border-[var(--accent-color)]/30 bg-[var(--accent-color)]/20 text-[var(--accent-color)]' : 'copy-button border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                >
                  {direction === 'reverse' ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <RotateCw className="h-4 w-4" />
                  )}
                </button>
                )}
                {hasOscillationControl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    callService('fan', 'oscillate', {
                      entity_id: fanId,
                      oscillating: !oscillating,
                    });
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${oscillating ? 'border-[var(--accent-color)]/30 bg-[var(--accent-color)]/20 text-[var(--accent-color)]' : 'copy-button border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                >
                  <MoveHorizontal className="h-4 w-4" />
                </button>
                )}
              </div>
            )}
          </div>

          <div>
            <span className={`${isDenseMobile ? 'text-3xl' : 'text-4xl'} leading-none font-thin text-[var(--text-primary)]`}>
              {hasSpeedControl ? `${boundedPercentage}%` : isOn ? 'ON' : 'OFF'}
            </span>
          </div>

          <div className={`${isDenseMobile ? 'mt-1 text-xs' : 'mt-2 text-xs'}`}>
            <div className={`flex items-center gap-2 ${isDenseMobile ? 'mb-2' : 'mb-3'}`}>
              <p
                className={`${isDenseMobile ? 'text-[10px]' : 'text-xs'} leading-none font-bold text-[var(--text-secondary)] uppercase opacity-60`}
                style={{ letterSpacing: '0.05em' }}
              >
                {name}
              </p>
            </div>

            {isDenseMobile && (hasDirectionControl || hasOscillationControl) && (
              <div className="mb-2 flex items-center gap-2 text-[var(--text-secondary)]">
                {hasDirectionControl && direction === 'reverse' && (
                  <div className="flex items-center gap-1 rounded-full bg-[var(--glass-bg)] px-2 py-1">
                    <RotateCcw className="h-3 w-3" />
                  </div>
                )}
                {hasOscillationControl && oscillating && (
                  <div className="flex items-center gap-1 rounded-full bg-[var(--glass-bg)] px-2 py-1">
                    <MoveHorizontal className="h-3 w-3" />
                  </div>
                )}
              </div>
            )}

            {hasSpeedControl && (
              <div onClick={(e) => e.stopPropagation()} className={`w-full ${isDenseMobile ? 'mb-0' : 'mb-1'}`}>
                <M3Slider
                  variant={isDenseMobile ? 'thinLg' : 'default'}
                  min={0}
                  max={100}
                  step={1}
                  value={boundedPercentage}
                  onChange={(e) => {
                    const Val = Number(e.target.value);
                    callService('fan', 'set_percentage', { entity_id: fanId, percentage: Val });
                  }}
                  colorClass="bg-[var(--accent-color)]"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default FanCard;
