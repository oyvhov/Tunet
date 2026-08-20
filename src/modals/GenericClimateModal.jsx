import {
  AirVent,
  ArrowUpDown,
  Droplets,
  Fan,
  Flame,
  Minus,
  Plus,
  Power,
  Snowflake,
  X,
} from '../icons';
import M3Slider from '../components/ui/M3Slider';
import ModernDropdown from '../components/ui/ModernDropdown';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import {
  formatKindValueForDisplay,
  getEffectiveUnitMode,
  resolveClimateFavoriteModes,
} from '../utils';

const getDisplayName = (entity, fallback) => entity?.attributes?.friendly_name || fallback;

export default function GenericClimateModal({
  entityId,
  entity,
  onClose,
  callService,
  hvacMap,
  fanMap,
  swingMap,
  settings,
  t,
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();

  if (!entityId || !entity) return null;

  const hvacAction = entity.attributes?.hvac_action || 'idle';
  const isCooling = hvacAction === 'cooling';
  const isHeating = hvacAction === 'heating';
  const clTheme = isCooling ? 'blue' : isHeating ? 'orange' : 'gray';
  const currentTemp = entity.attributes?.current_temperature;
  const targetTemp = entity.attributes?.temperature;
  const sourceTempUnit =
    haConfig?.unit_system?.temperature || entity.attributes?.temperature_unit || '°C';
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const displayCurrentTemp = formatKindValueForDisplay(currentTemp, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
    includeUnit: false,
  });
  const displayTargetTemp = formatKindValueForDisplay(targetTemp, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
    includeUnit: false,
  });
  const displayTempUnit = displayTargetTemp.unit || displayCurrentTemp.unit;
  const minTemp = entity.attributes?.min_temp ?? 16;
  const maxTemp = entity.attributes?.max_temp ?? 30;

  const hvacModes = entity.attributes?.hvac_modes || [];
  const fanModes = entity.attributes?.fan_modes || [];
  const swingModes = entity.attributes?.swing_modes || [];

  const showTemp = typeof targetTemp === 'number' || typeof currentTemp === 'number';
  const showHvac = Array.isArray(hvacModes) && hvacModes.length > 0;
  const showFan = Array.isArray(fanModes) && fanModes.length > 0;
  const showSwing = Array.isArray(swingModes) && swingModes.length > 0;
  const favoriteModes = resolveClimateFavoriteModes(settings?.climateFavoriteModes, hvacModes);
  const modalTitleId = `climate-modal-title-${entityId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const tempValue = typeof targetTemp === 'number' ? targetTemp : 21;

  return (
    <AccessibleModalShell
      open={!!entityId && !!entity}
      onClose={onClose}
      titleId={modalTitleId}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      panelClassName="popup-anim relative max-h-[calc(100dvh-1rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border p-4 font-sans backdrop-blur-xl sm:max-h-[90vh] sm:p-6 md:rounded-[3rem] md:p-12"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
          <button
            onClick={onClose}
            className="modal-close absolute top-4 right-4 sm:top-6 sm:right-6 md:top-10 md:right-10"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mb-4 flex items-center gap-3 pr-12 font-sans sm:mb-6 sm:gap-4 sm:pr-0">
            <div
              className="rounded-2xl p-3 transition-all duration-500 sm:p-4"
              style={{
                backgroundColor:
                  clTheme === 'blue'
                    ? 'rgba(59, 130, 246, 0.1)'
                    : clTheme === 'orange'
                      ? 'rgba(249, 115, 22, 0.1)'
                      : 'var(--glass-bg)',
                color:
                  clTheme === 'blue'
                    ? '#60a5fa'
                    : clTheme === 'orange'
                      ? '#fb923c'
                      : 'var(--text-secondary)',
              }}
            >
              {isCooling ? (
                <Snowflake className="h-6 w-6 sm:h-8 sm:w-8" />
              ) : (
                <AirVent className="h-6 w-6 sm:h-8 sm:w-8" />
              )}
            </div>
            <div>
              <h3
                id={modalTitleId}
                className="text-xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic sm:text-2xl"
              >
                {getDisplayName(entity, t('climate.title'))}
              </h3>
              <div
                className="mt-2 inline-block rounded-full border px-3 py-1 transition-all duration-500"
                style={{
                  backgroundColor:
                    clTheme === 'blue'
                      ? 'rgba(59, 130, 246, 0.2)'
                      : clTheme === 'orange'
                        ? 'rgba(249, 115, 22, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                  borderColor:
                    clTheme === 'blue'
                      ? 'rgba(59, 130, 246, 0.3)'
                      : clTheme === 'orange'
                        ? 'rgba(249, 115, 22, 0.2)'
                        : 'rgba(255, 255, 255, 0.1)',
                  color:
                    clTheme === 'blue'
                      ? '#3b82f6'
                      : clTheme === 'orange'
                        ? '#fb923c'
                        : 'var(--text-secondary)',
                }}
              >
                <p className="text-[10px] font-bold tracking-widest uppercase italic">
                  {t('climate.action.' + hvacAction)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 font-sans sm:gap-12 lg:grid-cols-5">
            {showTemp && (
              <div className="popup-surface space-y-4 rounded-3xl p-4 sm:space-y-10 sm:p-6 md:p-10 lg:col-span-3">
                <div className="text-center font-sans">
                  <div className="mb-3 flex items-center justify-between italic sm:mb-6 sm:px-4">
                    <p
                      className="text-xs font-bold text-[var(--text-muted)] uppercase"
                      style={{ letterSpacing: '0.5em' }}
                    >
                      {t('climate.indoorTemp')}
                    </p>
                    <span
                      className="text-xs font-bold uppercase"
                      style={{
                        letterSpacing: '0.3em',
                        color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : '#9ca3af',
                      }}
                    >
                      {displayCurrentTemp.value === '--'
                        ? '--'
                        : `${displayCurrentTemp.value}${displayTempUnit}`}
                    </span>
                  </div>
                  <div className="mb-4 flex items-center justify-center gap-2 sm:mb-10 sm:gap-4">
                    <span
                      className="text-5xl leading-none font-light tracking-tighter text-[var(--text-primary)] italic select-none sm:text-6xl md:text-9xl"
                      style={{
                        textShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        color: isHeating
                          ? '#fef2f2'
                          : isCooling
                            ? '#f0f9ff'
                            : 'var(--text-primary)',
                      }}
                    >
                      {displayTargetTemp.value}
                    </span>
                    <span className="mt-6 text-3xl leading-none font-medium text-[var(--text-muted)] italic sm:mt-10 sm:text-5xl">
                      {displayTempUnit}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-8 sm:px-4">
                    <button
                      onClick={() =>
                        callService('climate', 'set_temperature', {
                          entity_id: entityId,
                          temperature: tempValue - 0.5,
                        })
                      }
                      className="rounded-full border p-3 shadow-lg transition-all active:scale-90 sm:p-6"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        borderColor: 'var(--glass-border)',
                      }}
                    >
                      <Minus className="h-5 w-5 sm:h-8 sm:w-8" style={{ strokeWidth: 3 }} />
                    </button>
                    <div className="flex-grow font-sans">
                      <M3Slider
                        min={minTemp}
                        max={maxTemp}
                        step={0.5}
                        value={tempValue}
                        onChange={(e) =>
                          callService('climate', 'set_temperature', {
                            entity_id: entityId,
                            temperature: parseFloat(e.target.value),
                          })
                        }
                        colorClass={
                          isCooling
                            ? 'bg-[var(--accent-color)]'
                            : isHeating
                              ? 'bg-orange-500'
                              : 'bg-white/20'
                        }
                      />
                    </div>
                    <button
                      onClick={() =>
                        callService('climate', 'set_temperature', {
                          entity_id: entityId,
                          temperature: tempValue + 0.5,
                        })
                      }
                      className="rounded-full border p-3 shadow-lg transition-all active:scale-90 sm:p-6"
                      style={{
                        backgroundColor: 'var(--glass-bg)',
                        borderColor: 'var(--glass-border)',
                      }}
                    >
                      <Plus className="h-5 w-5 sm:h-8 sm:w-8" style={{ strokeWidth: 3 }} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(showHvac || showFan || showSwing) && (
              <div className="space-y-4 font-sans italic sm:space-y-10 sm:py-4 lg:col-span-2">
                {showHvac && (
                  <div className="space-y-4">
                    {favoriteModes.length > 0 && (
                      <div className="space-y-3">
                        <p
                          className="ml-1 text-xs font-bold uppercase"
                          style={{ color: 'var(--text-muted)', letterSpacing: '0.2em' }}
                        >
                          {t('climate.shortcuts')}
                        </p>
                        <div className="popup-surface grid grid-cols-2 gap-1.5 rounded-2xl p-1.5">
                          {favoriteModes.map((mode) => {
                            const active = entity.state === mode;
                            const label = hvacMap?.[mode] || mode;
                            const ModeIcon =
                              mode === 'off'
                                ? Power
                                : mode === 'heat'
                                  ? Flame
                                  : mode === 'cool'
                                    ? Snowflake
                                    : mode === 'fan_only'
                                      ? Fan
                                      : mode === 'dry'
                                        ? Droplets
                                        : AirVent;

                            return (
                              <button
                                key={mode}
                                type="button"
                                aria-pressed={active}
                                aria-label={`${t('climate.shortcuts')}: ${label}`}
                                onClick={() =>
                                  callService('climate', 'set_hvac_mode', {
                                    entity_id: entityId,
                                    hvac_mode: mode,
                                  })
                                }
                                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold tracking-widest uppercase transition-all active:scale-[0.97] ${active ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)] shadow-sm' : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]'}`}
                              >
                                <ModeIcon
                                  className={`h-4 w-4 shrink-0 ${active ? 'opacity-90' : 'opacity-55'}`}
                                />
                                <span className="truncate">{label}</span>
                                <span
                                  aria-hidden="true"
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full bg-current transition-opacity ${active ? 'opacity-60' : 'opacity-0'}`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <ModernDropdown
                      label={favoriteModes.length > 0 ? t('climate.allModes') : t('climate.mode')}
                      icon={Flame}
                      options={hvacModes}
                      current={entity.state}
                      onChange={(m) =>
                        callService('climate', 'set_hvac_mode', {
                          entity_id: entityId,
                          hvac_mode: m,
                        })
                      }
                      map={hvacMap}
                      placeholder={t('dropdown.noneSelected')}
                    />
                  </div>
                )}
                {showFan && (
                  <ModernDropdown
                    label={t('climate.fanSpeed')}
                    icon={Fan}
                    options={fanModes}
                    current={entity.attributes?.fan_mode}
                    onChange={(m) =>
                      callService('climate', 'set_fan_mode', { entity_id: entityId, fan_mode: m })
                    }
                    map={fanMap}
                    placeholder={t('dropdown.noneSelected')}
                  />
                )}
                {showSwing && (
                  <ModernDropdown
                    label={t('climate.swing')}
                    icon={ArrowUpDown}
                    options={swingModes}
                    current={entity.attributes?.swing_mode}
                    onChange={(m) =>
                      callService('climate', 'set_swing_mode', {
                        entity_id: entityId,
                        swing_mode: m,
                      })
                    }
                    map={swingMap}
                    placeholder={t('dropdown.noneSelected')}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </AccessibleModalShell>
  );
}
