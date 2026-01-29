import { X, Car, Clock, RefreshCw, Zap, MapPin, Thermometer, Flame } from '../icons';
import M3Slider from '../components/M3Slider';
import { formatRelativeTime } from '../utils';

/**
 * LeafModal - Modal for Nissan Leaf car information and controls
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.entities - All Home Assistant entities
 * @param {Function} props.callService - Function to call HA services
 * @param {Function} props.getS - Function to get entity state
 * @param {Function} props.getA - Function to get entity attribute
 * @param {Function} props.t - Translation function
 * @param {Object} props.constants - Entity ID constants (LEAF_*)
 */
export default function LeafModal({
  show,
  onClose,
  entities,
  callService,
  getS,
  getA,
  t,
  constants
}) {
  if (!show) return null;

  const {
    LEAF_ID,
    LEAF_CLIMATE,
    LEAF_LOCATION,
    LEAF_CHARGING,
    LEAF_PLUGGED,
    LEAF_RANGE,
    LEAF_INTERNAL_TEMP,
    LEAF_LAST_UPDATED,
    LEAF_UPDATE
  } = constants;

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
          <div className="flex items-center gap-6">
            <div 
              className="p-6 rounded-3xl" 
              style={{backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e'}}
            >
              <Car className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-4xl font-light tracking-tight text-[var(--text-primary)] uppercase italic">
                Nissan Leaf
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-3 h-3 text-gray-500" />
                <p className="text-xs text-gray-500 uppercase font-bold" style={{letterSpacing: '0.1em'}}>
                  {t('common.updated')}: {formatRelativeTime(entities[LEAF_LAST_UPDATED]?.state, t)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => callService("button", "press", { entity_id: LEAF_UPDATE })}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest transition-all hover:bg-white/5 active:scale-95" 
              style={{
                backgroundColor: 'var(--glass-bg)', 
                border: '1px solid var(--glass-border)', 
                color: 'var(--text-primary)'
              }}
            >
              <RefreshCw className="w-4 h-4" /> {t('leaf.update')}
            </button>
            <button onClick={onClose} className="modal-close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="p-8 rounded-3xl popup-surface">
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs text-gray-400 uppercase font-bold" style={{letterSpacing: '0.2em'}}>
                {t('leaf.battery')}
              </p>
              {entities[LEAF_CHARGING]?.state === 'on' && (
                <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-light italic text-[var(--text-primary)]">
                {String(getS(LEAF_ID))}
              </span>
              <span className="text-gray-500 font-medium">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium opacity-60">
              {entities[LEAF_PLUGGED]?.state === 'on' ? t('leaf.pluggedIn') : t('leaf.unplugged')}
            </p>
          </div>
          
          <div className="p-8 rounded-3xl popup-surface">
            <p className="text-xs text-gray-400 uppercase font-bold mb-3" style={{letterSpacing: '0.2em'}}>
              {t('leaf.range')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-light italic text-[var(--text-primary)]">
                {String(getS(LEAF_RANGE))}
              </span>
              <span className="text-gray-500 font-medium">km</span>
            </div>
          </div>
          
          <div className="p-8 rounded-3xl popup-surface">
            <p className="text-xs text-gray-400 uppercase font-bold mb-3" style={{letterSpacing: '0.2em'}}>
              {t('leaf.tempInside')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-light italic text-[var(--text-primary)]">
                {String(getS(LEAF_INTERNAL_TEMP))}
              </span>
              <span className="text-gray-500 font-medium">°C</span>
            </div>
          </div>
          
          <div 
            className="p-6 rounded-3xl popup-surface flex flex-col justify-between" 
            style={{
              backgroundColor: entities[LEAF_CLIMATE]?.state === 'heat_cool' 
                ? 'rgba(249, 115, 22, 0.1)' 
                : 'var(--glass-bg)'
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p 
                  className="text-xs uppercase font-bold" 
                  style={{
                    letterSpacing: '0.2em', 
                    color: entities[LEAF_CLIMATE]?.state === 'heat_cool' ? '#fb923c' : '#9ca3af'
                  }}
                >
                  {t('leaf.climate')}
                </p>
                <p className="text-2xl font-light italic text-[var(--text-primary)] mt-1">
                  {entities[LEAF_CLIMATE]?.state === 'heat_cool' ? t('common.on') : t('common.off')}
                </p>
              </div>
              <button 
                onClick={() => callService(
                  "climate", 
                  entities[LEAF_CLIMATE]?.state === 'heat_cool' ? "turn_off" : "turn_on", 
                  { entity_id: LEAF_CLIMATE }
                )} 
                className="w-12 h-7 rounded-full relative transition-all" 
                style={{
                  backgroundColor: entities[LEAF_CLIMATE]?.state === 'heat_cool' 
                    ? 'rgba(249, 115, 22, 0.4)' 
                    : 'rgba(255,255,255,0.1)'
                }}
              >
                <div 
                  className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all" 
                  style={{
                    left: entities[LEAF_CLIMATE]?.state === 'heat_cool' 
                      ? 'calc(100% - 5px - 20px)' 
                      : '4px',
                    backgroundColor: entities[LEAF_CLIMATE]?.state === 'heat_cool' 
                      ? '#fbbf24' 
                      : '#9ca3af'
                  }} 
                />
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <p className="text-[10px] uppercase font-bold opacity-60">
                  {t('leaf.target')}: {getA(LEAF_CLIMATE, "temperature", 20)}°C
                </p>
              </div>
              <M3Slider 
                min={16} 
                max={30} 
                step={0.5} 
                value={getA(LEAF_CLIMATE, "temperature") || 20} 
                onChange={(e) => callService(
                  "climate", 
                  "set_temperature", 
                  { entity_id: LEAF_CLIMATE, temperature: parseFloat(e.target.value) }
                )} 
                colorClass={
                  entities[LEAF_CLIMATE]?.state === 'heat_cool' 
                    ? 'bg-orange-500' 
                    : 'bg-white/20'
                } 
              />
            </div>
          </div>
        </div>

        {getA(LEAF_LOCATION, "latitude") && getA(LEAF_LOCATION, "longitude") && (
          <div className="w-full h-64 rounded-3xl overflow-hidden relative group popup-surface">
            <iframe 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no" 
              marginHeight="0" 
              marginWidth="0" 
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${getA(LEAF_LOCATION, "longitude")-0.005}%2C${getA(LEAF_LOCATION, "latitude")-0.005}%2C${getA(LEAF_LOCATION, "longitude")+0.005}%2C${getA(LEAF_LOCATION, "latitude")+0.005}&layer=mapnik&marker=${getA(LEAF_LOCATION, "latitude")}%2C${getA(LEAF_LOCATION, "longitude")}`} 
              style={{filter: 'invert(0.9) grayscale(0.8) contrast(1.2) brightness(0.8)'}}
              className="opacity-60 group-hover:opacity-100 transition-opacity duration-500"
            ></iframe>
            <div className="absolute bottom-4 left-4 px-4 py-2 rounded-xl backdrop-blur-md bg-black/60 popup-surface flex items-center gap-2 pointer-events-none">
              <MapPin className="w-3 h-3 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">
                {t('map.lastSeenHere')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
