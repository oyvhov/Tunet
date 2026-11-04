import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CameraFeed, {
  applyGo2rtcMode,
  getGo2rtcModeFromUrl,
  getCameraSourcePlan,
  normalizeCameraStreamEngine,
  resolveCameraTemplate,
} from '../components/camera/CameraFeed';

vi.mock('hls.js', () => ({
  default: {
    isSupported: () => false,
  },
}));

Object.defineProperties(window.HTMLMediaElement.prototype, {
  load: { configurable: true, value: vi.fn() },
  pause: { configurable: true, value: vi.fn() },
  play: { configurable: true, value: vi.fn(() => Promise.resolve()) },
});

afterEach(() => vi.unstubAllGlobals());

describe('camera stream source selection', () => {
  it('prefers native WebRTC and falls back through every HA-compatible source', () => {
    expect(
      getCameraSourcePlan({
        engine: 'auto',
        frontendStreamTypes: ['web_rtc', 'hls'],
        customPlayerUrl: '',
        hasConnection: true,
        hasAccessToken: true,
      })
    ).toEqual(['webrtc', 'hls', 'mjpeg', 'snapshot']);
  });

  it('keeps an existing go2rtc player ahead of HA sources in Auto mode', () => {
    expect(
      getCameraSourcePlan({
        engine: 'auto',
        frontendStreamTypes: ['web_rtc', 'hls'],
        customPlayerUrl: 'https://go2rtc.local/stream.html?src=front&mode=mse',
        hasConnection: true,
        hasAccessToken: true,
      })
    ).toEqual(['custom', 'webrtc', 'hls', 'mjpeg', 'snapshot']);
  });

  it('falls back safely when an explicit go2rtc player fails', () => {
    expect(
      getCameraSourcePlan({
        engine: 'go2rtc',
        frontendStreamTypes: ['web_rtc', 'hls'],
        customPlayerUrl: 'https://go2rtc.local/stream.html?src=front',
        hasConnection: true,
        hasAccessToken: false,
      })
    ).toEqual(['custom', 'webrtc', 'hls', 'snapshot']);
  });

  it('tries HLS on older HA versions where capabilities are unavailable', () => {
    expect(
      getCameraSourcePlan({
        engine: 'auto',
        frontendStreamTypes: null,
        customPlayerUrl: '',
        hasConnection: true,
        hasAccessToken: false,
      })
    ).toEqual(['hls', 'snapshot']);
  });

  it('keeps an explicit snapshot setting isolated from live stream attempts', () => {
    expect(
      getCameraSourcePlan({
        engine: 'snapshot',
        frontendStreamTypes: ['web_rtc', 'hls'],
        customPlayerUrl: 'https://go2rtc.local/stream.html',
        hasConnection: true,
        hasAccessToken: true,
      })
    ).toEqual(['snapshot']);
  });

  it('resolves custom player templates without changing unknown engines', () => {
    expect(
      resolveCameraTemplate(
        'https://go2rtc.local/stream.html?src={entity_object_id}&entity={entity_id}',
        'camera.front_door'
      )
    ).toBe('https://go2rtc.local/stream.html?src=front_door&entity=camera.front_door');
    expect(normalizeCameraStreamEngine('HA-STREAM')).toBe('ha');
    expect(normalizeCameraStreamEngine('mse')).toBe('go2rtc');
    expect(normalizeCameraStreamEngine('future-engine')).toBe('auto');
  });

  it('applies go2rtc modes without losing templates, query parameters, or hashes', () => {
    const template =
      'https://go2rtc.local/stream.html?src={entity_object_id}&background=false#player';

    expect(applyGo2rtcMode(template, 'mse')).toBe(
      'https://go2rtc.local/stream.html?src=%7Bentity_object_id%7D&background=false&mode=mse#player'
    );
    expect(
      applyGo2rtcMode(
        'https://go2rtc.local/stream.html?src=front&mode=webrtc&background=false',
        'auto'
      )
    ).toBe('https://go2rtc.local/stream.html?src=front&background=false');
    expect(getGo2rtcModeFromUrl('https://go2rtc.local/stream.html?src=front&mode=MSE')).toBe('mse');
    expect(getGo2rtcModeFromUrl('https://go2rtc.local/stream.html?src=front&mode=%')).toBe('auto');
  });
});

describe('CameraFeed', () => {
  it('keeps a playing MJPEG feed ready when configuration is refreshed', async () => {
    const sendMessagePromise = vi.fn(async ({ type, path }) =>
      type === 'auth/sign_path' ? { path: `${path}&authSig=signed` } : { frontend_stream_types: [] }
    );
    const props = {
      entityId: 'camera.front',
      entity: { state: 'idle', attributes: { access_token: 'camera-token' } },
      conn: { sendMessagePromise },
      getEntityImageUrl: (url) => url,
      alt: 'Front camera',
    };
    const { rerender } = render(<CameraFeed {...props} refreshKey={1} />);
    const image = await screen.findByRole('img', { name: 'Front camera' });
    fireEvent.load(image);
    expect(screen.queryByText('Loading camera')).not.toBeInTheDocument();

    rerender(
      <CameraFeed
        {...props}
        conn={{ sendMessagePromise }}
        getEntityImageUrl={(url) => url}
        refreshKey={2}
      />
    );
    await waitFor(() => expect(sendMessagePromise).toHaveBeenCalledTimes(4));
    expect(screen.getByRole('img', { name: 'Front camera' })).toBe(image);
    expect(screen.queryByText('Loading camera')).not.toBeInTheDocument();

    rerender(
      <CameraFeed
        {...props}
        entity={{ ...props.entity, attributes: { access_token: 'new-token' } }}
      />
    );
    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('new-token'))
    );
    expect(screen.getByText('Loading camera')).toBeInTheDocument();
    fireEvent.load(screen.getByRole('img'));
    expect(screen.queryByText('Loading camera')).not.toBeInTheDocument();
  });

  it('keeps the working fallback when only the snapshot refreshes', async () => {
    const sendMessagePromise = vi.fn(async ({ type, path }) => {
      if (type === 'camera/capabilities') return { frontend_stream_types: ['hls'] };
      if (type === 'camera/stream') return { url: '/stream.m3u8' };
      return { path: `${path}&authSig=signed` };
    });
    const props = {
      entityId: 'camera.front',
      entity: { state: 'idle', attributes: { access_token: 'camera-token' } },
      conn: { sendMessagePromise },
      getEntityImageUrl: (url) => url,
      alt: 'Front camera',
    };
    const { rerender } = render(<CameraFeed {...props} refreshKey={1} />);
    await waitFor(() =>
      expect(screen.getByTestId('camera-feed')).toHaveAttribute('data-camera-source', 'mjpeg')
    );
    const image = screen.getByRole('img');
    fireEvent.load(image);
    rerender(<CameraFeed {...props} refreshKey={2} />);
    await waitFor(() =>
      expect(sendMessagePromise).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/api/camera_proxy/camera.front?_ts=2' })
      )
    );
    expect(screen.getByRole('img')).toBe(image);
    expect(screen.queryByText('Loading camera')).not.toBeInTheDocument();
    expect(
      sendMessagePromise.mock.calls.filter(([message]) => message.type === 'camera/stream')
    ).toHaveLength(1);
  });

  it('signs the complete snapshot query and displays the signed URL unchanged on refresh', async () => {
    const sendMessagePromise = vi.fn(async ({ type, path }) =>
      type === 'auth/sign_path' ? { path: `${path}&authSig=signed` } : { frontend_stream_types: [] }
    );
    const props = {
      entityId: 'camera.front',
      entity: { state: 'idle', attributes: {} },
      conn: { sendMessagePromise },
      getEntityImageUrl: (url) => url,
      settings: { cameraStreamEngine: 'snapshot' },
      alt: 'Front camera',
    };
    const { rerender } = render(<CameraFeed {...props} refreshKey={1} />);
    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        '/api/camera_proxy/camera.front?_ts=1&authSig=signed'
      )
    );
    fireEvent.load(screen.getByRole('img'));
    rerender(<CameraFeed {...props} refreshKey={2} />);
    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        '/api/camera_proxy/camera.front?_ts=2&authSig=signed'
      )
    );
    expect(screen.getByText('Loading camera')).toBeInTheDocument();
    fireEvent.load(screen.getByRole('img'));
    expect(screen.queryByText('Loading camera')).not.toBeInTheDocument();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('Camera stream unavailable')).toBeInTheDocument();
    rerender(<CameraFeed {...props} refreshKey={3} />);
    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        '/api/camera_proxy/camera.front?_ts=3&authSig=signed'
      )
    );
    fireEvent.load(screen.getByRole('img'));
    expect(screen.queryByText('Loading camera')).not.toBeInTheDocument();
    fireEvent.error(screen.getByRole('img'));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.load(await screen.findByRole('img'));
    expect(screen.queryByText('Loading camera')).not.toBeInTheDocument();
  });

  it('keeps a saved MSE player active and applies an explicit mode selection', async () => {
    const sendMessagePromise = vi.fn(async (message) => {
      if (message.type === 'camera/capabilities') {
        return { frontend_stream_types: ['web_rtc', 'hls'] };
      }
      if (message.type === 'auth/sign_path') {
        return { path: '/api/camera_proxy/camera.front?authSig=signed' };
      }
      return undefined;
    });

    render(
      <CameraFeed
        entityId="camera.front"
        entity={{ state: 'idle', attributes: {} }}
        conn={{ sendMessagePromise }}
        getEntityImageUrl={(url) => url}
        settings={{
          cameraStreamEngine: 'auto',
          cameraWebrtcUrl: 'https://go2rtc.local/stream.html?src={entity_object_id}&mode=webrtc',
          cameraGo2rtcMode: 'mse',
        }}
        alt="Front camera"
        t={(key) => key}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-feed')).toHaveAttribute('data-camera-source', 'custom');
    });
    expect(screen.getByTitle('Front camera')).toHaveAttribute(
      'src',
      'https://go2rtc.local/stream.html?src=front&mode=mse'
    );
  });

  it('uses Home Assistant WebRTC signaling when the camera advertises support', async () => {
    class FakePeerConnection {
      signalingState = 'have-local-offer';
      connectionState = 'connected';
      addTransceiver = vi.fn();
      addIceCandidate = vi.fn(() => Promise.resolve());
      setLocalDescription = vi.fn(() => Promise.resolve());
      setRemoteDescription = vi.fn(() => Promise.resolve());
      createOffer = vi.fn(() => Promise.resolve({ type: 'offer', sdp: 'local-offer' }));
      createDataChannel = vi.fn();
      close = vi.fn();
    }
    class FakeMediaStream {
      addTrack = vi.fn();
      getTracks = vi.fn(() => []);
    }
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    vi.stubGlobal('MediaStream', FakeMediaStream);

    const subscribeMessage = vi.fn((callback) => {
      callback({ type: 'session', session_id: 'camera-session' });
      callback({ type: 'answer', answer: 'remote-answer' });
      return Promise.resolve(vi.fn());
    });
    const sendMessagePromise = vi.fn(async (message) => {
      if (message.type === 'camera/capabilities') {
        return { frontend_stream_types: ['web_rtc', 'hls'] };
      }
      if (message.type === 'auth/sign_path') {
        return { path: '/api/camera_proxy/camera.front?authSig=signed' };
      }
      if (message.type === 'camera/webrtc/get_client_config') {
        return { configuration: {} };
      }
      return undefined;
    });

    const { unmount } = render(
      <CameraFeed
        entityId="camera.front"
        entity={{ state: 'idle', attributes: {} }}
        conn={{ sendMessagePromise, subscribeMessage }}
        getEntityImageUrl={(url) => `http://ha.local${url}`}
        settings={{ cameraStreamEngine: 'auto' }}
        alt="Front camera"
        t={(key) => key}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-feed')).toHaveAttribute('data-camera-source', 'webrtc');
      expect(subscribeMessage).toHaveBeenCalledWith(expect.any(Function), {
        type: 'camera/webrtc/offer',
        entity_id: 'camera.front',
        offer: 'local-offer',
      });
    });

    expect(sendMessagePromise).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'camera/stream' })
    );

    unmount();
  });

  it('falls back from unsupported HLS to a signed snapshot', async () => {
    const sendMessagePromise = vi.fn(async (message) => {
      if (message.type === 'camera/capabilities') {
        return { frontend_stream_types: ['hls'] };
      }
      if (message.type === 'auth/sign_path') {
        return { path: '/api/camera_proxy/camera.front?authSig=signed' };
      }
      if (message.type === 'camera/stream') {
        return { url: '/api/hls/front/index.m3u8' };
      }
      throw new Error(`Unexpected message: ${message.type}`);
    });

    render(
      <div className="h-64 w-64">
        <CameraFeed
          entityId="camera.front"
          entity={{
            state: 'idle',
            attributes: { friendly_name: 'Front camera' },
          }}
          conn={{ sendMessagePromise }}
          getEntityImageUrl={(url) => `http://ha.local${url}`}
          settings={{ cameraStreamEngine: 'auto' }}
          refreshKey={123}
          alt="Front camera"
          t={(key) => key}
        />
      </div>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-feed')).toHaveAttribute('data-camera-source', 'snapshot');
    });

    const snapshot = screen.getByRole('img', { name: 'Front camera' });
    expect(snapshot).toHaveAttribute(
      'src',
      'http://ha.local/api/camera_proxy/camera.front?authSig=signed'
    );
    fireEvent.load(snapshot);

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'camera/stream',
      entity_id: 'camera.front',
      format: 'hls',
    });
  });
});
