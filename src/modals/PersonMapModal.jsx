import { X, MapPin, Navigation } from '../icons';
import { resolvePersonLocation, buildOsmEmbedUrl } from '../utils/personLocation';

export default function PersonMapModal({
  show,
  onClose,
  personId,
  settings,
  entities,
  customName,
  t,
}) {
  if (!show || !personId) return null;

  const person = entities?.[personId];
  const name = customName || person?.attributes?.friendly_name || personId;
  const { lat, lon } = resolvePersonLocation(entities, personId, settings?.deviceTracker || null);
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lon);
  const mapUrl = hasLocation ? buildOsmEmbedUrl(lat, lon, 0.02) : null;
  const osmOpenUrl = hasLocation ? `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lon.toFixed(6)}#map=16/${lat.toFixed(6)}/${lon.toFixed(6)}` : null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="border w-full max-w-6xl h-[88vh] sm:h-[92vh] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative font-sans backdrop-blur-xl popup-anim flex flex-col"
        style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 modal-close z-10"><X className="w-4 h-4" /></button>

        <div className="mb-4 pr-12 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)]">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest font-bold text-[var(--text-secondary)] truncate">{personId}</p>
              <h3 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] truncate">{name}</h3>
            </div>
          </div>

          {osmOpenUrl && (
            <a
              href={osmOpenUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:text-[var(--text-primary)]"
            >
              <Navigation className="w-3.5 h-3.5" /> {t('map.openInMap') || 'Open map'}
            </a>
          )}
        </div>

        <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-black/70">
          {hasLocation ? (
            <iframe
              src={mapUrl}
              title={`${name} map modal`}
              className="absolute inset-0 w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
              {t('map.locationUnknown') || 'Location unknown'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
