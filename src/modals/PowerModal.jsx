import { X, Zap } from '../icons';
import InteractivePowerGraph from '../components/InteractivePowerGraph';

/**
 * PowerModal - Modal for displaying power price information and graph
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Function to close modal
 * @param {Array} props.fullPriceData - Complete price data array
 * @param {number} props.currentPriceIndex - Index of current price
 * @param {Object} props.priceStats - Price statistics (min, max, avg)
 * @param {Function} props.t - Translation function
 * @param {string} props.language - Current language code
 */
export default function PowerModal({
  show,
  onClose,
  fullPriceData,
  currentPriceIndex,
  priceStats,
  t,
  language
}) {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6" 
      style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-4xl rounded-3xl md:rounded-[3rem] p-6 md:p-10 font-sans relative max-h-[80vh] overflow-y-auto backdrop-blur-xl popup-anim" 
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
        
        <div className="flex items-center gap-6 mb-6">
          <div 
            className="p-6 rounded-3xl" 
            style={{backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#fbbf24'}}
          >
            <Zap className="w-10 h-10" />
          </div>
          <h3 className="text-4xl font-light tracking-tight text-[var(--text-primary)] uppercase italic">
            {t('power.title')}
          </h3>
        </div>
        
        <div className="flex justify-around items-center mb-8 px-4 py-4 rounded-2xl popup-surface">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">
              {t('power.avg')}
            </span>
            <span className="text-xl font-light text-[var(--text-primary)]">
              {priceStats.avg.toFixed(2)}
            </span>
          </div>
          <div className="w-px h-8 popup-surface-divider"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">
              {t('power.low')}
            </span>
            <span className="text-xl font-light text-blue-400">
              {priceStats.min.toFixed(2)}
            </span>
          </div>
          <div className="w-px h-8 popup-surface-divider"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">
              {t('power.high')}
            </span>
            <span className="text-xl font-light text-red-400">
              {priceStats.max.toFixed(2)}
            </span>
          </div>
        </div>
        
        <InteractivePowerGraph 
          data={fullPriceData} 
          currentIndex={currentPriceIndex} 
          t={t} 
          locale={language === 'nn' ? 'nn-NO' : 'en-GB'} 
        />
      </div>
    </div>
  );
}
