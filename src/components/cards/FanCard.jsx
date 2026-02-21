import { useMemo } from 'react';
import { AlertTriangle, Fan as FanIconGlyph, MoveHorizontal, RotateCcw, RotateCw } from '../../icons';
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

export default function FanCard({
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
          className="touch-feedback relative rounded-3xl overflow-hidden bg-[var(--card-bg)] border border-dashed border-red-500/50 flex flex-col items-center justify-center p-4 h-full"
          style={cardStyle}
        >
          {controls}
          <AlertTriangle className="w-8 h-8 text-red-500 mb-2 opacity-80" />
          <p className="text-xs font-bold text-red-500 text-center uppercase tracking-widest">{t('common.missing')}</p>
          <p className="text-[10px] text-red-400/70 text-center mt-1 font-mono break-all line-clamp-2">{fanId}</p>
        </div>
      );
    }
    return null;
  }

  const settings = cardSettings[settingsKey] || cardSettings[fanId] || {};
  const isSmall = settings.size === 'small';
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
  const boundedPercentage = Number.isFinite(percentageValue) ? Math.max(0, Math.min(100, Math.round(percentageValue))) : 0;
  const oscillating = entity.attributes?.oscillating === true || entity.attributes?.oscillating === 'on';
  const direction = entity.attributes?.direction || null;
  const presetMode = entity.attributes?.preset_mode || null;

  const name = customNames[fanId] || getA(fanId, 'friendly_name', fanId);
  const fanIconName = customIcons[fanId] || entity.attributes?.icon;
  const Icon = fanIconName ? (getIconComponent(fanIconName) || FanIconGlyph) : FanIconGlyph;

  const statusText = useMemo(() => {
    if (isUnavailable) return t('common.unknown');
    if (!isOn) return t('status.off');
    if (hasPresetControl && presetMode) return String(presetMode);
    if (hasSpeedControl) return `${boundedPercentage}%`;
    return t('status.on');
  }, [isUnavailable, isOn, presetMode, boundedPercentage, t]);

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
      className={`touch-feedback ${isSmall ? (isMobile ? 'p-3 pl-4 gap-2' : 'p-4 pl-5 gap-4') : (isMobile ? 'p-5' : 'p-7')} rounded-3xl ${isSmall ? 'flex items-center justify-between' : 'flex flex-col justify-between'} transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={{
        ...cardStyle,
        backgroundColor: 'var(--card-bg)',
        ...(isSmall ? { containerType: 'inline-size' } : {})
      }}
    >
      {controls}

      {isSmall ? (
        <>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={canTogglePower ? togglePower : undefined}
              className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center transition-all ${
                isOn 
                  ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)]' 
                  : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
              } ${canTogglePower ? 'cursor-pointer' : 'cursor-default'}`}
              disabled={!canTogglePower}
            >
              <Icon className={`w-6 h-6 stroke-[1.5px] ${isOn && !disableAnimation ? 'animate-spin [animation-duration:2.4s]' : ''}`} />
            </button>
            <div className="flex flex-col min-w-0 gap-0.5">
              <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-70 truncate">{name}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--text-primary)] leading-none">{hasSpeedControl && isOn ? `${boundedPercentage}%` : statusText}</span>
                {/* Dynamic Indicators for Small Card */}
                <div className="flex items-center gap-1.5 opacity-60">
                  {hasDirectionControl && direction === 'reverse' && <RotateCcw className="w-3 h-3 text-[var(--text-primary)]" />}
                  {oscillating && <MoveHorizontal className="w-3 h-3 text-[var(--text-primary)]" />}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-start gap-4 mb-4">
            <button
              onClick={togglePower}
              disabled={!canTogglePower}
              className={`p-3 rounded-2xl transition-all flex-shrink-0 ${isOn ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
              <Icon className={`w-5 h-5 stroke-[1.5px] ${isOn && !disableAnimation ? 'animate-spin [animation-duration:2.4s]' : ''}`} />
            </button>
            <div className="flex items-center gap-2">
              {hasDirectionControl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newDirection = direction === 'forward' ? 'reverse' : 'forward';
                    callService('fan', 'set_direction', { entity_id: fanId, direction: newDirection });
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${direction === 'reverse' ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)] border-[var(--accent-color)]/30' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] copy-button'}`}
                >
                  {direction === 'reverse' ? <RotateCcw className="w-4 h-4" /> : <RotateCw className="w-4 h-4" />}
                </button>
              )}
              {hasOscillationControl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    callService('fan', 'oscillate', { entity_id: fanId, oscillating: !oscillating });
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${oscillating ? 'bg-[var(--accent-color)]/20 text-[var(--accent-color)] border-[var(--accent-color)]/30' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] copy-button'}`}
                >
                  <MoveHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-4xl font-medium text-[var(--text-primary)] leading-none">{hasSpeedControl ? `${boundedPercentage}%` : (isOn ? 'ON' : 'OFF')}</span>
          </div>

          <div className="mt-2 text-xs">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[var(--text-secondary)] text-xs uppercase font-bold opacity-60 leading-none" style={{ letterSpacing: '0.05em' }}>
                {name}
              </p>
            </div>

            {hasSpeedControl && (
               <div onClick={(e) => e.stopPropagation()} className="w-full mb-1">
                 <M3Slider
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
}
