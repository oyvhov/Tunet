import { AirVent, ArrowUpDown, Fan, Flame, Minus, Plus, Snowflake, X } from '../icons';
import M3Slider from '../components/ui/M3Slider';
import ModernDropdown from '../components/ui/ModernDropdown';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import { convertValueByKind, formatUnitValue, getDisplayUnitForKind, getEffectiveUnitMode } from '../utils';

const getDisplayName = (entity, fallback) => entity?.attributes?.friendly_name || fallback;

export default function GenericClimateModal({
  entityId,
  entity,
  onClose,
  callService,
  hvacMap,
  fanMap,
  swingMap,
  t
}) {
  if (!entityId || !entity) return null;

  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();

  const hvacAction = entity.attributes?.hvac_action || 'idle';
  const isCooling = hvacAction === 'cooling';
  const isHeating = hvacAction === 'heating';
  const clTheme = isCooling ? 'blue' : isHeating ? 'orange' : 'gray';
  const currentTemp = entity.attributes?.current_temperature;
  const targetTemp = entity.attributes?.temperature;
  const sourceTempUnit = entity.attributes?.temperature_unit || haConfig?.unit_system?.temperature || '°C';
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const displayTempUnit = getDisplayUnitForKind('temperature', effectiveUnitMode);
  const displayCurrentTemp = convertValueByKind(currentTemp, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
  });
  const displayTargetTemp = convertValueByKind(targetTemp, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
  });
  const minTemp = entity.attributes?.min_temp ?? 16;
  const maxTemp = entity.attributes?.max_temp ?? 30;

  const hvacModes = entity.attributes?.hvac_modes || [];
  const fanModes = entity.attributes?.fan_modes || [];
  const swingModes = entity.attributes?.swing_modes || [];

  const showTemp = typeof targetTemp === 'number' || typeof currentTemp === 'number';
  const showHvac = Array.isArray(hvacModes) && hvacModes.length > 0;
  const showFan = Array.isArray(fanModes) && fanModes.length > 0;
  const showSwing = Array.isArray(swingModes) && swingModes.length > 0;

  const tempValue = typeof targetTemp === 'number' ? targetTemp : 21;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-5xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 font-sans relative max-h-[90vh] overflow-y-auto backdrop-blur-xl popup-anim"
        style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 modal-close"><X className="w-4 h-4" /></button>
        <div className="flex items-center gap-4 mb-6 font-sans">
          <div
            className="p-4 rounded-2xl transition-all duration-500"
            style={{
              backgroundColor: clTheme === 'blue' ? 'rgba(59, 130, 246, 0.1)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.1)' : 'var(--glass-bg)',
              color: clTheme === 'blue' ? '#60a5fa' : clTheme === 'orange' ? '#fb923c' : 'var(--text-secondary)'
            }}
          >
            {isCooling ? <Snowflake className="w-8 h-8" /> : <AirVent className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">{getDisplayName(entity, t('climate.title'))}</h3>
            <div
              className="mt-2 px-3 py-1 rounded-full border inline-block transition-all duration-500"
              style={{
                backgroundColor: clTheme === 'blue' ? 'rgba(59, 130, 246, 0.2)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: clTheme === 'blue' ? 'rgba(59, 130, 246, 0.3)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: clTheme === 'blue' ? '#3b82f6' : clTheme === 'orange' ? '#fb923c' : 'var(--text-secondary)'
              }}
            >
              <p className="text-[10px] uppercase font-bold italic tracking-widest">{t('climate.action.' + hvacAction)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start font-sans">
          {showTemp && (
            <div className="lg:col-span-3 space-y-10 p-6 md:p-10 rounded-3xl popup-surface">
              <div className="text-center font-sans">
                <div className="flex justify-between items-center mb-6 px-4 italic">
                  <p className="text-xs text-gray-400 uppercase font-bold" style={{ letterSpacing: '0.5em' }}>{t('climate.indoorTemp')}</p>
                  <span className="text-xs uppercase font-bold" style={{ letterSpacing: '0.3em', color: isCooling ? '#60a5fa' : isHeating ? '#fb923c' : '#9ca3af' }}>
                    {typeof displayCurrentTemp === 'number' ? `${formatUnitValue(displayCurrentTemp, { fallback: '--' })}${displayTempUnit}` : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-4 mb-10">
                  <span className="text-6xl md:text-9xl font-light italic text-[var(--text-primary)] tracking-tighter leading-none select-none" style={{ textShadow: '0 10px 25px rgba(0,0,0,0.1)', color: isHeating ? '#fef2f2' : isCooling ? '#f0f9ff' : 'var(--text-primary)' }}>
                    {formatUnitValue(displayTargetTemp, { fallback: '--' })}
                  </span>
                  <span className="text-5xl font-medium leading-none mt-10 italic text-gray-700">{displayTempUnit}</span>
                </div>
                <div className="flex items-center gap-8 px-4">
                  <button onClick={() => callService('climate', 'set_temperature', { entity_id: entityId, temperature: tempValue - 0.5 })} className="p-6 rounded-full transition-all active:scale-90 shadow-lg border" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                    <Minus className="w-8 h-8" style={{ strokeWidth: 3 }} />
                  </button>
                  <div className="flex-grow font-sans">
                    <M3Slider min={minTemp} max={maxTemp} step={0.5} value={tempValue} onChange={(e) => callService('climate', 'set_temperature', { entity_id: entityId, temperature: parseFloat(e.target.value) })} colorClass={isCooling ? 'bg-blue-500' : isHeating ? 'bg-orange-500' : 'bg-white/20'} />
                  </div>
                  <button onClick={() => callService('climate', 'set_temperature', { entity_id: entityId, temperature: tempValue + 0.5 })} className="p-6 rounded-full transition-all active:scale-90 shadow-lg border" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                    <Plus className="w-8 h-8" style={{ strokeWidth: 3 }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {(showHvac || showFan || showSwing) && (
            <div className="lg:col-span-2 space-y-10 py-4 italic font-sans">
              {showHvac && (
                <ModernDropdown
                  label={t('climate.mode')}
                  icon={Flame}
                  options={hvacModes}
                  current={entity.state}
                  onChange={(m) => callService('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: m })}
                  map={hvacMap}
                  placeholder={t('dropdown.noneSelected')}
                />
              )}
              {showFan && (
                <ModernDropdown
                  label={t('climate.fanSpeed')}
                  icon={Fan}
                  options={fanModes}
                  current={entity.attributes?.fan_mode}
                  onChange={(m) => callService('climate', 'set_fan_mode', { entity_id: entityId, fan_mode: m })}
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
                  onChange={(m) => callService('climate', 'set_swing_mode', { entity_id: entityId, swing_mode: m })}
                  map={swingMap}
                  placeholder={t('dropdown.noneSelected')}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
