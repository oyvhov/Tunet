import { Camera } from '../../icons';
import { getIconComponent } from '../../icons';

function buildCameraSnapshotPath(entityId, accessToken) {
  const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return `/api/camera_proxy/${entityId}${tokenQuery}`;
}

export default function CameraCard({
  cardId,
  entityId,
  entity,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  getEntityImageUrl,
  onOpen,
  t,
}) {
  const attrs = entity?.attributes || {};
  const isOffline = !entity || entity.state === 'unavailable' || entity.state === 'unknown' || entity.state === 'off';
  const name = customNames?.[cardId] || attrs.friendly_name || entityId;

  const iconName = customIcons?.[cardId] || attrs.icon;
  const Icon = iconName ? (getIconComponent(iconName) || Camera) : Camera;

  const accessToken = attrs.access_token;
  const snapshotPath = buildCameraSnapshotPath(entityId, accessToken);
  const entityPicture = attrs.entity_picture || null;
  const previewUrl = getEntityImageUrl(entityPicture || snapshotPath);

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      className={`touch-feedback relative h-full rounded-3xl overflow-hidden border group ${editMode ? 'cursor-move' : 'cursor-pointer active:scale-[0.98]'}`}
      style={cardStyle}
      onClick={(e) => {
        e.stopPropagation();
        if (!editMode) onOpen?.();
      }}
    >
      {controls}

      {previewUrl && !isOffline ? (
        <img
          src={previewUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--glass-bg)]">
          <Icon className="w-12 h-12 text-[var(--text-secondary)] opacity-70" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-black/40 text-white border border-white/20">
        <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-400' : 'bg-emerald-400'}`} />
        {isOffline ? (t?.('camera.unavailable') || 'Unavailable') : (t?.('camera.live') || 'Live')}
      </div>

      <div className="absolute left-3 right-3 bottom-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest font-bold text-white/70 truncate">{entityId}</p>
          <p className="text-sm font-bold text-white truncate">{name}</p>
        </div>
        <div className="shrink-0 p-2 rounded-xl bg-black/40 border border-white/20 text-white">
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
