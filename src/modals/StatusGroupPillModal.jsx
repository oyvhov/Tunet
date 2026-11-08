import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Check, getIconComponent } from '../icons';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalFooter, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';
import { getStatusGroupStateLabel, resolveStatusGroupPill } from '../utils/statusGroupPills';

const translate = (t, key, fallback) => {
  const value = typeof t === 'function' ? t(key) : key;
  return value && value !== key ? String(value) : fallback;
};

const getEntityName = (id, entity) => entity?.attributes?.friendly_name || id;

export default function StatusGroupPillModal({
  show,
  onClose,
  modalState,
  entities,
  callService,
  t,
}) {
  const pill = modalState?.pill || null;
  const groupData = useMemo(
    () => (pill ? resolveStatusGroupPill(pill, entities, t) : null),
    [entities, pill, t]
  );
  const preset = groupData?.preset || null;
  const items = groupData?.matchedEntities || [];
  const title = groupData?.syntheticEntity?.attributes?.friendly_name || '';
  const Icon =
    getIconComponent(pill?.icon || preset?.icon || 'Activity') || getIconComponent('Activity');
  const hasAction = Boolean(preset?.actionDomain && preset?.actionService && callService);
  const actionLabel = preset
    ? translate(t, preset.actionLabelKey, preset.fallbackActionLabel || '')
    : '';
  const rowActionLabel = preset
    ? translate(t, preset.rowActionLabelKey, preset.fallbackRowActionLabel || '')
    : '';
  const modalTitleId = 'status-group-pill-modal-title';

  const runAction = (entityIds) => {
    if (!hasAction || !entityIds.length) return;
    callService(preset.actionDomain, preset.actionService, { entity_id: entityIds });
  };

  if (!show || !pill || !groupData || !preset) return null;

  return (
    <AccessibleModalShell open={show} onClose={onClose} titleId={modalTitleId} size="m">
      {() => (
        <>
          <ModalHeader
            title={title}
            closeLabel={translate(t, 'common.close', 'Close')}
            onClose={onClose}
            icon={<Icon className={pill.iconColor || preset.iconColor} />}
            iconStyle={{ backgroundColor: pill.iconBgColor || preset.iconBgColor }}
            status={
              <StatusChip
                tone={items.length > 0 ? 'accent' : 'neutral'}
                label={`${items.length} ${translate(t, 'statusPills.groupMatchedEntities', 'matching')}`}
              />
            }
            subtitle={groupData.syntheticEntity.attributes.statusPillSublabel}
          />

          <ModalBody>
            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map(({ id, entity }) => (
                  <div
                    key={id}
                    className="popup-surface flex items-center justify-between gap-3 rounded-[var(--modal-surface-radius)] px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                        {getEntityName(id, entity)}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{id}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-[var(--glass-bg)] px-2 py-1 text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                        {getStatusGroupStateLabel(id, entity, t)}
                      </span>
                      {hasAction && rowActionLabel && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="min-h-11"
                          onClick={() => runAction([id])}
                        >
                          {rowActionLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="popup-surface rounded-[var(--modal-surface-radius)] p-6 text-center text-sm text-[var(--text-muted)]">
                {translate(t, preset.emptyLabelKey, preset.fallbackEmptyLabel)}
              </div>
            )}
          </ModalBody>

          {hasAction && items.length > 0 && (
            <ModalFooter>
              <Button
                variant="primary"
                icon={<Check />}
                onClick={() => runAction(items.map(({ id }) => id))}
              >
                {actionLabel}
              </Button>
            </ModalFooter>
          )}
        </>
      )}
    </AccessibleModalShell>
  );
}

StatusGroupPillModal.propTypes = {
  show: PropTypes.bool,
  onClose: PropTypes.func,
  modalState: PropTypes.shape({
    pill: PropTypes.object,
    presetId: PropTypes.string,
  }),
  entities: PropTypes.object,
  callService: PropTypes.func,
  t: PropTypes.func,
};
