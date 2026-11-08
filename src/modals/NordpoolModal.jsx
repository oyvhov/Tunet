import { useState, useEffect } from 'react';
import { Zap, ToggleLeft, ToggleRight } from '../icons';
import InteractivePowerGraph from '../components/charts/InteractivePowerGraph';
import { useHomeAssistantMeta } from '../contexts';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';
import {
  applyNordpoolSupport,
  getNordpoolOrePerUnit,
  getNordpoolPriceStats,
} from '../services/nordpoolUtils';

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
 * @param {string} [props.settingsKey] - Page-scoped key the card reads its settings from
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
  settingsKey,
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

  const orePerUnit = getNordpoolOrePerUnit(entity);

  // Recalculate data with support if enabled
  const displayPriceData = fullPriceData.map((d) => ({
    ...d,
    value: showWithSupport ? applyNordpoolSupport(d.value, orePerUnit) : d.value,
  }));

  // Support applies per hour, so the stats come from the supported hours.
  const displayPriceStats = showWithSupport
    ? getNordpoolPriceStats(displayPriceData.map((d) => d.value))
    : priceStats;

  const currentPrice = displayPriceData[currentPriceIndex]?.value;
  const toggleSupport = (e) => {
    e.stopPropagation();
    const newValue = !showWithSupport;
    setShowWithSupport(newValue);
    const saveKey = settingsKey || cardId;
    if (saveCardSetting && saveKey) {
      saveCardSetting(saveKey, 'showWithSupport', newValue);
    }
  };
  const supportLabel = showWithSupport
    ? translate('nordpool.withSupport')
    : translate('nordpool.withoutSupport');

  return (
    <AccessibleModalShell open={show} onClose={onClose} titleId={modalTitleId} size="l">
      {() => (
        <>
          <ModalHeader
            title={name}
            closeLabel={translate('common.close')}
            onClose={onClose}
            icon={<Zap />}
            iconClassName="bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]"
            status={
              <StatusChip
                label={translate('power.title')}
                detail={
                  Number.isFinite(currentPrice) ? `${currentPrice.toFixed(2)} ${currency}` : null
                }
              />
            }
            actions={
              <Button
                size="sm"
                variant="secondary"
                aria-pressed={showWithSupport}
                aria-label={supportLabel}
                onClick={toggleSupport}
                icon={
                  showWithSupport ? (
                    <ToggleRight className="h-4 w-4 text-[var(--accent-color)]" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )
                }
              >
                <span className="hidden sm:inline">{supportLabel}</span>
              </Button>
            }
          />

          <ModalBody className="grid items-start gap-4 sm:gap-6 lg:grid-cols-5">
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

            <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:col-span-2 lg:grid-cols-2">
              {displayPriceStats && (
                <>
                  <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-2xl p-3 transition-all sm:gap-2 sm:rounded-[var(--modal-surface-radius)] sm:p-8 lg:col-span-2">
                    <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--accent-color)] uppercase sm:text-xs">
                      {translate('power.avg')}
                    </p>
                    <div className="flex items-baseline gap-1 sm:gap-2">
                      <span className="text-2xl leading-none font-light text-[var(--accent-color)] tabular-nums sm:text-6xl">
                        {displayPriceStats.avg.toFixed(2)}
                      </span>
                      <span className="text-[11px] font-medium text-[var(--text-muted)] sm:text-xl">
                        {currency}
                      </span>
                    </div>
                  </div>

                  <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-2xl p-3 sm:rounded-[var(--modal-surface-radius)] sm:p-6">
                    <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--status-success-fg)] uppercase sm:mb-1 sm:text-xs">
                      {translate('power.low')}
                    </p>
                    <p className="text-2xl font-light text-[var(--text-primary)] tabular-nums sm:text-3xl">
                      {displayPriceStats.min.toFixed(2)}
                    </p>
                  </div>
                  <div className="popup-surface flex flex-col items-center justify-center gap-1 rounded-2xl p-3 sm:rounded-[var(--modal-surface-radius)] sm:p-6">
                    <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--status-error-fg)] uppercase sm:mb-1 sm:text-xs">
                      {translate('power.high')}
                    </p>
                    <p className="text-2xl font-light text-[var(--text-primary)] tabular-nums sm:text-3xl">
                      {displayPriceStats.max.toFixed(2)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
