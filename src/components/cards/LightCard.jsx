import { useRef, useEffect, useCallback, memo } from 'react';
import { getIconComponent } from '../../icons';
import { Lightbulb } from '../../icons';
import M3Slider from '../ui/M3Slider';

const SLIDER_DEBOUNCE_MS = 200;

/** @param {any} props */
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
  isMobile,
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
  const isDenseMobile = isMobile && !isSmall;

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
        onKeyDown={(e) => {
          if (editMode) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onOpen();
          }
        }}
        role={editMode ? undefined : 'button'}
        tabIndex={editMode ? -1 : 0}
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
            <p className="truncate text-xs leading-none font-bold tracking-wide text-[var(--text-secondary)] uppercase opacity-60">
              {String(name || t('common.light'))}
            </p>
            {isUnavailable && (
              <span
                className="text-lg leading-none font-medium text-[var(--status-error-fg)]"
                aria-label={t('status.unavailable')}
                title={t('status.unavailable')}
              >
                ⚠
              </span>
            )}
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
                ariaLabel={t('light.brightness')}
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
      onKeyDown={(e) => {
        if (editMode) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onOpen();
        }
      }}
      role={editMode ? undefined : 'button'}
      tabIndex={editMode ? -1 : 0}
      className={`touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border font-sans transition-all duration-500 ${isDenseMobile ? 'p-5' : 'p-7'} ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
      style={cardStyle}
    >
      {controls}
      <div className="flex items-start justify-between">
        <button
          onClick={handleToggleLight}
          className={`transition-all duration-500 ${isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'} ${isDenseMobile ? 'rounded-xl p-2.5' : 'rounded-2xl p-3'}`}
          disabled={isUnavailable}
          aria-label={`${name || t('common.light')}: ${isOn ? t('common.off') : t('common.on')}`}
        >
          <LightIcon
            className={`${isDenseMobile ? 'h-4 w-4' : 'h-5 w-5'} stroke-[1.5px] ${isOn ? 'fill-amber-400/20' : ''} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
          />
        </button>
        <div
          className={`flex items-center rounded-full border transition-all ${isUnavailable ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-fg)]' : isOn ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'} ${isDenseMobile ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3 py-1'}`}
        >
          <span className={`${isDenseMobile ? 'text-[10px]' : 'text-xs'} font-bold tracking-widest uppercase`}>
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
      <div className={`${isDenseMobile ? 'mt-1' : 'mt-2'} font-sans`}>
        {!isDenseMobile && (
          <p className="mb-0.5 text-[10px] leading-none font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase opacity-60">
            {String(name || t('common.light'))}
          </p>
        )}
        <div className={`flex items-baseline gap-1 leading-none ${isDenseMobile ? 'mt-0.5' : 'mt-1'}`}>
          {isDimmable ? (
            <>
              <span
                className={`${isDenseMobile ? 'text-3xl' : 'text-4xl'} leading-none font-thin text-[var(--text-primary)]`}
              >
                {isUnavailable
                  ? '--'
                  : isOn
                    ? Math.round(((optimisticLightBrightness[cardId] ?? br) / 255) * 100)
                    : '0'}
              </span>
              <span className={`${isDenseMobile ? 'text-lg' : 'ml-1 text-xl'} font-light text-[var(--text-muted)]`}>
                %
              </span>
            </>
          ) : (
            /* Layout: maintain 4xl height but show nothing unless UNAVAILABLE */
            <span
              className={`${isDenseMobile ? 'text-3xl' : 'text-4xl'} leading-none font-thin text-transparent select-none`}
            >
              {isUnavailable ? <span className="text-[var(--text-primary)]">--</span> : '0'}
            </span>
          )}
        </div>
        {isDenseMobile && (
          <p className="mt-3 mb-1 text-[10px] leading-none font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase opacity-60">
            {String(name || t('common.light'))}
          </p>
        )}
        {/* Helper to keep layout consistent. For non-dimmable, we keep the empty space where slider would be. */}
        <div className={`flex w-full items-center ${isDenseMobile ? 'mt-2' : 'mt-3'} ${isDimmable ? '' : isDenseMobile ? 'h-8' : 'h-12'}`}>
          {isDimmable && (
            <M3Slider
              variant={isDenseMobile ? 'thinLg' : 'default'}
              min={0}
              max={255}
              step={1}
              value={optimisticLightBrightness[cardId] ?? br}
              disabled={isUnavailable}
              onChange={handleBrightnessChange}
              colorClass="bg-amber-500"
              ariaLabel={t('light.brightness')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(LightCard);
