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
  settings,
}) {
  const { haConfig } = useHomeAssistantMeta();
  const translate = t || ((key) => key);
  const currency = settings?.currency || haConfig?.currency || 'kr';
  const [showWithSupport, setShowWithSupport] = useState(settings?.showWithSupport ?? false);

  // Sync with settings when they change
  useEffect(() => {
    if (!show) return;
    setShowWithSupport(settings?.showWithSupport ?? false);
  }, [show, settings?.showWithSupport]);

  if (!show) return null;

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
    const support = (priceExMva - 75) * 0.9 * 1.25;
    return priceInclMva - support;
  };

  // Recalculate data with support if enabled
  const displayPriceData = fullPriceData.map((d) => ({
    ...d,
    value: showWithSupport ? applyElStøtte(d.value) : d.value,
  }));

  // Recalculate stats with support if enabled
  const displayPriceStats = {
    min: showWithSupport ? applyElStøtte(priceStats.min) : priceStats.min,
    avg: showWithSupport ? applyElStøtte(priceStats.avg) : priceStats.avg,
    max: showWithSupport ? applyElStøtte(priceStats.max) : priceStats.max,
  };

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
        <div className="absolute top-6 right-6 z-20 flex gap-3 md:top-10 md:right-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const newValue = !showWithSupport;
              setShowWithSupport(newValue);
              if (saveCardSetting && cardId) {
                saveCardSetting(cardId, 'showWithSupport', newValue);
              }
            }}
            className={`flex h-9 items-center gap-2 rounded-full border px-4 shadow-lg backdrop-blur-md transition-all ${showWithSupport ? 'border-green-500/30 bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
          >
            {showWithSupport ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
            <span className="hidden text-[10px] font-bold tracking-widest uppercase sm:inline">
              {showWithSupport ? t('nordpool.withSupport') : t('nordpool.withoutSupport')}
            </span>
          </button>
          <button onClick={onClose} className="modal-close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Header Section */}
        <div className="mb-6 flex items-center gap-4 font-sans">
          <div
            className="rounded-2xl p-4 transition-all duration-500"
            style={{ backgroundColor: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24' }}
          >
            <Zap className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic">
              {name}
            </h3>
            <div
              className="mt-2 inline-block rounded-full border px-3 py-1 transition-all duration-500"
              style={{
                backgroundColor: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
            >
              <p className="text-[10px] font-bold tracking-widest uppercase italic">
                {translate('power.title')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-12 font-sans lg:grid-cols-5">
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
          <div className="space-y-6 lg:col-span-2">
            {displayPriceStats && (
              <>
                <div className="popup-surface flex flex-col items-center gap-2 rounded-3xl p-8 transition-all">
                  <p className="text-xs font-bold tracking-[0.2em] text-[var(--accent-color)] uppercase">
                    {translate('power.avg')}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl leading-none font-light text-[var(--accent-color)] italic">
                      {displayPriceStats.avg.toFixed(2)}
                    </span>
                    <span className="text-xl font-medium text-gray-500">{currency}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-3xl p-6">
                    <p className="mb-1 text-xs font-bold tracking-[0.2em] text-green-400 uppercase">
                      {translate('power.low')}
                    </p>
                    <p className="text-3xl font-light text-[var(--text-primary)]">
                      {displayPriceStats.min.toFixed(2)}
                    </p>
                  </div>
                  <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-3xl p-6">
                    <p className="mb-1 text-xs font-bold tracking-[0.2em] text-red-400 uppercase">
                      {translate('power.high')}
                    </p>
                    <p className="text-3xl font-light text-[var(--text-primary)]">
                      {displayPriceStats.max.toFixed(2)}
                    </p>
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
