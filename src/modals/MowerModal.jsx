import { useMemo } from 'react';
import { Sprout, Battery, MapPin, Play, Pause, Home } from '../icons';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';

const ACTIVE_STATES = ['mowing', 'cleaning'];
const ERROR_STATES = ['error', 'fault', 'problem', 'stuck'];

function getMowerStateLabel(state, battery, t) {
  const normalized = String(state || '').toLowerCase();
  if (!normalized) return t('mower.unknown');
  if (ACTIVE_STATES.includes(normalized)) return t('mower.mowing');
  if (['returning', 'going_home', 'return_to_base'].includes(normalized))
    return t('mower.returning');
  if ((normalized === 'charging' || normalized === 'docked') && battery === 100)
    return t('mower.docked');
  if (normalized === 'docked') return t('mower.charging');
  if (normalized === 'idle' || normalized === 'ready') return t('mower.idle');
  if (normalized === 'paused' || normalized === 'pause') return t('mower.pause');
  if (ERROR_STATES.includes(normalized)) return t('mower.error');
  if (normalized === 'stopped') return t('mower.stopped');
  return state;
}

/**
 * MowerModal - Modal for lawn mower information and controls.
 */
export default function MowerModal({ show, onClose, entities, callService, getA, t, mowerId }) {
  const modalTitleId = `mower-modal-title-${(mowerId || 'mower').replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const entity = mowerId ? entities?.[mowerId] : null;

  const battery = useMemo(() => {
    if (!mowerId) return null;
    const value = getA(mowerId, 'battery_level');
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }, [mowerId, getA]);

  if (!show) return null;
  if (!mowerId || !entity) return null;

  const state = entity?.state;
  const normalized = String(state || '').toLowerCase();
  const isActive = ACTIVE_STATES.includes(normalized);
  const isError = ERROR_STATES.includes(normalized);
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const zone =
    getA(mowerId, 'current_zone') || getA(mowerId, 'zone') || getA(mowerId, 'current_room');
  const friendlyName = entity?.attributes?.friendly_name || mowerId;
  const stateLabel = getMowerStateLabel(state, battery, t);

  const statusColor = isError
    ? 'var(--status-error-fg)'
    : isActive
      ? 'var(--status-success-fg)'
      : 'var(--text-secondary)';
  const statusBg = isError
    ? 'var(--status-error-bg)'
    : isActive
      ? 'var(--status-success-bg)'
      : 'var(--glass-bg)';

  const handlePrimary = () => {
    if (isUnavailable) return;
    callService('lawn_mower', isActive ? 'pause' : 'start_mowing', { entity_id: mowerId });
  };
  const handleDock = () => {
    if (isUnavailable) return;
    callService('lawn_mower', 'dock', { entity_id: mowerId });
  };

  const primaryLabel = isActive ? t('mower.pause') : t('mower.start');

  return (
    <AccessibleModalShell open={show} onClose={onClose} titleId={modalTitleId} size="m">
      {() => (
        <>
          <ModalHeader
            title={friendlyName}
            closeLabel={t('common.close')}
            onClose={onClose}
            icon={<Sprout className={isActive ? 'animate-pulse' : undefined} />}
            iconStyle={{ backgroundColor: statusBg, color: statusColor }}
            status={
              <StatusChip
                tone={isError ? 'error' : isActive ? 'on' : 'neutral'}
                label={stateLabel}
              />
            }
          />

          <ModalBody>
            <div className="popup-surface flex flex-col gap-6 rounded-[var(--modal-surface-radius)] p-6">
              <div className="flex w-full gap-3">
                <Button
                  variant={isActive ? 'secondary' : 'primary'}
                  block
                  onClick={handlePrimary}
                  disabled={isUnavailable}
                  aria-label={primaryLabel}
                  icon={isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                >
                  {primaryLabel}
                </Button>
                <Button
                  variant="secondary"
                  block
                  onClick={handleDock}
                  disabled={isUnavailable}
                  aria-label={t('mower.dock')}
                  icon={<Home className="h-5 w-5" />}
                >
                  {t('mower.dock')}
                </Button>
              </div>

              <div className={`grid gap-4 ${zone ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--glass-bg)] p-4">
                  <Battery
                    className={`h-6 w-6 ${battery != null && battery < 20 ? 'text-[var(--status-error-fg)]' : 'text-[var(--status-success-fg)]'}`}
                  />
                  <span className="text-xl font-light text-[var(--text-primary)]">
                    {battery != null ? `${Math.round(battery)}%` : '--'}
                  </span>
                  <span className="modal-section-label">{t('mower.battery')}</span>
                </div>
                {zone && (
                  <div className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--glass-bg)] p-4">
                    <MapPin className="h-6 w-6 text-[var(--accent-color)]" />
                    <span
                      className="max-w-full truncate px-2 text-xl font-light text-[var(--text-primary)]"
                      title={zone}
                    >
                      {zone}
                    </span>
                    <span className="modal-section-label">{t('mower.zone')}</span>
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
