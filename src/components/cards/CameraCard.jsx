import { useEffect, useMemo, useState } from 'react';
import { Camera, AlertCircle } from '../../icons';
import { getIconComponent } from '../../icons';

function buildCameraUrl(basePath, entityId, accessToken) {
  const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return `${basePath}/${entityId}${tokenQuery}`;
}

function resolveCameraTemplate(urlTemplate, entityId) {
  if (!urlTemplate) return '';
  const objectId = (entityId || '').includes('.') ? entityId.split('.').slice(1).join('.') : entityId;
  return urlTemplate
    .replaceAll('{entity_id}', entityId || '')
    .replaceAll('{entity_object_id}', objectId || '');
}

function normalizeStreamUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== 'rtsp:' && protocol !== 'rtsps:') {
      return { type: 'iframe', url };
    }

    const sourceFromPath = parsed.pathname.replace(/^\/+/, '');
    const source = parsed.searchParams.get('src') || sourceFromPath;
    if (!source) return null;

    const wantsMp4 = parsed.searchParams.has('mp4');
    const browserProtocol = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'https:' : 'http:';
    const base = `${browserProtocol}//${parsed.hostname}:1984`;

    if (wantsMp4) {
      return { type: 'video', url: `${base}/api/stream.mp4?src=${encodeURIComponent(source)}` };
    }

    return { type: 'iframe', url: `${base}/stream.html?src=${encodeURIComponent(source)}` };
  } catch {
    return { type: 'iframe', url };
  }
}

function normalizeHomeAssistantUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
    const path = parsed.pathname || '';
    if (path.startsWith('/api/hassio_ingress/') || path.startsWith('/api/webrtc')) {
      return `${path}${parsed.search || ''}${parsed.hash || ''}`;
    }
    return url;
  } catch {
    return url;
  }
}

function resolveEmbeddableStreamUrl(url) {
  if (!url) return url;

  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined);
    const src = parsed.searchParams.get('src');
    const isIngressStream = parsed.pathname.includes('/api/hassio_ingress/') && parsed.pathname.endsWith('/stream.html');
    const isCrossOrigin = typeof window !== 'undefined' && parsed.origin !== window.location.origin;

    if (!src || !isIngressStream || !isCrossOrigin) {
      return url;
    }

    return `${parsed.protocol}//${parsed.hostname}:1984/stream.html?src=${encodeURIComponent(src)}`;
  } catch {
    return url;
  }
}

function getWebrtcUrlFromStream(streamUrl) {
  if (!streamUrl) return null;

  try {
    const parsed = new URL(streamUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const src = parsed.searchParams.get('src');
    if (!src) return null;

    const normalizedSrc = String(src).trim().toLowerCase();
    if (normalizedSrc.startsWith('rtsp://') || normalizedSrc.startsWith('rtsps://')) {
      return null;
    }

    if (!parsed.pathname.endsWith('/stream.html')) return null;

    const webrtcPath = parsed.pathname.replace(/\/stream\.html$/, '/api/webrtc');
    const query = `src=${encodeURIComponent(src)}`;

    if (streamUrl.startsWith('/')) {
      return `${webrtcPath}?${query}`;
    }

    return `${parsed.origin}${webrtcPath}?${query}`;
  } catch {
    return null;
  }
}

export default function CameraCard({
  cardId,
  entityId,
  entity,
  settings,
  dragProps,
  controls,
  cardStyle,
  editMode,
  customNames,
  customIcons,
  getEntityImageUrl,
  onOpen,
  size,
  t,
}) {
  const [streamError, setStreamError] = useState(false);
  const [streamTransport, setStreamTransport] = useState('stream');

  const attrs = entity?.attributes || {};
  const isOffline = !entity || entity.state === 'unavailable' || entity.state === 'unknown' || entity.state === 'off';
  const name = customNames?.[cardId] || attrs.friendly_name || entityId;
  const iconName = customIcons?.[cardId] || attrs.icon;
  const Icon = iconName ? (getIconComponent(iconName) || Camera) : Camera;
  const isSmall = size === 'small';

  const accessToken = attrs.access_token;

  const haStreamUrl = useMemo(
    () => getEntityImageUrl(buildCameraUrl('/api/camera_proxy_stream', entityId, accessToken)),
    [entityId, accessToken, getEntityImageUrl],
  );

  const customStream = useMemo(() => {
    const template = (settings?.cameraStreamUrl || '').trim();
    const resolved = resolveCameraTemplate(template, entityId);
    if (!resolved) return null;
    const normalized = normalizeStreamUrl(normalizeHomeAssistantUrl(resolved));
    if (!normalized?.url) return null;

    const finalUrl = normalized.url.startsWith('http://') || normalized.url.startsWith('https://')
      ? normalized.url
      : getEntityImageUrl(normalized.url);

    if (!finalUrl) return null;
    return { type: normalized.type, url: resolveEmbeddableStreamUrl(finalUrl) };
  }, [settings?.cameraStreamUrl, entityId, getEntityImageUrl]);

  const webrtcUrl = useMemo(() => {
    if (!customStream || customStream.type !== 'iframe') return null;
    return getWebrtcUrlFromStream(customStream.url);
  }, [customStream]);

  useEffect(() => {
    setStreamTransport(webrtcUrl ? 'webrtc' : 'stream');
  }, [webrtcUrl, customStream?.url]);

  const renderStream = () => {
    if (isOffline) {
      return (
        <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] bg-[var(--glass-bg)]">
          {isSmall ? (
            <Icon className="w-6 h-6 stroke-[1.5px]" />
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-70">
              <AlertCircle className="w-10 h-10" />
              <p className="text-xs font-bold uppercase tracking-widest">{t?.('camera.unavailable') || 'Unavailable'}</p>
            </div>
          )}
        </div>
      );
    }

    if (customStream && !streamError) {
      const activeStreamUrl = streamTransport === 'webrtc' && webrtcUrl ? webrtcUrl : customStream.url;

      if (customStream.type === 'video') {
        return (
          <video
            src={customStream.url}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            onError={() => setStreamError(true)}
          />
        );
      }

      return (
        <iframe
          src={activeStreamUrl}
          title={name}
          className="w-full h-full border-0 pointer-events-none"
          onError={() => {
            if (streamTransport === 'webrtc') {
              setStreamTransport('stream');
              return;
            }
            setStreamError(true);
          }}
          scrolling="no"
        />
      );
    }

    return (
      <img
        src={streamError ? getEntityImageUrl(buildCameraUrl('/api/camera_proxy', entityId, accessToken)) : haStreamUrl}
        alt={name}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setStreamError(true)}
      />
    );
  };

  if (isSmall) {
    return (
      <div
        key={cardId}
        {...dragProps}
        data-haptic={editMode ? undefined : 'card'}
        className={`touch-feedback relative h-full rounded-3xl overflow-hidden border bg-[var(--card-bg)] group transition-all duration-300 ${editMode ? 'cursor-move' : 'cursor-pointer active:scale-[0.98]'}`}
        style={cardStyle}
        onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen?.(); }}
      >
        {controls}

        <div className="absolute inset-0">
          {renderStream()}
        </div>

        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, transparent 35%, rgba(0,0,0,0.45) 100%)' }} />

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest popup-surface text-[var(--text-primary)] border border-[var(--glass-border)]">
          <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-400' : 'bg-emerald-400'}`} />
          {isOffline ? (t?.('camera.unavailable') || 'Unavailable') : (t?.('camera.live') || 'Live')}
        </div>

        <div className="absolute left-2.5 right-2.5 bottom-2.5 flex items-end justify-between gap-2.5">
          <div className="min-w-0 max-w-[80%] px-2.5 py-1.5 rounded-xl popup-surface border border-[var(--glass-border)]">
            <p className="text-[11px] font-bold text-[var(--text-primary)] truncate tracking-wide uppercase">{name}</p>
          </div>
          <div className="shrink-0 p-1.5 rounded-lg popup-surface border border-[var(--glass-border)] text-[var(--text-primary)]">
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={cardId}
      {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      className={`touch-feedback relative h-full rounded-3xl overflow-hidden border bg-[var(--card-bg)] group transition-all duration-300 ${editMode ? 'cursor-move' : 'cursor-pointer active:scale-[0.98]'}`}
      style={cardStyle}
      onClick={(e) => { e.stopPropagation(); if (!editMode) onOpen?.(); }}
    >
      {controls}

      <div className="absolute inset-0">
        {renderStream()}
      </div>

      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, transparent 35%, rgba(0,0,0,0.45) 100%)' }} />

      {/* Status badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest popup-surface text-[var(--text-primary)] border border-[var(--glass-border)]">
        <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-400' : 'bg-emerald-400'}`} />
        {isOffline ? (t?.('camera.unavailable') || 'Unavailable') : (t?.('camera.live') || 'Live')}
      </div>

      {/* Name overlay */}
      <div className="absolute left-3 right-3 bottom-3 flex items-end justify-between gap-3">
        <div className="min-w-0 max-w-[75%] px-3 py-2 rounded-xl popup-surface border border-[var(--glass-border)]">
          <p className="text-xs font-bold text-[var(--text-primary)] truncate tracking-wide uppercase">{name}</p>
        </div>
        <div className="shrink-0 p-2 rounded-xl popup-surface border border-[var(--glass-border)] text-[var(--text-primary)]">
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
