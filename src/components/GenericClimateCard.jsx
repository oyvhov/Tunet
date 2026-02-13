import { Minus, Plus, AirVent, Fan } from 'lucide-react';
import { getIconComponent } from '../iconMap';

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
  t
}) {
  if (!entity || !entityId) return null;

  const isSmall = settings?.size === 'small';
  const currentTemp = entity.attributes?.current_temperature ?? '--';
  const targetTemp = entity.attributes?.temperature ?? '--';
  const fanMode = entity.attributes?.fan_mode ?? 'Auto';
  const fanModes = entity.attributes?.fan_modes || [];
  const showFan = Array.isArray(fanModes) && fanModes.length > 0;
  const fanSpeedLevel = ['Low', 'LowMid', 'Mid', 'HighMid', 'High'].indexOf(fanMode) + 1;

  const name = customNames[cardId]
    || entity.attributes?.friendly_name
    || entityId;

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
        className={`touch-feedback p-4 pl-5 rounded-3xl flex items-center justify-between gap-4 transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-[0.98]' : 'cursor-move'}`}
        style={{...cardStyle, containerType: 'inline-size'}}
      >
        {controls}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all duration-500"
            style={{
              backgroundColor:
                clTheme === 'blue' ? 'rgba(59, 130, 246, 0.1)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.1)' : 'var(--glass-bg)',
              color: clTheme === 'blue' ? '#60a5fa' : clTheme === 'orange' ? '#fb923c' : 'var(--text-secondary)'
            }}
          >
            <DisplayIcon className="w-6 h-6 stroke-[1.5px]" />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 whitespace-normal break-words leading-none mb-1.5">{name}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-[var(--text-primary)] leading-none">{String(currentTemp)}°</span>
              <span className="text-xs text-[var(--text-secondary)]">→ {String(targetTemp)}°</span>
            </div>
          </div>
        </div>
        <div className="card-controls card-controls--temp shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              stepTemp(0.5);
            }}
            className="control-plus w-8 h-8 flex items-center justify-center rounded-xl transition-colors bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 hover:bg-[var(--glass-bg-hover)]"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              stepTemp(-0.5);
            }}
            className="control-minus w-8 h-8 flex items-center justify-center rounded-xl transition-colors bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 hover:bg-[var(--glass-bg-hover)]"
          >
            <Minus className="w-4 h-4" />
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
      className={`touch-feedback p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}
      <div className="flex justify-between items-start gap-4 mb-4">
        <div
          className="p-3 rounded-2xl transition-all duration-500 flex-shrink-0"
          style={{
            backgroundColor:
              clTheme === 'blue' ? 'rgba(59, 130, 246, 0.2)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            color: clTheme === 'blue' ? '#3b82f6' : clTheme === 'orange' ? '#fb923c' : 'var(--text-secondary)'
          }}
        >
          <DisplayIcon className="w-5 h-5" style={{ strokeWidth: 1.5 }} />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border flex-shrink-0" style={{
          backgroundColor: clTheme === 'blue' ? 'rgba(59, 130, 246, 0.2)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          borderColor: clTheme === 'blue' ? 'rgba(59, 130, 246, 0.3)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.1)',
          color: clTheme === 'blue' ? '#3b82f6' : clTheme === 'orange' ? '#fb923c' : 'var(--text-secondary)'
        }}>
          <span className="text-xs tracking-widest uppercase font-bold">{translate('climate.action.' + hvacAction)}</span>
        </div>
      </div>
      <div>
        <span className="text-4xl font-medium text-[var(--text-primary)] leading-none">{String(currentTemp)}°</span>
      </div>
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[var(--text-secondary)] text-xs uppercase font-bold opacity-60 leading-none" style={{ letterSpacing: '0.05em' }}>
            {name}
          </p>
        </div>
        <div className="flex items-stretch gap-3">
          <div className="flex items-center justify-between rounded-2xl p-1 border flex-1" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                stepTemp(-0.5);
              }}
              className="w-6 h-8 flex items-center justify-center rounded-xl transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 hover:bg-[var(--glass-bg-hover)]"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-[var(--text-primary)] leading-none">{String(targetTemp)}°</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                stepTemp(0.5);
              }}
              className="w-6 h-8 flex items-center justify-center rounded-xl transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 hover:bg-[var(--glass-bg-hover)]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {showFan && (
            <div className="flex items-center justify-center rounded-2xl border w-20 gap-2 pr-2" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
              <Fan className="w-4 h-4 text-[var(--text-secondary)]" />
              {fanSpeedLevel === 0 ? (
                <span className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider">{translate('climate.fanAuto')}</span>
              ) : (
                <div className="flex items-end gap-[2px] h-4">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-1 rounded-sm transition-all duration-300 ${
                        level <= fanSpeedLevel
                          ? clTheme === 'blue'
                            ? 'bg-blue-400'
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
