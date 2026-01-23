import { Minus, Plus, Fan, AirVent, Snowflake } from 'lucide-react';

export default function ClimateCard({
  dragProps,
  controls,
  cardStyle,
  editMode,
  name,
  Icon,
  currentTemp,
  targetTemp,
  fanMode,
  isCooling,
  isHeating,
  onOpen,
  onSetTemperature
}) {
  const clTheme = isCooling ? 'blue' : isHeating ? 'orange' : 'gray';
  const fanSpeedLevel = ['Low', 'LowMid', 'Mid', 'HighMid', 'High'].indexOf(fanMode) + 1;
  const DisplayIcon = Icon || (isCooling ? Snowflake : AirVent);

  const stepTemp = (delta) => onSetTemperature((targetTemp || 21) + delta);

  return (
    <div
      key="climate"
      {...dragProps}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode && onOpen) onOpen();
      }}
      className={`p-7 rounded-3xl flex flex-col justify-between transition-all duration-500 border group relative overflow-hidden font-sans h-full ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`}
      style={cardStyle}
    >
      {controls}
      <div className="flex justify-between items-start">
        <div
          className="p-3 rounded-2xl transition-all duration-500"
          style={{
            backgroundColor:
              clTheme === 'blue' ? 'rgba(59, 130, 246, 0.1)' : clTheme === 'orange' ? 'rgba(249, 115, 22, 0.1)' : 'var(--glass-bg)',
            color: clTheme === 'blue' ? '#60a5fa' : clTheme === 'orange' ? '#fb923c' : 'var(--text-secondary)'
          }}
        >
          <DisplayIcon className="w-5 h-5" style={{ strokeWidth: 1.5 }} />
        </div>
      </div>
      <div className="absolute top-7 right-7 flex flex-col items-end">
        <span className="text-xs uppercase font-bold opacity-60 mb-1" style={{ letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
          Inne
        </span>
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl font-medium text-[var(--text-primary)] leading-none">{String(currentTemp)}</span>
          <span className="text-sm text-[var(--text-secondary)] font-medium">°</span>
        </div>
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
          <div className="flex items-center justify-center rounded-2xl border w-20 gap-2 pr-2" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
            <Fan className="w-4 h-4 text-[var(--text-secondary)]" />
            {fanSpeedLevel === 0 ? (
              <span className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider">AUTO</span>
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
        </div>
      </div>
    </div>
  );
}
