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
} from '../icons';
import M3Slider from '../components/ui/M3Slider';
import ModernDropdown from '../components/ui/ModernDropdown';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import { getClimateStatus } from '../utils/climateStatus';
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

  const { isCooling, isHeating, translationKey } = getClimateStatus(entity);
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
  const showControls = showHvac || showFan || showSwing;
  const favoriteModes = resolveClimateFavoriteModes(settings?.climateFavoriteModes, hvacModes);
  const modalTitleId = `climate-modal-title-${entityId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const tempValue = typeof targetTemp === 'number' ? targetTemp : 21;
  const twoColumns = showTemp && showControls;

  return (
    <AccessibleModalShell
      open={!!entityId && !!entity}
      onClose={onClose}
      titleId={modalTitleId}
      size={twoColumns ? 'l' : 'm'}
    >
      {() => (
        <>
          <ModalHeader
            title={getDisplayName(entity, t('climate.title'))}
            closeLabel={t('common.close')}
            onClose={onClose}
            icon={isCooling ? <Snowflake /> : <AirVent />}
            iconClassName={
              isCooling
                ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                : isHeating
                  ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]'
                  : ''
            }
            status={
              <StatusChip
                tone={isCooling ? 'accent' : isHeating ? 'warn' : 'neutral'}
                label={t(translationKey)}
              />
            }
          />

          <ModalBody className={twoColumns ? 'grid items-start gap-6 lg:grid-cols-5' : ''}>
            {showTemp && (
              <div
                className={`popup-surface space-y-6 rounded-[var(--modal-surface-radius)] p-4 sm:p-6 ${twoColumns ? 'lg:col-span-3' : ''}`}
              >
                <div className="text-center">
                  <p className="modal-section-label mb-3 text-left sm:mb-6">
                    {t('climate.target')}
                  </p>
                  <div className="flex items-center justify-center gap-2 sm:gap-4">
                    <span className="text-5xl leading-none font-light tracking-tighter text-[var(--text-primary)] tabular-nums select-none sm:text-6xl md:text-8xl">
                      {displayTargetTemp.value}
                    </span>
                    <span className="mt-6 text-3xl leading-none font-medium text-[var(--text-muted)] sm:mt-10 sm:text-4xl">
                      {displayTempUnit}
                    </span>
                  </div>
                  <p className="mt-3 mb-4 text-sm text-[var(--text-secondary)] sm:mb-8">
                    {t('climate.indoorTemp')}{' '}
                    <span className="font-medium text-[var(--text-primary)] tabular-nums">
                      {displayCurrentTemp.value === '--'
                        ? '--'
                        : `${displayCurrentTemp.value}${displayTempUnit}`}
                    </span>
                  </p>
                  <div className="flex items-center gap-3 sm:gap-6">
                    <button
                      onClick={() =>
                        callService('climate', 'set_temperature', {
                          entity_id: entityId,
                          temperature: tempValue - 0.5,
                        })
                      }
                      className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-90 sm:p-5"
                    >
                      <Minus className="h-5 w-5 sm:h-7 sm:w-7" style={{ strokeWidth: 3 }} />
                    </button>
                    <div className="flex-grow">
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
                              ? 'bg-[var(--status-warning-fg)]'
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
                      className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-90 sm:p-5"
                    >
                      <Plus className="h-5 w-5 sm:h-7 sm:w-7" style={{ strokeWidth: 3 }} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showControls && (
              <div className={`space-y-6 ${twoColumns ? 'lg:col-span-2' : 'mt-6'}`}>
                {showHvac && (
                  <div className="space-y-4">
                    {favoriteModes.length > 0 && (
                      <div className="space-y-3">
                        <p className="modal-section-label ml-1">{t('climate.shortcuts')}</p>
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
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
