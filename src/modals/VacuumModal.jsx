import { X, Bot, MapPin, Battery, Play, Pause, Home, Fan, Droplets } from '../icons';
import ModernDropdown from '../components/ui/ModernDropdown';

const getDisplayName = (entity, fallback) => entity?.attributes?.friendly_name || fallback;

/**
 * VacuumModal - Modal for vacuum robot information and controls
 */
export default function VacuumModal({ show, onClose, entities, callService, getA, t, vacuumId }) {
  if (!show) return null;
  if (!vacuumId || !entities?.[vacuumId]) return null;

  const entity = entities[vacuumId];
  const state = entity?.state;
  const isCleaning = state === 'cleaning';
  const isReturning = state === 'returning';
  const isError = state === 'error';

  const room = getA(vacuumId, 'current_room') || getA(vacuumId, 'room');
  const battery = getA(vacuumId, 'battery_level');
  const fanSpeed = getA(vacuumId, 'fan_speed');
  const mopIntensity = getA(vacuumId, 'mop_intensity');

  // Dynamic lists from attributes or defaults
  const fanSpeedList = entity.attributes?.fan_speed_list || [
    'Silent',
    'Standard',
    'Strong',
    'Turbo',
  ];
  const mopIntensityList = entity.attributes?.mop_intensity_list || ['Low', 'Medium', 'High'];

  // Status Color Logic similar to ClimateModal
  const statusColor = isCleaning
    ? '#60a5fa'
    : isReturning
      ? '#c084fc'
      : isError
        ? '#ef4444'
        : 'var(--text-secondary)';
  const statusBg = isCleaning
    ? 'rgba(59, 130, 246, 0.1)'
    : isReturning
      ? 'rgba(192, 132, 252, 0.1)'
      : isError
        ? 'rgba(239, 68, 68, 0.1)'
        : 'var(--glass-bg)';
  const _statusBorder = isCleaning
    ? 'rgba(59, 130, 246, 0.2)'
    : isReturning
      ? 'rgba(192, 132, 252, 0.2)'
      : isError
        ? 'rgba(239, 68, 68, 0.2)'
        : 'var(--glass-border)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border p-6 font-sans backdrop-blur-xl md:rounded-[3rem] md:p-12"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-6 right-6 md:top-10 md:right-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Section */}
        <div className="mb-6 flex items-center gap-4 font-sans">
          <div
            className="rounded-2xl p-4 transition-all duration-500"
            style={{ backgroundColor: statusBg, color: statusColor }}
          >
            <Bot className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic">
              {getDisplayName(entity, vacuumId)}
            </h3>
            <div
              className="mt-2 inline-block rounded-full px-3 py-1 transition-all duration-500"
              style={{ backgroundColor: statusBg, color: statusColor }}
            >
              <p className="text-[10px] font-bold tracking-widest uppercase italic">
                {t('status.statusLabel')}: {state}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-12 font-sans lg:grid-cols-5">
          {/* Left Column - Main Controls & Status (Span 3) */}
          <div className="space-y-6 lg:col-span-3">
            <div className="popup-surface flex flex-col items-center justify-center gap-8 rounded-3xl p-8">
              {/* Primary Actions */}
              <div className="flex w-full gap-4">
                <button
                  onClick={() =>
                    callService('vacuum', isCleaning ? 'pause' : 'start', { entity_id: vacuumId })
                  }
                  className={`flex flex-1 items-center justify-center gap-3 rounded-2xl py-5 text-sm font-bold tracking-widest uppercase transition-all ${isCleaning ? 'bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]' : 'bg-[var(--accent-color)] text-white shadow-lg hover:bg-[var(--accent-color)]'}`}
                >
                  {isCleaning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {isCleaning ? t('vacuum.pause') : t('vacuum.start')}
                </button>
                <button
                  onClick={() => callService('vacuum', 'return_to_base', { entity_id: vacuumId })}
                  className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-[var(--glass-bg)] py-5 text-sm font-bold tracking-widest text-[var(--text-primary)] uppercase transition-all hover:bg-[var(--glass-bg-hover)]"
                >
                  <Home className="h-5 w-5" />
                  {t('vacuum.home')}
                </button>
              </div>

              {/* Secondary Status Grid */}
              <div className="grid w-full grid-cols-3 gap-4">
                {/* Battery */}
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--glass-bg)]/50 p-4 transition-all">
                  <Battery
                    className={`h-6 w-6 ${battery !== undefined && battery < 20 ? 'text-red-400' : 'text-green-400'}`}
                  />
                  <span className="text-xl font-light">
                    {battery !== undefined ? `${battery}%` : '--'}
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                    {t('vacuum.battery')}
                  </span>
                </div>

                {/* Room */}
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--glass-bg)]/50 p-4 transition-all">
                  <MapPin className="h-6 w-6 text-[var(--accent-color)]" />
                  <span className="max-w-full truncate px-2 text-xl font-light" title={room}>
                    {room || '--'}
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                    {t('vacuum.room')}
                  </span>
                </div>

                {/* Locate Button */}
                <button
                  onClick={() => callService('vacuum', 'locate', { entity_id: vacuumId })}
                  className="group flex flex-col items-center gap-2 rounded-2xl bg-[var(--glass-bg)]/50 p-4 transition-all hover:bg-[var(--glass-bg-hover)] active:scale-95"
                >
                  <Bot className="h-6 w-6 text-purple-400" />
                  <span className="text-xl font-light">{t('vacuum.find')}</span>
                  <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase opacity-0 transition-opacity group-hover:opacity-100">
                    Click
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Modes/Settings (Span 2) */}
          <div className="flex flex-col justify-start space-y-10 py-4 font-sans italic lg:col-span-2">
            <ModernDropdown
              label={t('vacuum.suction')}
              icon={Fan}
              options={fanSpeedList}
              current={fanSpeed}
              onChange={(value) =>
                callService('vacuum', 'set_fan_speed', { entity_id: vacuumId, fan_speed: value })
              }
              placeholder={t('vacuum.suction')}
              map={{}}
            />

            <ModernDropdown
              label={t('vacuum.mopIntensity')}
              icon={Droplets}
              options={mopIntensityList}
              current={mopIntensity}
              onChange={(value) =>
                callService('vacuum', 'set_mop_intensity', {
                  entity_id: vacuumId,
                  mop_intensity: value,
                })
              }
              placeholder={t('vacuum.mopIntensity')}
              map={{}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
