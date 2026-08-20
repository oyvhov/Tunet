import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CameraFeed, {
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
    ).toBe(
      'https://go2rtc.local/stream.html?src=front_door&entity=camera.front_door'
    );
    expect(normalizeCameraStreamEngine('HA-STREAM')).toBe('ha');
    expect(normalizeCameraStreamEngine('future-engine')).toBe('auto');
  });
});

describe('CameraFeed', () => {
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
      expect(screen.getByTestId('camera-feed')).toHaveAttribute(
        'data-camera-source',
        'webrtc'
      );
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
      expect(screen.getByTestId('camera-feed')).toHaveAttribute(
        'data-camera-source',
        'snapshot'
      );
    });

    const snapshot = screen.getByRole('img', { name: 'Front camera' });
    expect(snapshot).toHaveAttribute(
      'src',
      'http://ha.local/api/camera_proxy/camera.front?authSig=signed&_ts=123'
    );
    fireEvent.load(snapshot);

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'camera/stream',
      entity_id: 'camera.front',
      format: 'hls',
    });
  });
});
