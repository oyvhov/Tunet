import { MapPin, User } from '../../icons';
import { resolvePersonLocation, buildOsmEmbedUrl } from '../../utils/personLocation';

export default function PersonMapCard({
  cardId,
  personId,
  settings,
  entities,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  onOpen,
  t,
}) {
  const person = entities?.[personId];
  const name = customNames?.[cardId] || person?.attributes?.friendly_name || personId;
  const { lat, lon } = resolvePersonLocation(entities, personId, settings?.deviceTracker || null);
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lon);
  const mapUrl = hasLocation ? buildOsmEmbedUrl(lat, lon, 0.0075) : null;

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

      {hasLocation ? (
        <iframe
          src={mapUrl}
          title={`${name} map`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--glass-bg)]">
          <MapPin className="w-10 h-10 text-[var(--text-secondary)] opacity-70" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />

      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-black/40 text-white border border-white/20">
        <User className="w-3 h-3" />
        {person?.state === 'home' ? (t('status.home') || 'Home') : (person?.state === 'not_home' ? (t('status.notHome') || 'Away') : (person?.state || '--'))}
      </div>

      <div className="absolute left-3 right-3 bottom-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest font-bold text-white/70 truncate">{personId}</p>
          <p className="text-sm font-bold text-white truncate">{name}</p>
          <p className="text-[11px] text-white/75 truncate">{hasLocation ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : (t('map.locationUnknown') || 'Location unknown')}</p>
        </div>
        <div className="shrink-0 p-2 rounded-xl bg-black/40 border border-white/20 text-white">
          <MapPin className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
