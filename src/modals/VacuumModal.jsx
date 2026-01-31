import { X, Bot, MapPin, Battery, Play, Pause, Home, Fan, Droplets } from '../icons';
import ModernDropdown from '../components/ModernDropdown';

/**
 * VacuumModal - Modal for vacuum robot information and controls
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.entities - All Home Assistant entities
 * @param {Function} props.callService - Function to call HA services
 * @param {Function} props.getA - Function to get entity attribute
 * @param {Function} props.t - Translation function
 * @param {string} props.vacuumId - Vacuum entity id
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
  const room = getA(vacuumId, 'current_room') || getA(vacuumId, 'room');
  const name = entity?.attributes?.friendly_name || vacuumId;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" 
      style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-2xl rounded-2xl md:rounded-[2rem] p-4 md:p-6 font-sans relative max-h-[80vh] overflow-y-auto backdrop-blur-xl popup-anim" 
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
          borderColor: 'var(--glass-border)', 
          color: 'var(--text-primary)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 md:top-6 md:right-6 modal-close"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-4 mb-6">
          <div 
            className="p-4 rounded-2xl" 
            style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa'}}
          >
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              {name}
            </h3>
            <p 
              className="text-[10px] text-gray-500 uppercase font-bold mt-1" 
              style={{letterSpacing: '0.08em'}}
            >
              {t('status.statusLabel')}: {state}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-5 rounded-2xl popup-surface">
            <p 
              className="text-[10px] text-gray-400 uppercase font-bold mb-2" 
              style={{letterSpacing: '0.16em'}}
            >
              {t('vacuum.lastCleaned')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-[var(--text-primary)]">
                {getA(vacuumId, 'last_cleaned') || '--'}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl popup-surface">
            <p 
              className="text-[10px] text-gray-400 uppercase font-bold mb-2" 
              style={{letterSpacing: '0.16em'}}
            >
              {t('vacuum.find')}
            </p>
            <button 
              onClick={() => callService('vacuum', 'locate', { entity_id: vacuumId })}
              className="w-full py-2 rounded-xl bg-blue-500/20 text-blue-300 font-bold uppercase tracking-widest text-[11px] hover:bg-blue-500/30 transition-colors"
            >
              {t('vacuum.find')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-5 rounded-2xl popup-surface flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{t('vacuum.room')}</span>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {room || t('vacuum.unknown')}
            </span>
          </div>
          <div className="p-5 rounded-2xl popup-surface flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-green-400" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{t('vacuum.battery')}</span>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {getA(vacuumId, 'battery_level') ?? '--'}%
            </span>
          </div>
          <div className="p-5 rounded-2xl popup-surface flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{t('vacuum.home')}</span>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {state || t('vacuum.unknown')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl popup-surface">
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-2" style={{letterSpacing: '0.16em'}}>
              {t('vacuum.suction')}
            </p>
            <ModernDropdown
              icon={Fan}
              options={['Silent', 'Standard', 'Strong', 'Turbo']}
              current={getA(vacuumId, 'fan_speed') || 'Standard'}
              onChange={(value) => callService('vacuum', 'set_fan_speed', { entity_id: vacuumId, fan_speed: value })}
              placeholder={t('vacuum.suction')}
            />
          </div>
          <div className="p-5 rounded-2xl popup-surface">
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-2" style={{letterSpacing: '0.16em'}}>
              {t('vacuum.mopIntensity')}
            </p>
            <ModernDropdown
              icon={Droplets}
              options={['Low', 'Medium', 'High']}
              current={getA(vacuumId, 'mop_intensity') || 'Medium'}
              onChange={(value) => callService('vacuum', 'set_mop_intensity', { entity_id: vacuumId, mop_intensity: value })}
              placeholder={t('vacuum.mopIntensity')}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={() => callService('vacuum', state === 'cleaning' ? 'pause' : 'start', { entity_id: vacuumId })}
            className="flex-1 min-w-[150px] py-2.5 rounded-xl bg-blue-500 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors"
          >
            {state === 'cleaning' ? t('vacuum.pause') : t('vacuum.start')}
          </button>
          <button
            onClick={() => callService('vacuum', 'return_to_base', { entity_id: vacuumId })}
            className="flex-1 min-w-[150px] py-2.5 rounded-xl bg-[var(--glass-bg)] text-[var(--text-primary)] text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--glass-bg-hover)] transition-colors"
          >
            {t('vacuum.home')}
          </button>
        </div>
      </div>
    </div>
  );
}
