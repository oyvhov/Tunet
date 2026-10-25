import { useState, useEffect } from 'react';
import { X, Zap, ToggleLeft, ToggleRight } from '../icons';
import InteractivePowerGraph from '../components/charts/InteractivePowerGraph';
import { useHomeAssistantMeta } from '../contexts';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';

/**
 * NordpoolModal - Modal for displaying Nordpool price information and graph
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {(e?: any) => void} props.onClose - Function to close modal
 * @param {Object} props.entity - Nordpool sensor entity with price data
 * @param {Array} props.fullPriceData - Complete price data array with { start, end, value }
 * @param {number} props.currentPriceIndex - Index of current price
 * @param {Object} props.priceStats - Price statistics (min, max, avg)
 * @param {string} props.name - Display name for the card
 * @param {(key: string) => string} props.t - Translation function
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
  const modalTitleId = 'nordpool-modal-title';

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
    <AccessibleModalShell
      open={show}
      onClose={onClose}
      titleId={modalTitleId}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      panelClassName="popup-anim relative max-h-[calc(100dvh-1rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border p-4 font-sans backdrop-blur-xl sm:max-h-[90vh] sm:p-6 md:rounded-[3rem] md:p-12"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
          <div className="absolute top-4 right-4 z-20 flex gap-2 sm:top-6 sm:right-6 sm:gap-3 md:top-10 md:right-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newValue = !showWithSupport;
                setShowWithSupport(newValue);
                if (saveCardSetting && cardId) {
                  saveCardSetting(cardId, 'showWithSupport', newValue);
                }
              }}
              className={`flex h-9 items-center gap-2 rounded-full border px-4 shadow-lg backdrop-blur-md transition-all ${showWithSupport ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)] hover:opacity-90' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
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
            <button
              onClick={onClose}
              className="modal-close"
              aria-label={translate('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Header Section */}
          <div className="mb-4 flex items-center gap-3 pr-24 font-sans sm:mb-6 sm:gap-4 sm:pr-0">
            <div
              className="rounded-2xl p-3 transition-all duration-500 sm:p-4"
              style={{ backgroundColor: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24' }}
            >
              <Zap className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h3
                id={modalTitleId}
                className="text-xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic sm:text-2xl"
              >
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

          <div className="grid grid-cols-1 items-start gap-4 font-sans sm:gap-12 lg:grid-cols-5">
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
            <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:col-span-2 lg:grid-cols-2">
              {displayPriceStats && (
                <>
                  <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-2xl p-3 transition-all sm:gap-2 sm:rounded-3xl sm:p-8 lg:col-span-2">
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--accent-color)] uppercase sm:text-xs sm:tracking-[0.2em]">
                      {translate('power.avg')}
                    </p>
                    <div className="flex items-baseline gap-1 sm:gap-2">
                      <span className="text-2xl leading-none font-light text-[var(--accent-color)] italic sm:text-6xl">
                        {displayPriceStats.avg.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-medium text-[var(--text-muted)] sm:text-xl">
                        {currency}
                      </span>
                    </div>
                  </div>

                  <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-2xl p-3 sm:rounded-3xl sm:p-6">
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--status-success-fg)] uppercase sm:mb-1 sm:text-xs sm:tracking-[0.2em]">
                      {translate('power.low')}
                    </p>
                    <p className="text-2xl font-light text-[var(--text-primary)] sm:text-3xl">
                      {displayPriceStats.min.toFixed(2)}
                    </p>
                  </div>
                  <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-2xl p-3 sm:rounded-3xl sm:p-6">
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--status-error-fg)] uppercase sm:mb-1 sm:text-xs sm:tracking-[0.2em]">
                      {translate('power.high')}
                    </p>
                    <p className="text-2xl font-light text-[var(--text-primary)] sm:text-3xl">
                      {displayPriceStats.max.toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </AccessibleModalShell>
  );
}
