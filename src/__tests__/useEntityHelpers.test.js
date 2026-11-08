import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { ERR_CONNECTION_LOST } from 'home-assistant-js-websocket';
import { useEntityHelpers } from '../hooks/useEntityHelpers';
import { ToastProvider, useToast } from '../contexts/ToastContext';

// Mock the service module
vi.mock('../services', () => ({
  callService: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { callService as haCallService } from '../services';

// ── Helpers ──────────────────────────────────────────────────────────────
const t = (key) => key; // passthrough translator

const wrapper = ({ children }) => createElement(ToastProvider, null, children);

const baseProps = () => ({
  entities: {},
  conn: { sendMessagePromise: vi.fn() },
  activeUrl: 'http://homeassistant.local:8123',
  language: 'en',
  now: new Date('2026-02-13T12:00:00Z'),
  t,
});

// ═════════════════════════════════════════════════════════════════════════
// getS – state accessor
// ═════════════════════════════════════════════════════════════════════════
describe('useEntityHelpers › getS', () => {
  it('returns formatted state for a known entity', () => {
    const props = baseProps();
    props.entities = { 'sensor.temp': { state: 'on' } };
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    expect(result.current.getS('sensor.temp')).toBe('On');
  });

  it('returns fallback for missing entity', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    expect(result.current.getS('sensor.missing')).toBe('--');
  });

  it('returns custom fallback when provided', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    expect(result.current.getS('sensor.missing', 'N/A')).toBe('N/A');
  });

  it('returns fallback for "unavailable" state', () => {
    const props = baseProps();
    props.entities = { 'sensor.x': { state: 'unavailable' } };
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    expect(result.current.getS('sensor.x')).toBe('--');
  });

  it('returns fallback for "unknown" state', () => {
    const props = baseProps();
    props.entities = { 'sensor.x': { state: 'unknown' } };
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    expect(result.current.getS('sensor.x')).toBe('--');
  });

  it('translates "home" state', () => {
    const props = baseProps();
    props.entities = { 'person.me': { state: 'home' } };
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    expect(result.current.getS('person.me')).toBe('status.home');
  });

  it('translates "not_home" state', () => {
    const props = baseProps();
    props.entities = { 'person.me': { state: 'not_home' } };
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    expect(result.current.getS('person.me')).toBe('status.notHome');
  });

  it('capitalises first letter for generic states', () => {
    const props = baseProps();
    props.entities = { 'sensor.x': { state: 'heating' } };
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    expect(result.current.getS('sensor.x')).toBe('Heating');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// getA – attribute accessor
// ═════════════════════════════════════════════════════════════════════════
describe('useEntityHelpers › getA', () => {
  it('returns attribute value', () => {
    const props = baseProps();
    props.entities = {
      'climate.ac': { state: 'cool', attributes: { temperature: 22 } },
    };
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    expect(result.current.getA('climate.ac', 'temperature')).toBe(22);
  });

  it('returns null fallback for missing attribute', () => {
    const props = baseProps();
    props.entities = { 'climate.ac': { state: 'cool', attributes: {} } };
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    expect(result.current.getA('climate.ac', 'humidity')).toBeNull();
  });

  it('returns custom fallback for missing attribute', () => {
    const props = baseProps();
    props.entities = { 'sensor.x': { state: 'on', attributes: {} } };
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    expect(result.current.getA('sensor.x', 'missing', 'default')).toBe('default');
  });

  it('returns fallback for missing entity', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    expect(result.current.getA('sensor.nope', 'attr', 42)).toBe(42);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// getEntityImageUrl
// ═════════════════════════════════════════════════════════════════════════
describe('useEntityHelpers › getEntityImageUrl', () => {
  it('returns null for falsy input', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    expect(result.current.getEntityImageUrl(null)).toBeNull();
    expect(result.current.getEntityImageUrl('')).toBeNull();
  });

  it('returns absolute URL unchanged', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    expect(result.current.getEntityImageUrl('https://img.server/pic.jpg')).toBe(
      'https://img.server/pic.jpg'
    );
  });

  it('prefixes relative URL with activeUrl', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    expect(result.current.getEntityImageUrl('/api/camera_proxy/camera.front')).toBe(
      'http://homeassistant.local:8123/api/camera_proxy/camera.front'
    );
  });

  it('strips trailing slash from activeUrl', () => {
    const props = baseProps();
    props.activeUrl = 'http://ha.local:8123/';
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    expect(result.current.getEntityImageUrl('/img.jpg')).toBe('http://ha.local:8123/img.jpg');
  });
});

// ═════════════════════════════════════════════════════════════════════════
// callService
// ═════════════════════════════════════════════════════════════════════════
describe('useEntityHelpers › callService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to haClient.callService', async () => {
    haCallService.mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    const res = await result.current.callService('light', 'turn_on', {
      entity_id: 'light.room',
    });
    expect(haCallService).toHaveBeenCalledWith(expect.anything(), 'light', 'turn_on', {
      entity_id: 'light.room',
    });
    expect(res).toEqual({ ok: true });
  });

  it('rejects when conn is null', async () => {
    const props = baseProps();
    props.conn = null;
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    await expect(result.current.callService('light', 'toggle', {})).rejects.toThrow(
      'No connection'
    );
  });

  it('re-throws errors from haClient and shows toast', async () => {
    haCallService.mockRejectedValueOnce(new Error('timeout'));
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    await expect(result.current.callService('switch', 'turn_off', {})).rejects.toThrow('timeout');
  });
});

describe('useEntityHelpers › callService feedback', () => {
  const NO_CONTACT = 'toast.noHaConnection';
  const kitchen = { state: 'on', attributes: { friendly_name: 'Kitchen light' } };

  const renderWithToasts = (props) =>
    renderHook((current) => ({ helpers: useEntityHelpers(current), toasts: useToast().toasts }), {
      wrapper,
      initialProps: props,
    });

  const failCall = async (result, data, rejection) => {
    haCallService.mockRejectedValueOnce(rejection);
    let caught;
    await act(async () => {
      caught = await result.current.helpers
        .callService('light', 'turn_on', data)
        .catch((error) => error);
    });
    return caught;
  };

  const toastMessages = (result) => result.current.toasts.map((toast) => toast.message);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tells the user when there is no connection object at all', async () => {
    const props = baseProps();
    props.conn = null;
    const { result } = renderWithToasts(props);
    let caught;
    await act(async () => {
      caught = await result.current.helpers.callService('light', 'toggle', {}).catch((e) => e);
    });
    expect(caught.message).toBe('No connection');
    expect(toastMessages(result)).toEqual([NO_CONTACT]);
    expect(result.current.toasts[0].type).toBe('error');
  });

  it('shows the same text when the socket is already down', async () => {
    const { result } = renderWithToasts(baseProps());
    const caught = await failCall(result, { entity_id: 'light.kitchen' }, ERR_CONNECTION_LOST);
    expect(caught).toBe(ERR_CONNECTION_LOST);
    expect(toastMessages(result)).toEqual([NO_CONTACT]);
  });

  it('shows the same text when the socket drops during the call', async () => {
    const dropped = {
      type: 'result',
      success: false,
      error: { code: ERR_CONNECTION_LOST, message: 'Connection lost' },
    };
    const { result } = renderWithToasts(baseProps());
    const caught = await failCall(result, { entity_id: 'light.kitchen' }, dropped);
    expect(caught).toBe(dropped);
    expect(toastMessages(result)).toEqual([NO_CONTACT]);
  });

  it('names the entity when one known entity failed', async () => {
    const props = baseProps();
    props.entities = { 'light.kitchen': kitchen };
    const { result } = renderWithToasts(props);
    await failCall(result, { entity_id: 'light.kitchen' }, new Error('boom'));
    expect(toastMessages(result)).toEqual(['toast.serviceFailed: Kitchen light']);
  });

  it('names the entity when a one-item list failed', async () => {
    const props = baseProps();
    props.entities = { 'light.kitchen': kitchen };
    const { result } = renderWithToasts(props);
    await failCall(result, { entity_id: ['light.kitchen'] }, new Error('boom'));
    expect(toastMessages(result)).toEqual(['toast.serviceFailed: Kitchen light']);
  });

  it.each([
    ['several entities', { entity_id: ['light.kitchen', 'light.hall'] }],
    ['an unknown entity', { entity_id: 'light.gone' }],
    ['no entity', {}],
  ])('shows only the plain message for %s', async (_label, data) => {
    const props = baseProps();
    props.entities = { 'light.kitchen': kitchen };
    const { result } = renderWithToasts(props);
    await failCall(result, data, new Error('boom'));
    expect(toastMessages(result)).toEqual(['toast.serviceFailed']);
  });

  it('never shows the raw service name', async () => {
    const { result } = renderWithToasts(baseProps());
    await failCall(result, { entity_id: 'light.gone' }, new Error('boom'));
    expect(toastMessages(result).join()).not.toContain('turn_on');
  });

  it('keeps callService stable when entities change, and still uses the newest names', async () => {
    const props = baseProps();
    const { result, rerender } = renderWithToasts(props);
    const first = result.current.helpers.callService;
    rerender({ ...props, entities: { 'light.kitchen': kitchen } });
    expect(result.current.helpers.callService).toBe(first);
    await failCall(result, { entity_id: 'light.kitchen' }, new Error('boom'));
    expect(toastMessages(result)).toEqual(['toast.serviceFailed: Kitchen light']);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// isSonosActive
// ═════════════════════════════════════════════════════════════════════════
describe('useEntityHelpers › isSonosActive', () => {
  it('returns false for null entity', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    expect(result.current.isSonosActive(null)).toBe(false);
  });

  it('returns true when playing', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    expect(result.current.isSonosActive({ state: 'playing' })).toBe(true);
  });

  it('returns true when paused recently', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    const entity = {
      state: 'paused',
      last_updated: new Date(Date.now() - 30_000).toISOString(), // 30s ago
    };
    expect(result.current.isSonosActive(entity)).toBe(true);
  });

  it('returns false when paused longer than MEDIA_TIMEOUT', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    const entity = {
      state: 'paused',
      last_updated: new Date(Date.now() - 200_000).toISOString(), // >2min ago
    };
    expect(result.current.isSonosActive(entity)).toBe(false);
  });

  it('returns false for idle state', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    expect(result.current.isSonosActive({ state: 'idle' })).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// isMediaActive
// ═════════════════════════════════════════════════════════════════════════
describe('useEntityHelpers › isMediaActive', () => {
  it('returns true when playing', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    expect(result.current.isMediaActive({ state: 'playing' })).toBe(true);
  });

  it('returns true when recently updated (within ENTITY_UPDATE_THRESHOLD)', () => {
    const props = baseProps();
    props.now = new Date('2026-02-13T12:00:00Z');
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    const entity = {
      state: 'paused',
      last_updated: new Date('2026-02-13T11:59:50Z').toISOString(), // 10s ago
    };
    expect(result.current.isMediaActive(entity)).toBe(true);
  });

  it('returns false when stale', () => {
    const props = baseProps();
    props.now = new Date('2026-02-13T12:00:00Z');
    const { result } = renderHook(() => useEntityHelpers(props), { wrapper });
    const entity = {
      state: 'idle',
      last_updated: new Date('2026-02-13T11:00:00Z').toISOString(), // 1h ago
    };
    expect(result.current.isMediaActive(entity)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Climate i18n maps
// ═════════════════════════════════════════════════════════════════════════
describe('useEntityHelpers › climate maps', () => {
  it('hvacMap has all expected keys', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    const keys = Object.keys(result.current.hvacMap);
    expect(keys).toEqual(
      expect.arrayContaining(['off', 'auto', 'cool', 'dry', 'fan_only', 'heat'])
    );
  });

  it('fanMap has all expected keys', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    const keys = Object.keys(result.current.fanMap);
    expect(keys).toEqual(
      expect.arrayContaining(['Auto', 'Low', 'LowMid', 'Mid', 'HighMid', 'High'])
    );
  });

  it('swingMap has all expected keys', () => {
    const { result } = renderHook(() => useEntityHelpers(baseProps()), { wrapper });
    const keys = Object.keys(result.current.swingMap);
    expect(keys).toEqual(
      expect.arrayContaining(['Auto', 'Up', 'UpMid', 'Mid', 'DownMid', 'Down', 'Swing'])
    );
  });
});
