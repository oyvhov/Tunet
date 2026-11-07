import { useState } from 'react';
import { RefreshCw, Video, Camera } from '../icons';
import { getIconComponent } from '../icons';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';
import Segmented from '../components/ui/Segmented';
import CameraFeed from '../components/camera/CameraFeed';

export default function CameraModal({
  show,
  onClose,
  entityId,
  entity,
  customName,
  customIcon,
  conn,
  getEntityImageUrl,
  settings,
  t,
}) {
  const [viewMode, setViewMode] = useState('stream');
  const [refreshTs, setRefreshTs] = useState(Date.now());
  const modalTitleId = `camera-modal-title-${(entityId || 'camera').replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const activeEntity = entity || { attributes: {} };
  const activeEntityId = entityId || '';
  const attrs = activeEntity.attributes || {};
  const name = customName || attrs.friendly_name || activeEntityId;
  const iconName = customIcon || attrs.icon;
  const Icon = iconName ? getIconComponent(iconName) || Camera : Camera;
  const activeSettings =
    viewMode === 'snapshot' ? { ...settings, cameraStreamEngine: 'snapshot' } : settings;

  if (!show || !entityId || !entity) return null;

  const refreshLabel = t?.('camera.refresh') || 'Refresh';

  return (
    <AccessibleModalShell
      open={show && !!entityId && !!entity}
      onClose={onClose}
      titleId={modalTitleId}
      size="xl"
    >
      {() => (
        <>
          <ModalHeader
            title={name}
            subtitle={entityId}
            closeLabel={t?.('common.close') || 'Close'}
            onClose={onClose}
            icon={<Icon />}
            actions={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setRefreshTs(Date.now())}
                title={refreshLabel}
                aria-label={refreshLabel}
                icon={<RefreshCw className="h-4 w-4" />}
              />
            }
          />

          <ModalBody className="flex flex-col gap-4">
            <Segmented
              ariaLabel={t?.('camera.live') || 'Live view'}
              value={viewMode}
              onChange={(mode) => {
                setViewMode(mode);
                setRefreshTs(Date.now());
              }}
              options={[
                {
                  value: 'stream',
                  label: t?.('camera.stream') || 'Stream',
                  icon: <Video className="h-3.5 w-3.5" />,
                },
                {
                  value: 'snapshot',
                  label: t?.('camera.snapshot') || 'Snapshot',
                  icon: <Camera className="h-3.5 w-3.5" />,
                },
              ]}
            />

            <div className="relative h-[52dvh] min-h-[240px] shrink-0 overflow-hidden rounded-[var(--modal-surface-radius)] border border-[var(--glass-border)] bg-black/70 sm:h-[62dvh] sm:min-h-[420px]">
              <CameraFeed
                entityId={activeEntityId}
                entity={activeEntity}
                conn={conn}
                getEntityImageUrl={getEntityImageUrl}
                settings={activeSettings}
                refreshKey={refreshTs}
                fit="contain"
                controls={viewMode === 'stream'}
                muted
                alt={name}
                t={t}
              />
            </div>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
