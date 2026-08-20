import { useState } from 'react';
import { X, RefreshCw, Video, Camera } from '../icons';
import { getIconComponent } from '../icons';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
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

  return (
    <AccessibleModalShell
      open={show && !!entityId && !!entity}
      onClose={onClose}
      titleId={modalTitleId}
      overlayClassName="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-5"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      panelClassName="popup-anim relative flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col rounded-2xl border p-3 font-sans shadow-2xl backdrop-blur-xl sm:max-h-[92vh] sm:rounded-3xl sm:p-6"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
          <button
            onClick={onClose}
            className="modal-close absolute top-3 right-3 z-10 sm:top-6 sm:right-6"
            aria-label={t?.('common.close') || 'Close'}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-3 flex flex-col gap-3 pr-11 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pr-12">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase sm:text-xs">
                  {entityId}
                </p>
                <h3
                  id={modalTitleId}
                  className="truncate text-lg font-bold text-[var(--text-primary)] sm:text-2xl"
                >
                  {name}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:flex sm:items-center">
              <button
                type="button"
                aria-pressed={viewMode === 'stream'}
                onClick={() => {
                  setViewMode('stream');
                  setRefreshTs(Date.now());
                }}
                className={`rounded-xl border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors sm:text-xs ${viewMode === 'stream' ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
              >
                <span className="inline-flex items-center gap-1">
                  <Video className="h-3.5 w-3.5" /> {t?.('camera.stream') || 'Stream'}
                </span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'snapshot'}
                onClick={() => {
                  setViewMode('snapshot');
                  setRefreshTs(Date.now());
                }}
                className={`rounded-xl border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors sm:text-xs ${viewMode === 'snapshot' ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
              >
                <span className="inline-flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> {t?.('camera.snapshot') || 'Snapshot'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRefreshTs(Date.now())}
                className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                title={t?.('camera.refresh') || 'Refresh'}
                aria-label={t?.('camera.refresh') || 'Refresh'}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative h-[52dvh] min-h-[240px] shrink-0 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-black/70 sm:h-[68dvh] sm:min-h-[420px]">
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
        </>
      )}
    </AccessibleModalShell>
  );
}
