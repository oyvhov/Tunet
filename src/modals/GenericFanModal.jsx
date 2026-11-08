import { useEffect, useMemo, useState } from 'react';
import { Fan, Power, RefreshCw, MoveHorizontal, RotateCw } from '../icons';
import M3Slider from '../components/ui/M3Slider';
import ModernDropdown from '../components/ui/ModernDropdown';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';

const FAN_FEATURE = {
  SET_SPEED: 1,
  OSCILLATE: 2,
  DIRECTION: 4,
  PRESET_MODE: 8,
  TURN_OFF: 16,
  TURN_ON: 32,
};

const supportsFeature = (supportedFeatures, bitMask) => {
  if (!Number.isFinite(supportedFeatures)) return false;
  return (supportedFeatures & bitMask) !== 0;
};

export default function GenericFanModal({ show, onClose, entityId, entity, callService, t }) {
  const activeEntityId = entityId || '';
  const activeEntity = entity || { state: 'unknown', attributes: {} };

  const state = String(activeEntity.state || 'unknown').toLowerCase();
  const isOn = state === 'on';
  const isUnavailable = state === 'unavailable' || state === 'unknown';

  const supportedFeatures = Number(activeEntity.attributes?.supported_features || 0);
  const canTurnOn = supportsFeature(supportedFeatures, FAN_FEATURE.TURN_ON);
  const canTurnOff = supportsFeature(supportedFeatures, FAN_FEATURE.TURN_OFF);
  const hasPowerControl = canTurnOn || canTurnOff;
  const hasPercentageControl = supportsFeature(supportedFeatures, FAN_FEATURE.SET_SPEED);
  const hasOscillationControl = supportsFeature(supportedFeatures, FAN_FEATURE.OSCILLATE);
  const hasDirectionControl = supportsFeature(supportedFeatures, FAN_FEATURE.DIRECTION);
  const hasPresetControl = supportsFeature(supportedFeatures, FAN_FEATURE.PRESET_MODE);

  const percentageStep = Number(activeEntity.attributes?.percentage_step || 1);
  const minimumStep = Number.isFinite(percentageStep) && percentageStep > 0 ? percentageStep : 1;
  const percentageRaw = Number(activeEntity.attributes?.percentage ?? 0);
  const percentage = Number.isFinite(percentageRaw)
    ? Math.max(0, Math.min(100, Math.round(percentageRaw)))
    : 0;
  const oscillating =
    activeEntity.attributes?.oscillating === true || activeEntity.attributes?.oscillating === 'on';
  const direction = activeEntity.attributes?.direction || null;
  const presetMode = activeEntity.attributes?.preset_mode || null;
  const presetModes = Array.isArray(activeEntity.attributes?.preset_modes)
    ? activeEntity.attributes.preset_modes
    : [];
  const fanName = activeEntity.attributes?.friendly_name || activeEntityId;
  const modalTitleId = `fan-modal-title-${activeEntityId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const [sliderValue, setSliderValue] = useState(percentage);

  useEffect(() => {
    if (!show) return;
    setSliderValue(percentage);
  }, [percentage, show]);

  useEffect(() => {
    if (!show || !activeEntityId || !entity || !hasPercentageControl) return undefined;
    const timeoutId = setTimeout(() => {
      if (sliderValue !== percentage) {
        callService('fan', 'set_percentage', {
          entity_id: activeEntityId,
          percentage: sliderValue,
        });
      }
    }, 180);
    return () => clearTimeout(timeoutId);
  }, [sliderValue, percentage, hasPercentageControl, activeEntityId, callService, show, entity]);

  const status = useMemo(() => {
    if (state === 'unavailable') return { label: t('status.unavailable'), detail: null };
    if (isUnavailable) return { label: t('common.unknown'), detail: null };
    if (!isOn) return { label: t('status.off'), detail: null };
    const detail =
      hasPresetControl && presetMode
        ? String(presetMode)
        : hasPercentageControl
          ? `${percentage}%`
          : null;
    return { label: t('status.on'), detail };
  }, [
    state,
    isUnavailable,
    isOn,
    presetMode,
    percentage,
    t,
    hasPresetControl,
    hasPercentageControl,
  ]);

  const handlePowerToggle = () => {
    if (!activeEntityId || !entity || !hasPowerControl || isUnavailable) return;
    if (isOn) {
      if (!canTurnOff) return;
      callService('fan', 'turn_off', { entity_id: activeEntityId });
      return;
    }
    if (!canTurnOn) return;
    callService('fan', 'turn_on', { entity_id: activeEntityId });
  };

  const directionMap = {
    forward: t('fan.direction.forward'),
    reverse: t('fan.direction.reverse'),
  };

  const hasSideControls = hasDirectionControl || hasPresetControl;

  if (!show || !activeEntityId || !entity) return null;

  return (
    <AccessibleModalShell
      open={show && !!activeEntityId && !!entity}
      onClose={onClose}
      titleId={modalTitleId}
      size={hasSideControls ? 'l' : 'm'}
    >
      {() => (
        <>
          <ModalHeader
            title={fanName}
            closeLabel={t('common.close')}
            onClose={onClose}
            icon={<Fan className={isOn ? 'animate-spin [animation-duration:2.4s]' : ''} />}
            iconClassName={isOn ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : ''}
            status={
              <StatusChip
                tone={state === 'unavailable' ? 'error' : isOn ? 'on' : 'neutral'}
                label={status.label}
                detail={status.detail}
              />
            }
          />

          <ModalBody className={hasSideControls ? 'grid items-start gap-6 lg:grid-cols-5' : ''}>
            <div className={hasSideControls ? 'lg:col-span-3' : ''}>
              <div className="popup-surface flex flex-col gap-6 rounded-[var(--modal-surface-radius)] p-4 sm:p-6">
                {(hasPowerControl || hasOscillationControl) && (
                  <div className="flex w-full gap-3">
                    {hasPowerControl && (
                      <Button
                        variant={isOn ? 'destructive' : 'primary'}
                        onClick={handlePowerToggle}
                        icon={<Power className="h-5 w-5" />}
                        className="flex-1"
                      >
                        {isOn ? t('fan.turnOff') : t('fan.turnOn')}
                      </Button>
                    )}
                    {hasOscillationControl && (
                      <Button
                        variant={oscillating ? 'primary' : 'secondary'}
                        aria-pressed={oscillating}
                        onClick={() =>
                          callService('fan', 'oscillate', {
                            entity_id: activeEntityId,
                            oscillating: !oscillating,
                          })
                        }
                        icon={<MoveHorizontal className="h-5 w-5" />}
                        className="flex-1"
                      >
                        {t('fan.oscillate')}
                      </Button>
                    )}
                  </div>
                )}

                {hasPercentageControl && (
                  <div>
                    <div className="mb-4 flex items-end justify-between px-1">
                      <span className="modal-section-label">{t('fan.speed')}</span>
                      <span className="text-lg font-medium text-[var(--text-primary)] tabular-nums">
                        {sliderValue}%
                      </span>
                    </div>
                    <M3Slider
                      min={0}
                      max={100}
                      step={minimumStep}
                      value={sliderValue}
                      onChange={(event) => setSliderValue(Number(event.target.value))}
                      colorClass="bg-[var(--accent-color)]"
                    />
                  </div>
                )}
              </div>
            </div>

            {hasSideControls && (
              <div className="flex flex-col justify-start space-y-6 lg:col-span-2">
                {hasDirectionControl && (
                  <ModernDropdown
                    label={t('fan.direction')}
                    icon={RotateCw}
                    options={['forward', 'reverse']}
                    current={direction}
                    onChange={(value) =>
                      callService('fan', 'set_direction', {
                        entity_id: activeEntityId,
                        direction: value,
                      })
                    }
                    placeholder={t('dropdown.noneSelected')}
                    map={directionMap}
                  />
                )}

                {hasPresetControl && (
                  <ModernDropdown
                    label={t('fan.preset')}
                    icon={RefreshCw}
                    options={presetModes}
                    current={presetMode}
                    onChange={(value) =>
                      callService('fan', 'set_preset_mode', {
                        entity_id: activeEntityId,
                        preset_mode: value,
                      })
                    }
                    placeholder={t('dropdown.noneSelected')}
                    map={{}}
                  />
                )}
              </div>
            )}
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
