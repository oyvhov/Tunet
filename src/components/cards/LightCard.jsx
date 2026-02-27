import { useRef, useEffect, useCallback } from 'react';
import { getIconComponent } from '../../icons';
import { Lightbulb } from '../../icons';
import M3Slider from '../ui/M3Slider';

const SLIDER_DEBOUNCE_MS = 200;

const LightCard = ({
  cardId,
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
  optimisticLightBrightness,
  setOptimisticLightBrightness,
  t,
}) => {
  const entity = entities[cardId];
  const DefaultIcon = Lightbulb;
  const lightIconName = customIcons[cardId] || entity?.attributes?.icon;
  const LightIcon = lightIconName ? getIconComponent(lightIconName) || DefaultIcon : DefaultIcon;
  const state = entity?.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOn = state === 'on';
  const br = getA(cardId, 'brightness') || 0;
  const subEntities = getA(cardId, 'entity_id', []);
  const activeCount = subEntities.filter((id) => entities[id]?.state === 'on').length;
  const totalCount = subEntities.length;
  const name = customNames[cardId] || getA(cardId, 'friendly_name');

  // Determine if light supports dimming
  const supportedColorModes = entity?.attributes?.supported_color_modes;
  const isDimmable = supportedColorModes
    ? !supportedColorModes.includes('onoff') || supportedColorModes.length > 1
    : (entity?.attributes?.supported_features & 1) === 1;

  const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
  const isSmall = sizeSetting === 'small';

  // Debounced brightness service call
  const debounceRef = useRef(null);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleBrightnessChange = useCallback(
    (e) => {
      const val = parseInt(e.target.value);
      setOptimisticLightBrightness((prev) => ({ ...prev, [cardId]: val }));
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        callService('light', 'turn_on', { entity_id: cardId, brightness: val });
      }, SLIDER_DEBOUNCE_MS);
    },
    [cardId, callService, setOptimisticLightBrightness]
  );

  const handleToggleLight = useCallback(
    (event) => {
      event.stopPropagation();
      if (isUnavailable) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      callService('light', 'toggle', { entity_id: cardId });
    },
    [cardId, callService, isUnavailable]
  );

  if (isSmall) {
    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode) onOpen();
        }}
        className={`touch-feedback group relative flex h-full items-center gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={cardStyle}
      >
        {controls}

        <button
          onClick={handleToggleLight}
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-500 ${isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)]'}`}
          disabled={isUnavailable}
          aria-label={`${name || t('common.light')}: ${isOn ? t('common.off') : t('common.on')}`}
        >
          <LightIcon
            className={`h-6 w-6 stroke-[1.5px] ${isOn ? 'fill-amber-400/20' : ''} transition-transform duration-300 group-hover:scale-110`}
          />
        </button>

        <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-3 pt-1">
          <div className="flex items-baseline justify-between pr-1">
            <p className="truncate text-xs leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
              {String(name || t('common.light'))}
            </p>
            <span
              className={`text-lg leading-none font-medium tracking-wide transition-colors ${
                isUnavailable
                  ? 'text-red-500'
                  : isOn
                    ? 'text-amber-400'
                    : 'text-[var(--text-secondary)] opacity-50'
              }`}
              aria-label={isUnavailable ? t('status.unavailable') : undefined}
              title={isUnavailable ? t('status.unavailable') : undefined}
            >
              {isUnavailable
                ? '⚠'
                : isOn
                  ? isDimmable
                    ? `${Math.round(((optimisticLightBrightness[cardId] ?? br) / 255) * 100)}%`
                    : t('common.on')
                  : t('common.off')}
            </span>
          </div>
          <div className={`flex w-full items-center ${isDimmable ? 'h-6' : 'h-6'}`}>
            {isDimmable && (
              <M3Slider
                variant="thinLg"
                min={0}
                max={255}
                step={1}
                value={optimisticLightBrightness[cardId] ?? br}
                disabled={isUnavailable}
                onChange={handleBrightnessChange}
                colorClass="bg-amber-500"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) onOpen();
      }}
      className={`touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-7 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={cardStyle}
    >
      {controls}
      <div className="flex items-start justify-between">
        <button
          onClick={handleToggleLight}
          className={`rounded-2xl p-3 transition-all duration-500 ${isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'}`}
          disabled={isUnavailable}
        >
          <LightIcon
            className={`h-5 w-5 stroke-[1.5px] ${isOn ? 'fill-amber-400/20' : ''} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
          />
        </button>
        <div
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 transition-all ${isUnavailable ? 'border-red-500/20 bg-red-500/10 text-red-500' : isOn ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
        >
          <span className="text-xs font-bold tracking-widest uppercase">
            {isUnavailable
              ? t('status.unavailable')
              : totalCount > 0
                ? activeCount > 0
                  ? `${activeCount}/${totalCount}`
                  : t('common.off')
                : isOn
                  ? t('common.on')
                  : t('common.off')}
          </span>
        </div>
      </div>
      <div className="mt-2 font-sans">
        <p className="mb-0.5 text-[10px] leading-none font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase opacity-60">
          {String(name || t('common.light'))}
        </p>
        <div className="mt-1 flex items-baseline gap-1 leading-none">
          {isDimmable ? (
            <>
              <span className="text-4xl leading-none font-thin text-[var(--text-primary)]">
                {isUnavailable
                  ? '--'
                  : isOn
                    ? Math.round(((optimisticLightBrightness[cardId] ?? br) / 255) * 100)
                    : '0'}
              </span>
              <span className="ml-1 text-xl font-light text-[var(--text-muted)]">%</span>
            </>
          ) : (
            /* Layout: maintain 4xl height but show nothing unless UNAVAILABLE */
            <span className="text-4xl leading-none font-thin text-transparent select-none">
              {isUnavailable ? <span className="text-[var(--text-primary)]">--</span> : '0'}
            </span>
          )}
        </div>
        {/* Helper to keep layout consistent. For non-dimmable, we keep the empty space where slider would be. */}
        <div className={`mt-3 flex w-full items-center ${isDimmable ? '' : 'h-12'}`}>
          {isDimmable && (
            <M3Slider
              min={0}
              max={255}
              step={1}
              value={optimisticLightBrightness[cardId] ?? br}
              disabled={isUnavailable}
              onChange={handleBrightnessChange}
              colorClass="bg-amber-500"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LightCard;
