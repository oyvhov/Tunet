import { Minus, Plus, AirVent, Fan } from 'lucide-react';
import { getIconComponent } from '../../icons';
import { useConfig, useHomeAssistantMeta } from '../../contexts';
import { formatKindValueForDisplay, getEffectiveUnitMode } from '../../utils';

const isCoolingState = (entity) => {
  const action = entity?.attributes?.hvac_action;
  return action === 'cooling';
};

const isHeatingState = (entity) => {
  const action = entity?.attributes?.hvac_action;
  return action === 'heating';
};

export default function GenericClimateCard({
  cardId,
  entityId,
  entity,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  onOpen,
  onSetTemperature,
  settings,
  t,
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();

  if (!entity || !entityId) return null;

  const isSmall = settings?.size === 'small';
  const currentTemp = entity.attributes?.current_temperature ?? '--';
  const targetTemp = entity.attributes?.temperature ?? '--';
  const sourceTempUnit =
    haConfig?.unit_system?.temperature || entity.attributes?.temperature_unit || '°C';
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const displayCurrentTemp = formatKindValueForDisplay(currentTemp, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
  });
  const displayTargetTemp = formatKindValueForDisplay(targetTemp, {
    kind: 'temperature',
    fromUnit: sourceTempUnit,
    unitMode: effectiveUnitMode,
  });
  const fanMode = entity.attributes?.fan_mode ?? 'Auto';
  const fanModes = entity.attributes?.fan_modes || [];
  const showFan = Array.isArray(fanModes) && fanModes.length > 0;
  const fanSpeedLevel = ['Low', 'LowMid', 'Mid', 'HighMid', 'High'].indexOf(fanMode) + 1;

  const name = customNames[cardId] || entity.attributes?.friendly_name || entityId;

  const climateIconName = customIcons[cardId] || entity?.attributes?.icon;
  const Icon = climateIconName ? getIconComponent(climateIconName) : null;

  const translate = t || ((key) => key);
  const isCooling = isCoolingState(entity);
  const isHeating = isHeatingState(entity);
  const clTheme = isCooling ? 'blue' : isHeating ? 'orange' : 'gray';
  const hvacAction = entity.attributes?.hvac_action || 'idle';
  const DisplayIcon = Icon || AirVent;

  const stepTemp = (delta) => onSetTemperature((targetTemp || 21) + delta);

  if (isSmall) {
    return (
      <div
        {...dragProps}
        onClick={(e) => {
          e.stopPropagation();
          if (!editMode && onOpen) onOpen();
        }}
        className={`glass-texture touch-feedback group relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-3xl border p-4 pl-5 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={{ ...cardStyle, containerType: 'inline-size' }}
      >
        {controls}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110"
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
            <DisplayIcon className="h-6 w-6 stroke-[1.5px]" />
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="mb-1.5 text-xs leading-none font-bold tracking-widest break-words whitespace-normal text-[var(--text-secondary)] uppercase opacity-60">
              {name}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-sm leading-none font-bold text-[var(--text-primary)]">
                {displayCurrentTemp.text}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                → {displayTargetTemp.text}
              </span>
            </div>
          </div>
        </div>
        <div className="card-controls card-controls--temp shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              stepTemp(0.5);
            }}
            className="control-plus flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              stepTemp(-0.5);
            }}
            className="control-minus flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      key="climate"
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
      className={`glass-texture touch-feedback group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-7 font-sans transition-all duration-500 ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div
          className="flex-shrink-0 rounded-2xl p-3 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
          style={{
            backgroundColor:
              clTheme === 'blue'
                ? 'rgba(59, 130, 246, 0.2)'
                : clTheme === 'orange'
                  ? 'rgba(249, 115, 22, 0.1)'
                  : 'rgba(255, 255, 255, 0.05)',
            color:
              clTheme === 'blue'
                ? '#3b82f6'
                : clTheme === 'orange'
                  ? '#fb923c'
                  : 'var(--text-secondary)',
          }}
        >
          <DisplayIcon className="h-5 w-5" style={{ strokeWidth: 1.5 }} />
        </div>
        <div
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1"
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
          <span className="text-xs font-bold tracking-widest uppercase">
            {translate('climate.action.' + hvacAction)}
          </span>
        </div>
      </div>
      <div>
        <span className="text-4xl leading-none font-thin text-[var(--text-primary)]">
          {displayCurrentTemp.text}
        </span>
      </div>
      <div className="mt-2">
        <div className="mb-3 flex items-center gap-2">
          <p
            className="text-xs leading-none font-bold text-[var(--text-secondary)] uppercase opacity-60"
            style={{ letterSpacing: '0.05em' }}
          >
            {name}
          </p>
        </div>
        <div className="flex items-stretch gap-3">
          <div
            className="flex flex-1 items-center justify-between rounded-2xl p-1"
            style={{ backgroundColor: 'var(--glass-bg)' }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                stepTemp(-0.5);
              }}
              className="flex h-8 w-6 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-xl leading-none font-medium text-[var(--text-primary)]">
                {displayTargetTemp.text}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                stepTemp(0.5);
              }}
              className="flex h-8 w-6 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] active:scale-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {showFan && (
            <div
              className="flex w-20 items-center justify-center gap-2 rounded-2xl pr-2"
              style={{ backgroundColor: 'var(--glass-bg)' }}
            >
              <Fan className="h-4 w-4 text-[var(--text-secondary)]" />
              {fanSpeedLevel === 0 ? (
                <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)]">
                  {translate('climate.fanAuto')}
                </span>
              ) : (
                <div className="flex h-4 items-end gap-[2px]">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-1 rounded-sm transition-all duration-300 ${
                        level <= fanSpeedLevel
                          ? clTheme === 'blue'
                            ? 'bg-[var(--accent-color)]'
                            : clTheme === 'orange'
                              ? 'bg-orange-400'
                              : 'bg-[var(--text-primary)]'
                          : 'bg-[var(--glass-bg-hover)]'
                      }`}
                      style={{ height: `${30 + level * 14}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
