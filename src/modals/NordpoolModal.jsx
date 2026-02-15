import { useState, useEffect } from 'react';
import { X, Zap, ToggleLeft, ToggleRight } from '../icons';
import InteractivePowerGraph from '../components/charts/InteractivePowerGraph';
import { useHomeAssistantMeta } from '../contexts';

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
  entity: _entity,
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

  const { haConfig } = useHomeAssistantMeta();
  const translate = t || ((key) => key);
  const currency = settings?.currency || haConfig?.currency || 'kr';
  const [showWithSupport, setShowWithSupport] = useState(settings?.showWithSupport ?? false);
  
  // Sync with settings when they change
  useEffect(() => {
    setShowWithSupport(settings?.showWithSupport ?? false);
  }, [settings?.showWithSupport]);
  
  // Norwegian electricity price support 2025/2026:
  // Threshold: 75 øre/kWh (excl. VAT) = 93.75 øre/kWh (incl. VAT)
  // Subsidy: (price excl. VAT - 75) × 0.90 × 1.25
  // Input prices include VAT
  const applyElStøtte = (priceInclMva) => {
    const threshold = 93.75; // 75 øre excl. VAT × 1.25
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
        <div className="absolute top-6 right-6 md:top-10 md:right-10 flex gap-3 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newValue = !showWithSupport;
                setShowWithSupport(newValue);
                if (saveCardSetting && cardId) {
                  saveCardSetting(cardId, 'showWithSupport', newValue);
                }
              }}
              className={`h-9 px-4 rounded-full border transition-all flex items-center gap-2 backdrop-blur-md shadow-lg ${showWithSupport ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30' : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
               {showWithSupport ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
               <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">{showWithSupport ? t('nordpool.withSupport') : t('nordpool.withoutSupport')}</span>
            </button>
            <button onClick={onClose} className="modal-close"><X className="w-4 h-4" /></button>
        </div>
        
          {/* Header Section */}
          <div className="flex items-center gap-4 mb-6 font-sans">
            <div className="p-4 rounded-2xl transition-all duration-500" style={{ backgroundColor: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24' }}>
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">
                {name}
              </h3>
              <div className="mt-2 px-3 py-1 rounded-full border inline-block transition-all duration-500" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>
               <p className="text-[10px] uppercase font-bold italic tracking-widest">{translate('power.title')}</p>
              </div>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start font-sans">
          
           {/* Left Column - Graph (Span 3) */}
           <div className="lg:col-span-3">
              {displayPriceData && displayPriceData.length > 0 && (
                <div className="w-full">
                  <InteractivePowerGraph
                    key={`graph-${showWithSupport}`}
                    data={displayPriceData}
                    currentIndex={currentPriceIndex}
                    priceStats={displayPriceStats}
                    t={translate}
                    language={language}
                    unit={currency}
                  />
                </div>
              )}
           </div>

           {/* Right Column - Stats (Span 2) */}
           <div className="lg:col-span-2 space-y-6">
              {displayPriceStats && (
                  <>
                     <div className="p-8 rounded-3xl popup-surface flex flex-col items-center gap-2 transition-all">
                        <p className="text-xs text-blue-400 uppercase font-bold tracking-[0.2em]">{translate('power.avg')}</p>
                        <div className="flex items-baseline gap-2">
                           <span className="text-6xl font-light italic text-blue-400 leading-none">{displayPriceStats.avg.toFixed(2)}</span>
                           <span className="text-xl text-gray-500 font-medium">{currency}</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 rounded-3xl popup-surface flex flex-col items-center justify-center gap-1">
                           <p className="text-xs text-green-400 uppercase font-bold tracking-[0.2em] mb-1">{translate('power.low')}</p>
                           <p className="text-3xl font-light text-[var(--text-primary)]">{displayPriceStats.min.toFixed(2)}</p>
                        </div>
                        <div className="p-6 rounded-3xl popup-surface flex flex-col items-center justify-center gap-1">
                           <p className="text-xs text-red-400 uppercase font-bold tracking-[0.2em] mb-1">{translate('power.high')}</p>
                           <p className="text-3xl font-light text-[var(--text-primary)]">{displayPriceStats.max.toFixed(2)}</p>
                        </div>
                     </div>
                  </>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
