import { useState, useEffect } from 'react';
import { X, Zap, ToggleLeft, ToggleRight } from '../icons';
import InteractivePowerGraph from '../components/InteractivePowerGraph';

/**
 * NordpoolModal - Modal for displaying Nordpool price information and graph
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.entity - Nordpool sensor entity with price data
 * @param {Array} props.fullPriceData - Complete price data array with { start, end, value }
 * @param {number} props.currentPriceIndex - Index of current price
 * @param {Object} props.priceStats - Price statistics (min, max, avg)
 * @param {string} props.name - Display name for the card
 * @param {Function} props.t - Translation function
 * @param {string} props.language - Current language code
 * @param {Function} props.saveCardSetting - Function to save settings
 * @param {string} props.cardId - ID of the card
 * @param {Object} props.settings - Card settings
 */
export default function NordpoolModal({
  show,
  onClose,
  entity,
  fullPriceData,
  currentPriceIndex,
  priceStats,
  name,
  t,
  language,
  saveCardSetting,
  cardId,
  settings
}) {
  if (!show) return null;

  const translate = t || ((key) => key);
  const [showWithSupport, setShowWithSupport] = useState(settings?.showWithSupport ?? false);
  
  // Sync with settings when they change
  useEffect(() => {
    setShowWithSupport(settings?.showWithSupport ?? false);
  }, [settings?.showWithSupport]);
  
  // Norsk strømstøtte 2025/2026:
  // Terskel: 75 øre/kWh (eks. mva) = 93.75 øre/kWh (inkl. mva)
  // Støtte: (pris eks. mva - 75) × 0.90 × 1.25
  // Input-prisar er inkludert mva
  const applyElStøtte = (priceInclMva) => {
    const threshold = 93.75; // 75 øre eks. mva × 1.25
    if (priceInclMva <= threshold) {
      return priceInclMva;
    }
    const priceExMva = priceInclMva / 1.25;
    const support = (priceExMva - 75) * 0.90 * 1.25;
    return priceInclMva - support;
  };
  
  // Recalculate data with support if enabled
  const displayPriceData = fullPriceData.map(d => ({
    ...d,
    value: showWithSupport ? applyElStøtte(d.value) : d.value
  }));
  
  // Recalculate stats with support if enabled
  const displayPriceStats = {
    min: showWithSupport ? applyElStøtte(priceStats.min) : priceStats.min,
    avg: showWithSupport ? applyElStøtte(priceStats.avg) : priceStats.avg,
    max: showWithSupport ? applyElStøtte(priceStats.max) : priceStats.max
  };

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
        
        <div className="flex items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-6">
            <div 
              className="p-4 rounded-3xl text-amber-400"
              style={{ backgroundColor: 'rgba(217, 119, 6, 0.15)' }}
            >
              <Zap className="w-8 h-8" style={{ strokeWidth: 1.5 }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                {name}{showWithSupport && <span className="text-green-400 ml-2">(med støtte)</span>}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {translate('power.title')}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newValue = !showWithSupport;
              setShowWithSupport(newValue);
              if (saveCardSetting && cardId) {
                saveCardSetting(cardId, 'showWithSupport', newValue);
              }
            }}
            className={`p-3 rounded-full transition-all border flex-shrink-0 ${showWithSupport ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-green-400'}`}
            title={showWithSupport ? 'Med strømstøtte' : 'Utan strømstøtte'}
          >
            {showWithSupport ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
        </div>

        {displayPriceData && displayPriceData.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4">
              {translate('power.price')}
            </h3>
            <InteractivePowerGraph
              key={`graph-${showWithSupport}`}
              data={displayPriceData}
              currentIndex={currentPriceIndex}
              priceStats={displayPriceStats}
              t={translate}
              language={language}
            />
          </div>
        )}

        {displayPriceStats && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
              <p className="text-xs uppercase font-bold text-[var(--text-secondary)] mb-2">{translate('power.low')}</p>
              <p className="text-2xl font-bold text-green-400">{displayPriceStats.min.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
              <p className="text-xs uppercase font-bold text-[var(--text-secondary)] mb-2">{translate('power.avg')}</p>
              <p className="text-2xl font-bold text-blue-400">{displayPriceStats.avg.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
              <p className="text-xs uppercase font-bold text-[var(--text-secondary)] mb-2">{translate('power.high')}</p>
              <p className="text-2xl font-bold text-red-400">{displayPriceStats.max.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
