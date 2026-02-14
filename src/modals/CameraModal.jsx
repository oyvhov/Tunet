import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Video, VideoOff, Eye, EyeOff, Power, PowerOff, RefreshCw, X } from '../icons';
import { getIconComponent } from '../icons';

export default function CameraModal({
  show,
  onClose,
  entityId,
  entity,
  callService,
  getEntityImageUrl,
  conn,
  customIcons,
  t: _t,
}) {
  const translate = _t || ((k) => k);

  if (!entity || !entityId) return null;

  const state = entity.state;
  const isUnavailable = state === 'unavailable' || state === 'unknown' || !state;
  const isRecording = state === 'recording';
  const isStreaming = state === 'streaming';

  const name = entity.attributes?.friendly_name || entityId;
  const brand = entity.attributes?.brand || '';
  const model = entity.attributes?.model_id || '';
  const streamType = entity.attributes?.frontend_stream_type || '';
  const supportedFeatures = entity.attributes?.supported_features ?? 0;
  const supportsOnOff = (supportedFeatures & 1) !== 0;
  const supportsStream = (supportedFeatures & 2) !== 0;
  const motionDetection = entity.attributes?.motion_detection;

  const cameraIconName = customIcons?.[entityId] || entity?.attributes?.icon;
  const Icon = cameraIconName ? (getIconComponent(cameraIconName) || Camera) : Camera;

  // Snapshot with periodic refresh
  const [refreshInterval] = useState(5000);
  const [cacheBust, setCacheBust] = useState(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setCacheBust(Date.now()), refreshInterval);
    return () => clearInterval(intervalRef.current);
  }, [refreshInterval]);

  const rawPicture = entity?.attributes?.entity_picture;
  const baseUrl = getEntityImageUrl ? getEntityImageUrl(rawPicture) : rawPicture;
  const snapshotUrl = baseUrl
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}ts=${cacheBust}`
    : null;

  // HLS live stream
  const [streamUrl, setStreamUrl] = useState(null);
  const [viewMode, setViewMode] = useState('snapshot'); // 'snapshot' | 'live'
  const [isStartingLive, setIsStartingLive] = useState(false);
  const videoRef = useRef(null);

  const requestStream = useCallback(async () => {
    if (!conn || !supportsStream) return;

    setIsStartingLive(true);

    try {
      if (callService) {
        try {
          await callService('camera', 'play_stream', {
            entity_id: entityId,
            format: 'hls',
          });
        } catch {
          // Not all cameras support play_stream; continue with direct stream request.
        }
      }

      const result = await conn.sendMessagePromise({
        type: 'camera/stream',
        entity_id: entityId,
      });
      if (result?.url) {
        const activeUrl = getEntityImageUrl?.('/') || '';
        const base = activeUrl.replace(/\/$/, '');
        setStreamUrl(`${base}${result.url}`);
        setViewMode('live');
        return true;
      }
      return false;
    } catch (err) {
      console.error('[CameraModal] Stream request failed:', err);
      return false;
    } finally {
      setIsStartingLive(false);
    }
  }, [conn, entityId, supportsStream, getEntityImageUrl, callService]);

  useEffect(() => {
    if (!show || !supportsStream) return;

    let cancelled = false;

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const startLiveWithFallback = async () => {
      setViewMode('live');

      let streamReady = await requestStream();
      if (cancelled || streamReady) return;

      if (supportsOnOff && state === 'off' && callService) {
        try {
          await callService('camera', 'turn_on', { entity_id: entityId });
          await wait(1200);
          streamReady = await requestStream();
          if (cancelled || streamReady) return;
        } catch {
          // Continue to retries below
        }
      }

      for (const delayMs of [1500, 2500]) {
        if (cancelled || streamReady) return;
        await wait(delayMs);
        streamReady = await requestStream();
      }

      if (!cancelled && !streamReady) {
        setViewMode('snapshot');
      }
    };

    startLiveWithFallback();

    return () => {
      cancelled = true;
      setIsStartingLive(false);
    };
  }, [show, supportsStream, supportsOnOff, state, entityId, callService, requestStream]);

  // Load HLS.js dynamically when switching to live view
  useEffect(() => {
    if (viewMode !== 'live' || !streamUrl || !videoRef.current) return;
    let hls = null;

    const loadStream = async () => {
      const video = videoRef.current;
      if (!video) return;

      // Safari supports HLS natively
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.play().catch(() => {});
        return;
      }

      // Use HLS.js for other browsers
      try {
        const Hls = (await import('hls.js')).default;
        if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: false });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        }
      } catch {
        // hls.js not available, fall back to snapshot
        setViewMode('snapshot');
      }
    };

    loadStream();
    return () => {
      if (hls) hls.destroy();
    };
  }, [viewMode, streamUrl]);

  const handleTogglePower = () => {
    if (!supportsOnOff) return;
    const service = state === 'off' ? 'turn_on' : 'turn_off';
    callService('camera', service, { entity_id: entityId });
  };

  const handleToggleMotion = () => {
    const service = motionDetection
      ? 'disable_motion_detection'
      : 'enable_motion_detection';
    callService('camera', service, { entity_id: entityId });
  };

  const handleForceRefresh = () => setCacheBust(Date.now());

  // State label
  const getStateLabel = () => {
    if (isUnavailable) return translate('camera.unavailable');
    if (isRecording) return translate('camera.recording');
    if (isStreaming) return translate('camera.streaming');
    return translate('camera.idle');
  };

  const stateColor = isRecording
    ? 'text-red-400'
    : isStreaming
      ? 'text-blue-400'
      : isUnavailable
        ? 'text-red-400'
        : 'text-emerald-400';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="popup-anim relative w-full max-w-lg max-h-[90vh] rounded-[2rem] border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <Icon className="w-5 h-5 text-[var(--text-primary)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--text-primary)] truncate">{name}</h2>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : isStreaming ? 'bg-blue-500' : isUnavailable ? 'bg-red-500' : 'bg-emerald-500'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${stateColor}`}>
                  {getStateLabel()}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera view */}
        <div className="px-5">
          <div className="relative w-full rounded-2xl overflow-hidden bg-black/40 border border-[var(--glass-border)]"
            style={{ aspectRatio: '16/9' }}
          >
            {viewMode === 'live' && streamUrl ? (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain bg-black"
                autoPlay
                muted
                playsInline
                controls
              />
            ) : snapshotUrl && !isUnavailable ? (
              <img
                src={snapshotUrl}
                alt={name}
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <VideoOff className="w-12 h-12 text-white/20" />
                <span className="text-xs text-white/30 font-bold uppercase tracking-wider">
                  {translate('camera.unavailable')}
                </span>
              </div>
            )}

            {isStartingLive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-white/85">
                  {translate('camera.live')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 pt-4 space-y-4 custom-scrollbar">

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Snapshot / Live toggle */}
            {supportsStream && (
              <button
                onClick={() => {
                  if (viewMode === 'live') {
                    setViewMode('snapshot');
                    setStreamUrl(null);
                  } else {
                    requestStream();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border
                  ${viewMode === 'live'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'
                  }`}
              >
                <Video className="w-4 h-4" />
                {viewMode === 'live' ? translate('camera.stopLive') : translate('camera.live')}
              </button>
            )}

            {/* Refresh snapshot */}
            {viewMode === 'snapshot' && (
              <button
                onClick={handleForceRefresh}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                {translate('camera.refresh')}
              </button>
            )}

            {/* Power toggle */}
            {supportsOnOff && (
              <button
                onClick={handleTogglePower}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border
                  ${state === 'off'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'
                  }`}
              >
                {state === 'off' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                {state === 'off' ? translate('camera.turnOn') : translate('camera.turnOff')}
              </button>
            )}

            {/* Motion detection toggle */}
            {motionDetection !== undefined && (
              <button
                onClick={handleToggleMotion}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border
                  ${motionDetection
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'
                  }`}
              >
                {motionDetection ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {translate('camera.motion')}
              </button>
            )}
          </div>

          {/* Info section */}
          <div className="popup-surface rounded-2xl p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-3 pl-1">
              {translate('camera.info')}
            </h3>
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-[var(--text-secondary)] opacity-70">{translate('camera.state')}</span>
              <span className={`text-xs font-bold ${stateColor}`}>{getStateLabel()}</span>
            </div>
            {brand && (
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-[var(--text-secondary)] opacity-70">{translate('camera.brand')}</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">{brand}</span>
              </div>
            )}
            {model && (
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-[var(--text-secondary)] opacity-70">{translate('camera.model')}</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">{model}</span>
              </div>
            )}
            {streamType && (
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-[var(--text-secondary)] opacity-70">{translate('camera.streamType')}</span>
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase">{streamType}</span>
              </div>
            )}
            {motionDetection !== undefined && (
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-[var(--text-secondary)] opacity-70">{translate('camera.motionDetection')}</span>
                <span className={`text-xs font-bold ${motionDetection ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                  {motionDetection ? translate('camera.motionOn') : translate('camera.motionOff')}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-[var(--text-secondary)] opacity-70">{translate('camera.entityId')}</span>
              <span className="text-xs font-mono text-[var(--text-secondary)]">{entityId}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
