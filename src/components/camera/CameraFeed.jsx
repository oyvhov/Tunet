import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SOURCE_TIMEOUT_MS = 15000;

export function appendCameraCacheBust(url, value) {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_ts=${value}`;
}

export function buildCameraProxyUrl(basePath, entityId, accessToken) {
  if (!entityId) return '';
  const tokenQuery = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return `${basePath}/${entityId}${tokenQuery}`;
}

export function resolveCameraTemplate(urlTemplate, entityId) {
  if (!urlTemplate) return '';
  const objectId = (entityId || '').includes('.')
    ? entityId.split('.').slice(1).join('.')
    : entityId;
  return urlTemplate
    .replaceAll('{entity_id}', entityId || '')
    .replaceAll('{entity_object_id}', objectId || '');
}

export function normalizeCameraStreamEngine(value) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'webrtc') return 'webrtc';
  if (raw === 'snapshot') return 'snapshot';
  if (raw === 'ha' || raw === 'ha_stream' || raw === 'hastream' || raw === 'ha-stream') {
    return 'ha';
  }
  return 'auto';
}

export function getCameraSourcePlan({
  engine,
  frontendStreamTypes,
  customPlayerUrl,
  hasConnection,
  hasAccessToken,
}) {
  if (engine === 'snapshot') return ['snapshot'];

  const plan = [];
  const capabilitiesKnown = Array.isArray(frontendStreamTypes);
  const supportsWebRtc = frontendStreamTypes?.includes('web_rtc');
  const supportsHls = frontendStreamTypes?.includes('hls');

  if (engine === 'webrtc' && customPlayerUrl) plan.push('custom');
  if ((engine === 'auto' || engine === 'webrtc') && supportsWebRtc) plan.push('webrtc');
  if (
    hasConnection &&
    (engine === 'ha' || engine === 'webrtc' || supportsHls || !capabilitiesKnown)
  ) {
    plan.push('hls');
  }
  if (engine === 'auto' && customPlayerUrl) plan.push('custom');
  if (hasAccessToken) plan.push('mjpeg');
  plan.push('snapshot');

  return [...new Set(plan)];
}

/** @param {any} props */
function SourceTimeout({ onTimeout, active = true }) {
  useEffect(() => {
    if (!active) return undefined;
    const timeoutId = window.setTimeout(onTimeout, SOURCE_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [active, onTimeout]);
  return null;
}

const CameraImage = memo(/** @param {any} props */ function CameraImage({
  src,
  alt,
  fit,
  onReady,
  onError,
  timeout = true,
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {timeout ? <SourceTimeout active={!loaded} onTimeout={onError} /> : null}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full"
        style={{ objectFit: fit }}
        referrerPolicy="no-referrer"
        onLoad={() => {
          setLoaded(true);
          onReady();
        }}
        onError={onError}
      />
    </>
  );
});

const CustomCameraPlayer = memo(/** @param {any} props */ function CustomCameraPlayer({
  src,
  title,
  onReady,
  onError,
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <SourceTimeout active={!loaded} onTimeout={onError} />
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full border-0 bg-black"
        allow="autoplay; fullscreen; picture-in-picture"
        referrerPolicy="no-referrer"
        onLoad={() => {
          setLoaded(true);
          onReady();
        }}
        onError={onError}
      />
    </>
  );
});

const HlsCameraPlayer = memo(/** @param {any} props */ function HlsCameraPlayer({
  conn,
  entityId,
  resolveUrl,
  posterUrl,
  fit,
  controls,
  muted,
  onReady,
  onError,
}) {
  const videoRef = useRef(null);
  const timeoutRef = useRef(null);
  const markReady = useCallback(() => {
    window.clearTimeout(timeoutRef.current);
    onReady();
  }, [onReady]);

  useEffect(() => {
    const videoElement = videoRef.current;
    let disposed = false;
    let hlsInstance;
    let recoveryAttempts = 0;
    timeoutRef.current = window.setTimeout(
      () => onError('hls-timeout'),
      SOURCE_TIMEOUT_MS
    );

    const fail = (reason) => {
      if (disposed) return;
      window.clearTimeout(timeoutRef.current);
      onError(reason);
    };

    const start = async () => {
      if (!conn || typeof conn.sendMessagePromise !== 'function') {
        fail('hls-no-connection');
        return;
      }

      try {
        const response = await conn.sendMessagePromise({
          type: 'camera/stream',
          entity_id: entityId,
          format: 'hls',
        });
        if (disposed) return;
        const streamUrl = resolveUrl(response?.url);
        const video = videoElement;
        if (!streamUrl || !video) {
          fail('hls-no-url');
          return;
        }

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl;
          video.load();
          void video.play().catch(() => {});
          return;
        }

        const hlsModule = await import('hls.js');
        if (disposed) return;
        const Hls = hlsModule.default;
        if (!Hls.isSupported()) {
          fail('hls-unsupported');
          return;
        }

        hlsInstance = new Hls({
          lowLatencyMode: true,
          backBufferLength: 30,
          maxBufferLength: 15,
        });
        hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
          if (!data?.fatal || disposed) return;
          if (recoveryAttempts === 0 && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            recoveryAttempts += 1;
            hlsInstance.startLoad();
            return;
          }
          if (recoveryAttempts === 0 && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            recoveryAttempts += 1;
            hlsInstance.recoverMediaError();
            return;
          }
          fail(`hls-${data.type || 'fatal'}`);
        });
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => {});
        });
        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(video);
      } catch (_error) {
        fail('hls-request-failed');
      }
    };

    void start();

    return () => {
      disposed = true;
      window.clearTimeout(timeoutRef.current);
      hlsInstance?.destroy();
      const video = videoElement;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [conn, entityId, onError, resolveUrl]);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full"
      style={{ objectFit: fit }}
      poster={posterUrl || undefined}
      autoPlay
      playsInline
      muted={muted}
      controls={controls}
      onLoadedData={markReady}
      onPlaying={markReady}
      onError={() => onError('hls-video-error')}
    />
  );
});

const WebRtcCameraPlayer = memo(/** @param {any} props */ function WebRtcCameraPlayer({
  conn,
  entityId,
  posterUrl,
  fit,
  controls,
  muted,
  onReady,
  onError,
}) {
  const videoRef = useRef(null);
  const timeoutRef = useRef(null);
  const markReady = useCallback(() => {
    window.clearTimeout(timeoutRef.current);
    onReady();
  }, [onReady]);

  useEffect(() => {
    const videoElement = videoRef.current;
    let disposed = false;
    let peerConnection;
    let remoteStream;
    let unsubscribePromise;
    let sessionId;
    const pendingCandidates = [];
    timeoutRef.current = window.setTimeout(
      () => onError('webrtc-timeout'),
      SOURCE_TIMEOUT_MS
    );

    const fail = (reason) => {
      if (disposed) return;
      window.clearTimeout(timeoutRef.current);
      onError(reason);
    };

    const sendCandidate = (candidate) => {
      if (!sessionId || !conn || typeof conn.sendMessagePromise !== 'function') return;
      void conn
        .sendMessagePromise({
          type: 'camera/webrtc/candidate',
          entity_id: entityId,
          session_id: sessionId,
          candidate,
        })
        .catch(() => {});
    };

    const handleEvent = async (event) => {
      if (disposed || !peerConnection) return;
      try {
        if (event.type === 'session') {
          sessionId = event.session_id;
          pendingCandidates.splice(0).forEach(sendCandidate);
          return;
        }
        if (event.type === 'answer') {
          if (!['stable', 'closed'].includes(peerConnection.signalingState)) {
            await peerConnection.setRemoteDescription({ type: 'answer', sdp: event.answer });
          }
          return;
        }
        if (event.type === 'candidate') {
          const candidate = event.candidate;
          await peerConnection.addIceCandidate(
            candidate?.sdpMid || candidate?.sdpMLineIndex != null
              ? candidate
              : { ...candidate, sdpMid: '0' }
          );
          return;
        }
        if (event.type === 'error') fail('webrtc-backend-error');
      } catch (_error) {
        fail('webrtc-signaling-failed');
      }
    };

    const start = async () => {
      if (
        typeof window.RTCPeerConnection === 'undefined' ||
        !conn ||
        typeof conn.sendMessagePromise !== 'function' ||
        typeof conn.subscribeMessage !== 'function'
      ) {
        fail('webrtc-unsupported');
        return;
      }

      try {
        const clientConfig = await conn.sendMessagePromise({
          type: 'camera/webrtc/get_client_config',
          entity_id: entityId,
        });
        if (disposed) return;

        peerConnection = new window.RTCPeerConnection(clientConfig?.configuration || {});
        if (clientConfig?.dataChannel) {
          peerConnection.createDataChannel(clientConfig.dataChannel);
        }

        remoteStream = new window.MediaStream();
        peerConnection.ontrack = (event) => {
          if (disposed || !remoteStream) return;
          if (event.track.kind === 'audio' && muted) return;
          remoteStream.addTrack(event.track);
          const video = videoElement;
          if (video) {
            video.srcObject = remoteStream;
            void video.play().catch(() => {});
          }
        };
        peerConnection.onicecandidate = (event) => {
          if (!event.candidate?.candidate) return;
          const candidate = event.candidate.toJSON();
          if (sessionId) sendCandidate(candidate);
          else pendingCandidates.push(candidate);
        };
        peerConnection.onconnectionstatechange = () => {
          if (['failed', 'closed'].includes(peerConnection?.connectionState)) {
            fail('webrtc-connection-failed');
          }
        };

        peerConnection.addTransceiver('audio', { direction: 'recvonly' });
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await peerConnection.setLocalDescription(offer);
        if (disposed) return;

        unsubscribePromise = conn.subscribeMessage(handleEvent, {
          type: 'camera/webrtc/offer',
          entity_id: entityId,
          offer: offer.sdp,
        });
      } catch (_error) {
        fail('webrtc-start-failed');
      }
    };

    void start();

    return () => {
      disposed = true;
      window.clearTimeout(timeoutRef.current);
      remoteStream?.getTracks().forEach((track) => track.stop());
      peerConnection?.close();
      Promise.resolve(unsubscribePromise)
        .then((unsubscribe) => unsubscribe?.())
        .catch(() => {});
      const video = videoElement;
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [conn, entityId, muted, onError]);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full"
      style={{ objectFit: fit }}
      poster={posterUrl || undefined}
      autoPlay
      playsInline
      muted={muted}
      controls={controls}
      onLoadedData={markReady}
      onPlaying={markReady}
      onError={() => onError('webrtc-video-error')}
    />
  );
});

const CameraFeed = memo(/** @param {any} props */ function CameraFeed({
  entityId,
  entity,
  conn,
  getEntityImageUrl,
  settings,
  refreshKey = 0,
  fit = 'cover',
  controls = false,
  muted = true,
  alt,
  t,
  onSourceChange,
}) {
  const accessToken = entity?.attributes?.access_token || '';
  const engine = normalizeCameraStreamEngine(settings?.cameraStreamEngine);
  const customTemplate = (settings?.cameraWebrtcUrl || '').trim();
  const customPlayerUrl = useMemo(() => {
    const resolved = resolveCameraTemplate(customTemplate, entityId);
    return resolved ? getEntityImageUrl(resolved) : '';
  }, [customTemplate, entityId, getEntityImageUrl]);
  const legacySnapshotUrl = useMemo(
    () =>
      getEntityImageUrl(
        appendCameraCacheBust(
          buildCameraProxyUrl('/api/camera_proxy', entityId, accessToken),
          refreshKey
        )
      ),
    [accessToken, entityId, getEntityImageUrl, refreshKey]
  );
  const mjpegUrl = useMemo(
    () =>
      getEntityImageUrl(buildCameraProxyUrl('/api/camera_proxy_stream', entityId, accessToken)),
    [accessToken, entityId, getEntityImageUrl]
  );
  const resolveUrl = useCallback((url) => getEntityImageUrl(url), [getEntityImageUrl]);
  const [feedConfig, setFeedConfig] = useState({
    preparing: true,
    sources: [],
    snapshotUrl: legacySnapshotUrl,
  });
  const [sourceIndex, setSourceIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canCallWs = conn && typeof conn.sendMessagePromise === 'function';

    const capabilitiesPromise = canCallWs
      ? conn
          .sendMessagePromise({ type: 'camera/capabilities', entity_id: entityId })
          .then((response) => response?.frontend_stream_types || [])
          .catch(() => null)
      : Promise.resolve(null);
    const signedSnapshotPromise = canCallWs
      ? conn
          .sendMessagePromise({
            type: 'auth/sign_path',
            path: `/api/camera_proxy/${entityId}`,
          })
          .then((response) =>
            response?.path
              ? getEntityImageUrl(appendCameraCacheBust(response.path, refreshKey))
              : legacySnapshotUrl
          )
          .catch(() => legacySnapshotUrl)
      : Promise.resolve(legacySnapshotUrl);

    Promise.all([capabilitiesPromise, signedSnapshotPromise]).then(
      ([frontendStreamTypes, snapshotUrl]) => {
        if (cancelled) return;
        setFeedConfig({
          preparing: false,
          snapshotUrl,
          sources: getCameraSourcePlan({
            engine,
            frontendStreamTypes,
            customPlayerUrl,
            hasConnection: Boolean(canCallWs),
            hasAccessToken: Boolean(accessToken),
          }),
        });
        setSourceIndex(0);
        setReady(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    conn,
    customPlayerUrl,
    engine,
    entityId,
    getEntityImageUrl,
    legacySnapshotUrl,
    refreshKey,
  ]);

  const currentSource = feedConfig.sources[sourceIndex];
  const showLoading = feedConfig.preparing || (currentSource && !ready);

  useEffect(() => {
    onSourceChange?.(currentSource || (feedConfig.preparing ? 'loading' : 'unavailable'));
  }, [currentSource, feedConfig.preparing, onSourceChange]);

  const handleReady = useCallback(() => setReady(true), []);
  const handleError = useCallback(() => {
    setReady(false);
    setSourceIndex((current) => current + 1);
  }, []);

  const retry = useCallback(() => {
    setReady(false);
    setSourceIndex(0);
  }, []);

  const media = (() => {
    if (feedConfig.preparing) return null;
    if (currentSource === 'custom') {
      return (
        <CustomCameraPlayer
          key={customPlayerUrl}
          src={customPlayerUrl}
          title={alt}
          onReady={handleReady}
          onError={handleError}
        />
      );
    }
    if (currentSource === 'webrtc') {
      return (
        <WebRtcCameraPlayer
          conn={conn}
          entityId={entityId}
          posterUrl={feedConfig.snapshotUrl}
          fit={fit}
          controls={controls}
          muted={muted}
          onReady={handleReady}
          onError={handleError}
        />
      );
    }
    if (currentSource === 'hls') {
      return (
        <HlsCameraPlayer
          conn={conn}
          entityId={entityId}
          resolveUrl={resolveUrl}
          posterUrl={feedConfig.snapshotUrl}
          fit={fit}
          controls={controls}
          muted={muted}
          onReady={handleReady}
          onError={handleError}
        />
      );
    }
    if (currentSource === 'mjpeg') {
      return (
        <CameraImage
          key={mjpegUrl}
          src={mjpegUrl}
          alt={alt}
          fit={fit}
          onReady={handleReady}
          onError={handleError}
        />
      );
    }
    if (currentSource === 'snapshot') {
      return (
        <CameraImage
          key={feedConfig.snapshotUrl}
          src={feedConfig.snapshotUrl}
          alt={alt}
          fit={fit}
          onReady={handleReady}
          onError={handleError}
        />
      );
    }
    return null;
  })();

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-black/70"
      data-testid="camera-feed"
      data-camera-source={currentSource || 'unavailable'}
    >
      {media}

      {showLoading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
          <span className="sr-only">{t?.('camera.loading') || 'Loading camera'}</span>
        </div>
      ) : null}

      {!feedConfig.preparing && !currentSource ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 p-4 text-center text-white">
          <p className="text-sm font-semibold">
            {t?.('camera.streamUnavailable') || 'Camera stream unavailable'}
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              retry();
            }}
            className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold tracking-wider uppercase"
          >
            {t?.('camera.retry') || 'Try again'}
          </button>
        </div>
      ) : null}
    </div>
  );
});

export default CameraFeed;
