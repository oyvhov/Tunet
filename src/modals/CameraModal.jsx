import { X, MapPin } from '../icons';

/**
 * CameraModal - Modal for displaying camera feed
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.entities - All Home Assistant entities
 * @param {Function} props.getEntityImageUrl - Function to get entity image URL
 * @param {Function} props.t - Translation function
 * @param {string} props.cameraEntityId - Camera entity ID
 */
export default function CameraModal({
  show,
  onClose,
  entities,
  getEntityImageUrl,
  t,
  cameraEntityId
}) {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-6" 
      style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-4xl rounded-[3rem] p-4 shadow-2xl relative font-sans overflow-hidden backdrop-blur-xl popup-anim" 
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
          borderColor: 'var(--glass-border)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 modal-close modal-close-dark z-10" 
          style={{backdropFilter: 'blur(10px)'}}
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden bg-black relative">
          {entities[cameraEntityId] ? (
            <img 
              src={getEntityImageUrl(entities[cameraEntityId].attributes.entity_picture)} 
              alt={t('camera.gateAlt')} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              {t('camera.unavailable')}
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 to-transparent">
            <h3 className="text-2xl font-bold text-white">{t('camera.gate')}</h3>
            <p className="text-sm text-gray-400">{t('camera.live')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
