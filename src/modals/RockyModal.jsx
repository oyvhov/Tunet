import { X, Bot, MapPin, Battery, Play, Pause, Home, Fan, Droplets } from '../icons';
import ModernDropdown from '../components/ModernDropdown';

/**
 * RockyModal - Modal for vacuum robot (Rocky) information and controls
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.entities - All Home Assistant entities
 * @param {Function} props.callService - Function to call HA services
 * @param {Function} props.getA - Function to get entity attribute
 * @param {Function} props.t - Translation function
 * @param {Object} props.constants - Entity ID constants (ROCKY_ID, ROCKY_ROOM_ID)
 */
export default function RockyModal({
  show,
  onClose,
  entities,
  callService,
  getA,
  t,
  constants
}) {
  if (!show) return null;

  const { ROCKY_ID, ROCKY_ROOM_ID } = constants;
  const state = entities[ROCKY_ID]?.state;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" 
      style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-4xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 font-sans relative max-h-[85vh] overflow-y-auto backdrop-blur-xl popup-anim" 
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
          borderColor: 'var(--glass-border)', 
          color: 'var(--text-primary)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 md:top-10 md:right-10 modal-close"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-6 mb-10">
          <div 
            className="p-6 rounded-3xl" 
            style={{backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa'}}
          >
            <Bot className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-4xl font-light tracking-tight text-[var(--text-primary)] uppercase italic">
              Rocky
            </h3>
            <p 
              className="text-xs text-gray-500 uppercase font-bold mt-2" 
              style={{letterSpacing: '0.1em'}}
            >
              {t('status.statusLabel')}: {state}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-8 rounded-3xl popup-surface">
            <p 
              className="text-xs text-gray-400 uppercase font-bold mb-3" 
              style={{letterSpacing: '0.2em'}}
            >
              {t('rocky.lastCleaned')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-light italic text-[var(--text-primary)]">
                {getA(ROCKY_ID, "squareMeterCleanArea", 0)}
              </span>
              <span className="text-gray-500 font-medium">m²</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium opacity-60">
              Tid: {Math.round(getA(ROCKY_ID, "cleanTime", 0) / 60)} min
            </p>
          </div>
          
          <div className="p-8 rounded-3xl popup-surface flex flex-col justify-center gap-4">
            <button 
              onClick={() => callService(
                "vacuum", 
                state === "cleaning" ? "pause" : "start", 
                { entity_id: ROCKY_ID }
              )} 
              className="w-full py-4 rounded-2xl bg-blue-500/20 text-blue-400 font-bold uppercase tracking-widest hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
            >
              {state === "cleaning" ? (
                <>
                  <Pause className="w-4 h-4" /> {t('rocky.pause')}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> {t('rocky.start')}
                </>
              )}
            </button>
            <div className="flex gap-4">
              <button 
                onClick={() => callService("vacuum", "return_to_base", { entity_id: ROCKY_ID })} 
                className="flex-1 py-4 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] font-bold uppercase tracking-widest hover:bg-[var(--glass-bg-hover)] transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" /> {t('rocky.home')}
              </button>
              <button 
                onClick={() => callService("vacuum", "locate", { entity_id: ROCKY_ID })} 
                className="flex-1 py-4 rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)] font-bold uppercase tracking-widest hover:bg-[var(--glass-bg-hover)] transition-colors flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" /> {t('rocky.find')}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <ModernDropdown 
            label={t('rocky.suction')} 
            icon={Fan} 
            options={getA(ROCKY_ID, "fan_speed_list", [])} 
            current={getA(ROCKY_ID, "fan_speed")} 
            onChange={(val) => callService(
              "vacuum", 
              "set_fan_speed", 
              { entity_id: ROCKY_ID, fan_speed: val }
            )} 
            placeholder={t('dropdown.noneSelected')} 
          />
          {getA(ROCKY_ID, "mop_intensity_list") && (
            <ModernDropdown 
              label={t('rocky.mopIntensity')} 
              icon={Droplets} 
              options={getA(ROCKY_ID, "mop_intensity_list", [])} 
              current={getA(ROCKY_ID, "mop_intensity")} 
              onChange={(val) => callService(
                "vacuum", 
                "send_command", 
                { entity_id: ROCKY_ID, command: "set_mop_mode", params: { mop_mode: val } }
              )} 
              placeholder={t('dropdown.noneSelected')} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
