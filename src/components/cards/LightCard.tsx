import { useRef, useEffect, useCallback, useState, memo } from 'react';
import { getIconComponent } from '../../icons';
import { Check, Lightbulb, RefreshCw } from '../../icons';
import M3Slider from '../ui/M3Slider';
import CardName from '../ui/CardName';
import GlideNumber from '../ui/GlideNumber';
import type { CSSProperties, Dispatch, KeyboardEvent, MouseEvent, SetStateAction } from 'react';
import { getLightColor } from '../../utils/lightColor';
import { resolveLightScenes } from '../../utils/lightScenes';
import type { useEntityHelpers } from '../../hooks/useEntityHelpers';
import type { CardBaseProps } from '../../types/dashboard';
import type { CardSettingsMap } from '../../utils/cardSettingsKey';

interface LightCardProps extends Pick<
  CardBaseProps,
  'cardId' | 'dragProps' | 'controls' | 'cardStyle' | 'isMobile' | 't'
> {
  entityId?: string;
  entities: NonNullable<CardBaseProps['entities']>;
  editMode?: boolean;
  cardSettings: CardSettingsMap;
  settingsKey: string;
  customNames: Record<string, string>;
  customIcons: Record<string, string>;
  getA: ReturnType<typeof useEntityHelpers>['getA'];
  callService: (domain: string, service: string, data?: Record<string, unknown>) => unknown;
  onOpen: () => void;
  optimisticLightBrightness: Record<string, number>;
  setOptimisticLightBrightness: Dispatch<SetStateAction<Record<string, number>>>;
}

const SLIDER_DEBOUNCE_MS = 200;
const SCENE_DONE_MS = 1500;
const formatPercent = (value: number) => `${value}%`;

type SceneStatus = 'pending' | 'done';

interface LightSceneChipsProps {
  sceneIds: string[];
  entities: LightCardProps['entities'];
  editMode?: boolean;
  callService: LightCardProps['callService'];
  label: string;
}

/** Up to three scenes as quick picks under the slider of the large card. */
function LightSceneChips({
  sceneIds,
  entities,
  editMode,
  callService,
  label,
}: LightSceneChipsProps) {
  const [status, setStatus] = useState<Record<string, SceneStatus>>({});
  const mountedRef = useRef(true);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    return () => {
      mountedRef.current = false;
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const setSceneStatus = (sceneId: string, next: SceneStatus | null) => {
    if (!mountedRef.current) return;
    setStatus((prev) => {
      const updated = { ...prev };
      if (next) updated[sceneId] = next;
      else delete updated[sceneId];
      return updated;
    });
  };

  const activate = (event: MouseEvent, sceneId: string) => {
    event.stopPropagation();
    if (editMode || status[sceneId] === 'pending') return;
    clearTimeout(timersRef.current[sceneId]);
    setSceneStatus(sceneId, 'pending');
    const done = () => {
      setSceneStatus(sceneId, 'done');
      timersRef.current[sceneId] = setTimeout(() => setSceneStatus(sceneId, null), SCENE_DONE_MS);
    };
    // The service helper shows the toast when Home Assistant is offline or the call fails.
    const failed = () => setSceneStatus(sceneId, null);
    try {
      Promise.resolve(callService('scene', 'turn_on', { entity_id: sceneId })).then(done, failed);
    } catch {
      failed();
    }
  };

  return (
    <div role="group" aria-label={label} className="relative z-30 mt-1.5 flex min-w-0 gap-1.5">
      {sceneIds.map((sceneId) => {
        const scene = entities[sceneId];
        const sceneName = String(scene?.attributes?.friendly_name || sceneId);
        const isPending = status[sceneId] === 'pending';
        const isDone = status[sceneId] === 'done';
        const isSceneUnavailable = scene?.state === 'unavailable';
        return (
          <button
            key={sceneId}
            type="button"
            title={sceneName}
            aria-busy={isPending}
            disabled={editMode || isPending || isSceneUnavailable}
            onClick={(event) => activate(event, sceneId)}
            className={`flex h-7 min-w-0 cursor-pointer items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 text-[11px] leading-none font-semibold text-[var(--text-secondary)] transition-[transform,background-color,color] duration-200 enabled:hover:bg-[var(--glass-bg-hover)] enabled:hover:text-[var(--text-primary)] enabled:active:scale-95 disabled:cursor-default motion-reduce:transition-none motion-reduce:enabled:active:scale-100 ${editMode ? 'pointer-events-none' : ''} ${isSceneUnavailable ? 'opacity-50' : ''}`}
          >
            {isPending ? (
              <RefreshCw
                aria-hidden="true"
                className="h-3 w-3 shrink-0 animate-spin motion-reduce:animate-none"
              />
            ) : isDone ? (
              <Check aria-hidden="true" className="h-3 w-3 shrink-0" />
            ) : null}
            <span className="truncate">{sceneName}</span>
          </button>
        );
      })}
    </div>
  );
}

const LightCard = ({
  cardId,
  entityId: entityIdProp,
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
}: LightCardProps) => {
  const entityId = entityIdProp || cardId;
  const entity = entities[entityId];
  const DefaultIcon = Lightbulb;
  const lightIconName = customIcons[cardId] || entity?.attributes?.icon;
  const LightIcon = lightIconName ? getIconComponent(lightIconName) || DefaultIcon : DefaultIcon;
  const state = entity?.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isOn = state === 'on';
  const br = getA(entityId, 'brightness') || 0;
  const subEntities = getA(entityId, 'entity_id', []);
  const activeCount = subEntities.filter((id: string) => entities[id]?.state === 'on').length;
  const totalCount = subEntities.length;
  const name = customNames[cardId] || getA(entityId, 'friendly_name');

  // Determine if light supports dimming
  const supportedColorModes = entity?.attributes?.supported_color_modes;
  const isDimmable = supportedColorModes
    ? !supportedColorModes.includes('onoff') || supportedColorModes.length > 1
    : ((entity?.attributes?.supported_features ?? 0) & 1) === 1;

  const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
  const isSmall = sizeSetting === 'small';
  const isDenseMobile = isMobile && !isSmall;
  const useLightColor = (cardSettings[settingsKey] || cardSettings[cardId])?.useLightColor === true;
  const lightColor = useLightColor ? getLightColor(entity) : null;
  const lightCardStyle: CSSProperties = lightColor
    ? {
        ...cardStyle,
        ...{
          '--light-color': lightColor,
          '--light-slider-color':
            'color-mix(in srgb, var(--light-color) 45%, var(--text-secondary))',
        },
      }
    : cardStyle;
  const lightIconStyle: CSSProperties | undefined = lightColor
    ? {
        backgroundColor: 'color-mix(in srgb, var(--light-color) 12%, var(--glass-bg))',
        color: 'color-mix(in srgb, var(--light-color) 50%, var(--text-primary))',
      }
    : undefined;
  const sliderColorClass = lightColor ? 'bg-[var(--light-slider-color)]' : 'bg-amber-500';
  const brightnessPct = Math.round(((optimisticLightBrightness[cardId] ?? br) / 255) * 100);
  const sceneIds = isSmall
    ? []
    : resolveLightScenes((cardSettings[settingsKey] || cardSettings[cardId])?.lightScenes).filter(
        (sceneId) => entities[sceneId]
      );
  const hasScenes = sceneIds.length > 0;
  // With scenes on a phone, the brightness moves next to the slider to make room for the chips.
  const showInlineValue = isDenseMobile && hasScenes;
  const inlineValueIsNumber = !isUnavailable && isOn && isDimmable;
  // While the slider is being dragged the number follows the finger; other changes glide.
  const glideDuration = optimisticLightBrightness[cardId] !== undefined ? 0 : undefined;
  const inlineValue = isUnavailable ? (
    '--'
  ) : inlineValueIsNumber ? (
    <GlideNumber value={brightnessPct} format={formatPercent} duration={glideDuration} />
  ) : isOn ? (
    t('common.on')
  ) : (
    t('common.off')
  );
  const inlineValueClass = `shrink-0 leading-none whitespace-nowrap ${isDimmable ? 'min-w-10 text-right' : 'text-left'} ${inlineValueIsNumber ? 'text-sm font-semibold text-[var(--text-primary)] tabular-nums' : 'text-[11px] font-bold tracking-widest text-[var(--text-secondary)] uppercase'}`;

  // Debounced brightness service call
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(debounceRef.current ?? undefined), []);

  const handleBrightnessChange = useCallback(
    (e: { target: { value: string } }) => {
      const val = parseInt(e.target.value);
      setOptimisticLightBrightness((prev) => ({ ...prev, [cardId]: val }));
      clearTimeout(debounceRef.current ?? undefined);
      debounceRef.current = setTimeout(() => {
        callService('light', 'turn_on', { entity_id: entityId, brightness: val });
      }, SLIDER_DEBOUNCE_MS);
    },
    [cardId, entityId, callService, setOptimisticLightBrightness]
  );

  const handleToggleLight = useCallback(
    (event: MouseEvent | KeyboardEvent) => {
      event.stopPropagation();
      if (isUnavailable) return;
      clearTimeout(debounceRef.current ?? undefined);
      debounceRef.current = null;
      callService('light', 'toggle', { entity_id: entityId });
    },
    [entityId, callService, isUnavailable]
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
        className={`touch-feedback group @container relative flex h-full items-center gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'} ${isUnavailable ? 'opacity-70' : ''}`}
        style={lightCardStyle}
      >
        {controls}

        <button
          onClick={handleToggleLight}
          style={lightIconStyle}
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-500 ${isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)]'}`}
          disabled={isUnavailable}
          aria-label={`${name || t('common.light')}: ${isOn ? t('common.off') : t('common.on')}`}
        >
          <LightIcon
            className={`h-6 w-6 stroke-[1.5px] ${isOn && !lightColor ? 'fill-amber-400/20' : ''} transition-transform duration-300 group-hover:scale-110`}
          />
        </button>

        {/* On a narrow card the value moves up beside the name so the slider keeps its length. */}
        <div className="grid h-full min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] content-center items-center gap-x-3 gap-y-3 pt-1">
          <div
            className={`col-start-1 row-start-1 flex min-w-0 items-baseline justify-between pr-1 ${isDimmable ? 'col-span-2 @max-[220px]:col-span-1' : 'col-span-2'}`}
          >
            <CardName
              lines={1}
              className="text-xs leading-none font-bold tracking-wide text-[var(--text-secondary)] uppercase opacity-60"
            >
              {String(name || t('common.light'))}
            </CardName>
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
          {isDimmable && (
            <div className="col-start-1 row-start-2 flex h-6 min-w-0 items-center @max-[220px]:col-span-2">
              <M3Slider
                variant="thinLg"
                min={0}
                max={255}
                step={1}
                value={optimisticLightBrightness[cardId] ?? br}
                disabled={isUnavailable}
                onChange={handleBrightnessChange}
                colorClass={sliderColorClass}
                ariaLabel={t('light.brightness')}
              />
            </div>
          )}
          <span
            className={`${inlineValueClass} ${isDimmable ? 'col-start-2 row-start-2 @max-[220px]:row-start-1' : 'col-span-2 col-start-1 row-start-2 flex h-6 items-center'}`}
          >
            {inlineValue}
          </span>
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
      style={lightCardStyle}
    >
      {controls}
      <div className="flex items-start justify-between">
        <button
          onClick={handleToggleLight}
          style={lightIconStyle}
          className={`transition-all duration-500 ${isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'} ${isDenseMobile ? 'rounded-xl p-2.5' : 'rounded-2xl p-3'}`}
          disabled={isUnavailable}
          aria-label={`${name || t('common.light')}: ${isOn ? t('common.off') : t('common.on')}`}
        >
          <LightIcon
            className={`${isDenseMobile ? 'h-4 w-4' : 'h-5 w-5'} stroke-[1.5px] ${isOn && !lightColor ? 'fill-amber-400/20' : ''} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
          />
        </button>
        <div
          style={
            lightColor
              ? {
                  backgroundColor: 'color-mix(in srgb, var(--light-color) 5%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--light-color) 12%, var(--glass-border))',
                  color: 'var(--text-secondary)',
                }
              : undefined
          }
          className={`flex items-center rounded-full border transition-all ${isUnavailable ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-fg)]' : isOn ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'} ${isDenseMobile ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3 py-1'}`}
        >
          <span
            className={`${isDenseMobile ? 'text-[10px]' : 'text-xs'} font-bold tracking-widest uppercase`}
          >
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
        {(!isDenseMobile || hasScenes) && (
          <CardName
            lines={hasScenes ? 1 : 2}
            className={`mb-0.5 text-[10px] font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase opacity-60 ${hasScenes ? 'leading-none' : 'leading-tight'}`}
          >
            {String(name || t('common.light'))}
          </CardName>
        )}
        {!showInlineValue && (
          <div
            className={`flex items-baseline gap-1 leading-none ${isDenseMobile ? 'mt-0.5' : 'mt-1'}`}
          >
            {isDimmable ? (
              <>
                <span
                  className={`${isDenseMobile || hasScenes ? 'text-3xl' : 'text-4xl'} leading-none font-thin text-[var(--text-primary)]`}
                >
                  {isUnavailable ? (
                    '--'
                  ) : (
                    <GlideNumber value={isOn ? brightnessPct : 0} duration={glideDuration} />
                  )}
                </span>
                <span
                  className={`${isDenseMobile ? 'text-lg' : hasScenes ? 'ml-1 text-lg' : 'ml-1 text-xl'} font-light text-[var(--text-muted)]`}
                >
                  %
                </span>
              </>
            ) : (
              /* Layout: maintain 4xl height but show nothing unless UNAVAILABLE */
              <span
                className={`${isDenseMobile || hasScenes ? 'text-3xl' : 'text-4xl'} leading-none font-thin text-transparent select-none`}
              >
                {isUnavailable ? <span className="text-[var(--text-primary)]">--</span> : '0'}
              </span>
            )}
          </div>
        )}
        {isDenseMobile && !hasScenes && (
          <CardName className="mt-3 mb-1 text-[10px] leading-tight font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase opacity-60">
            {String(name || t('common.light'))}
          </CardName>
        )}
        {/* Helper to keep layout consistent. For non-dimmable, we keep the empty space where slider would be. */}
        {(isDimmable || !hasScenes || showInlineValue) && (
          <div
            className={`flex w-full items-center ${
              showInlineValue
                ? 'mt-2 h-6 gap-3'
                : hasScenes
                  ? 'mt-1'
                  : `${isDenseMobile ? 'mt-2' : 'mt-3'} ${isDimmable ? '' : isDenseMobile ? 'h-8' : 'h-12'}`
            }`}
          >
            {isDimmable && (
              <div className="min-w-0 flex-1">
                <M3Slider
                  variant={isDenseMobile || hasScenes ? 'thinLg' : 'default'}
                  min={0}
                  max={255}
                  step={1}
                  value={optimisticLightBrightness[cardId] ?? br}
                  disabled={isUnavailable}
                  onChange={handleBrightnessChange}
                  colorClass={sliderColorClass}
                  ariaLabel={t('light.brightness')}
                />
              </div>
            )}
            {showInlineValue && <span className={inlineValueClass}>{inlineValue}</span>}
          </div>
        )}
        {hasScenes && (
          <LightSceneChips
            sceneIds={sceneIds}
            entities={entities}
            editMode={editMode}
            callService={callService}
            label={t('light.scenes')}
          />
        )}
      </div>
    </div>
  );
};

export default memo(LightCard);
