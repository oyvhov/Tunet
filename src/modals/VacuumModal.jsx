import { X, Bot, MapPin, Battery, Play, Pause, Home, Fan, Droplets } from '../icons';
import ModernDropdown from '../components/ModernDropdown';

const getDisplayName = (entity, fallback) => entity?.attributes?.friendly_name || fallback;

/**
 * VacuumModal - Modal for vacuum robot information and controls
 */
export default function VacuumModal({
  show,
  onClose,
  entities,
  callService,
  getA,
  t,
  vacuumId
}) {
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
  const fanSpeedList = entity.attributes?.fan_speed_list || ['Silent', 'Standard', 'Strong', 'Turbo'];
  const mopIntensityList = entity.attributes?.mop_intensity_list || ['Low', 'Medium', 'High'];

  // Status Color Logic similar to ClimateModal
  const statusColor = isCleaning ? '#60a5fa' : (isReturning ? '#c084fc' : (isError ? '#ef4444' : 'var(--text-secondary)'));
  const statusBg = isCleaning ? 'rgba(59, 130, 246, 0.1)' : (isReturning ? 'rgba(192, 132, 252, 0.1)' : (isError ? 'rgba(239, 68, 68, 0.1)' : 'var(--glass-bg)'));
  const _statusBorder = isCleaning ? 'rgba(59, 130, 246, 0.2)' : (isReturning ? 'rgba(192, 132, 252, 0.2)' : (isError ? 'rgba(239, 68, 68, 0.2)' : 'var(--glass-border)'));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" 
      style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-5xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 font-sans relative max-h-[90vh] overflow-y-auto backdrop-blur-xl popup-anim" 
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
          borderColor: 'var(--glass-border)', 
          color: 'var(--text-primary)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 modal-close"><X className="w-4 h-4" /></button>
        
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6 font-sans">
          <div className="p-4 rounded-2xl transition-all duration-500" style={{ backgroundColor: statusBg, color: statusColor }}>
             <Bot className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">
              {getDisplayName(entity, vacuumId)}
            </h3>
            <div className="mt-2 px-3 py-1 rounded-full inline-block transition-all duration-500" style={{ backgroundColor: statusBg, color: statusColor }}>
              <p className="text-[10px] uppercase font-bold italic tracking-widest">{t('status.statusLabel')}: {state}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start font-sans">
          
          {/* Left Column - Main Controls & Status (Span 3) */}
          <div className="lg:col-span-3 space-y-6">
             <div className="p-8 rounded-3xl popup-surface flex flex-col items-center justify-center gap-8">
                
                {/* Primary Actions */}
                <div className="flex gap-4 w-full">
                    <button
                        onClick={() => callService('vacuum', isCleaning ? 'pause' : 'start', { entity_id: vacuumId })}
                        className={`flex-1 py-5 rounded-2xl flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest transition-all ${isCleaning ? 'bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]' : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600'}`}
                    >
                        {isCleaning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        {isCleaning ? t('vacuum.pause') : t('vacuum.start')}
                    </button>
                    <button
                        onClick={() => callService('vacuum', 'return_to_base', { entity_id: vacuumId })}
                        className="flex-1 py-5 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-primary)] text-sm font-bold uppercase tracking-widest hover:bg-[var(--glass-bg-hover)] transition-all flex items-center justify-center gap-3"
                    >
                        <Home className="w-5 h-5" />
                        {t('vacuum.home')}
                    </button>
                </div>
                
                {/* Secondary Status Grid */}
                <div className="grid grid-cols-3 gap-4 w-full">
                   {/* Battery */}
                   <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--glass-bg)]/50 transition-all">
                      <Battery className={`w-6 h-6 ${battery !== undefined && battery < 20 ? 'text-red-400' : 'text-green-400'}`} />
                      <span className="text-xl font-light">{battery !== undefined ? `${battery}%` : '--'}</span>
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">{t('vacuum.battery')}</span>
                   </div>
                   
                   {/* Room */}
                   <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--glass-bg)]/50 transition-all">
                      <MapPin className="w-6 h-6 text-blue-400" />
                      <span className="text-xl font-light truncate max-w-full px-2" title={room}>{room || '--'}</span>
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">{t('vacuum.room')}</span>
                   </div>
                   
                   {/* Locate Button */}
                    <button 
                      onClick={() => callService('vacuum', 'locate', { entity_id: vacuumId })}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--glass-bg)]/50 hover:bg-[var(--glass-bg-hover)] transition-all active:scale-95 group"
                    >
                      <Bot className="w-6 h-6 text-purple-400" />
                      <span className="text-xl font-light">{t('vacuum.find')}</span>
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Click</span>
                   </button>
                </div>
             </div>
          </div>

          {/* Right Column - Modes/Settings (Span 2) */}
          <div className="lg:col-span-2 space-y-10 py-4 italic font-sans flex flex-col justify-start">
            <ModernDropdown
              label={t('vacuum.suction')}
              icon={Fan}
              options={fanSpeedList}
              current={fanSpeed}
              onChange={(value) => callService('vacuum', 'set_fan_speed', { entity_id: vacuumId, fan_speed: value })}
              placeholder={t('vacuum.suction')}
              map={{}} 
            />

            <ModernDropdown
              label={t('vacuum.mopIntensity')}
              icon={Droplets}
              options={mopIntensityList}
              current={mopIntensity}
              onChange={(value) => callService('vacuum', 'set_mop_intensity', { entity_id: vacuumId, mop_intensity: value })}
              placeholder={t('vacuum.mopIntensity')}
              map={{}}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
