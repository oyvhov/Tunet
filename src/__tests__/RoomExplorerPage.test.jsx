import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RoomExplorerPage from '../components/pages/RoomExplorerPage';
import { getAreaEntityMap, getAreas } from '../services/haClient';
import en from '../i18n/en.json';

vi.mock('../services/haClient', () => ({
  getAreas: vi.fn(),
  getAreaEntityMap: vi.fn(),
}));

const t = (key) => en[key] ?? key;

let pageCounter = 0;

const renderPage = (entities, { callService = vi.fn(), conn = {}, pageId } = {}) => {
  const id = pageId ?? `rooms-${(pageCounter += 1)}`;
  const view = render(
    <RoomExplorerPage
      entities={entities}
      callService={callService}
      conn={conn}
      pageSettings={{}}
      pageId={id}
      t={t}
    />
  );
  return { ...view, callService, conn, pageId: id };
};

const mockRoom = (entities) => {
  const ids = Object.keys(entities);
  getAreas.mockResolvedValue([{ area_id: 'kitchen', name: 'Kitchen' }]);
  getAreaEntityMap.mockResolvedValue({ kitchen: ids });
};

const openRoom = async (entities, options) => {
  mockRoom(entities);
  const view = renderPage(entities, options);
  fireEvent.click(await screen.findByText('Kitchen'));
  return view;
};

const light = (attributes = {}, state = 'on') => ({
  state,
  attributes: { friendly_name: 'Ceiling', supported_color_modes: ['brightness'], ...attributes },
});

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe('RoomExplorerPage brightness slider', () => {
  it('follows the finger and sends one parsed value on release', async () => {
    const { callService } = await openRoom({ 'light.a': light({ brightness: 128 }) });
    const slider = await screen.findByRole('slider');

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '30' } });
    await screen.findByText('30%');
    expect(callService).not.toHaveBeenCalled();

    fireEvent.pointerUp(slider);
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', {
      entity_id: 'light.a',
      brightness_pct: 30,
    });
  });

  it('turns the light off when released at zero', async () => {
    const { callService } = await openRoom({ 'light.a': light({ brightness: 128 }) });
    const slider = await screen.findByRole('slider');

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: '0' } });
    fireEvent.pointerUp(slider);

    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.a' });
  });
});

describe('RoomExplorerPage risky one-tap actions', () => {
  const lock = (state) => ({ state, attributes: { friendly_name: 'Front door' } });

  it('needs two taps to unlock', async () => {
    const { callService } = await openRoom({ 'lock.a': lock('locked') });

    fireEvent.click(await screen.findByRole('button', { name: /locked/i }));
    expect(callService).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: en['lock.action.confirmUnlock'] }));
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('lock', 'unlock', { entity_id: 'lock.a' });
  });

  it('forgets the first tap after a few seconds', async () => {
    const { callService } = await openRoom({ 'lock.a': lock('locked') });
    const button = await screen.findByRole('button', { name: /locked/i });

    vi.useFakeTimers();
    fireEvent.click(button);
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole('button', { name: /locked/i }));

    expect(callService).not.toHaveBeenCalled();
  });

  it('locks on one tap', async () => {
    const { callService } = await openRoom({ 'lock.a': lock('unlocked') });

    fireEvent.click(await screen.findByRole('button', { name: /unlocked/i }));

    expect(callService).toHaveBeenCalledWith('lock', 'lock', { entity_id: 'lock.a' });
  });

  it('opens the room when the light chip is tapped, leaving the lights alone', async () => {
    const entities = { 'light.a': light({ brightness: 128 }), 'light.b': light({}, 'off') };
    mockRoom(entities);
    const { callService } = renderPage(entities);

    fireEvent.click(await screen.findByText('1/2'));

    expect(callService).not.toHaveBeenCalled();
    await screen.findByText(new RegExp(en['roomExplorer.allOff'], 'i'));
  });
});

describe('RoomExplorerPage entity rows', () => {
  it('keeps a never-activated scene and button usable and online', async () => {
    const entities = {
      'scene.movie': { state: 'unknown', attributes: { friendly_name: 'Movie' } },
      'button.restart': { state: 'unknown', attributes: { friendly_name: 'Restart' } },
    };
    mockRoom(entities);
    const { container, callService } = renderPage(entities);

    await screen.findByText('Kitchen');
    await waitFor(() => expect(screen.getByText(/2 entities/)).toBeInTheDocument());
    expect(container.querySelector('.lucide-wifi-off')).toBeNull();

    fireEvent.click(screen.getByText('Kitchen'));
    fireEvent.click(await screen.findByRole('button', { name: en['roomExplorer.run'] }));
    fireEvent.click(screen.getByRole('button', { name: en['roomExplorer.press'] }));

    expect(callService).toHaveBeenCalledWith('scene', 'turn_on', { entity_id: 'scene.movie' });
    expect(callService).toHaveBeenCalledWith('button', 'press', { entity_id: 'button.restart' });
    expect(container.querySelector('.opacity-40')).toBeNull();
    expect(screen.queryByText(en['roomExplorer.state.unknown'])).toBeNull();
  });

  it('still treats an unknown switch as offline', async () => {
    const entities = { 'switch.a': { state: 'unknown', attributes: { friendly_name: 'Pump' } } };
    mockRoom(entities);
    const { container } = renderPage(entities);

    await waitFor(() => expect(container.querySelector('.lucide-wifi-off')).not.toBeNull());
  });

  it('shows no raw translation keys for states without a translation', async () => {
    await openRoom({
      'person.anna': { state: 'home', attributes: { friendly_name: 'Anna' } },
      'scene.movie': {
        state: new Date(Date.now() - 5 * 60000).toISOString(),
        attributes: { friendly_name: 'Movie' },
      },
    });

    await screen.findByText('Home');
    await screen.findByText(en['time.minutesAgo'].replace('{minutes}', '5'));
    expect(screen.queryByText(/roomExplorer\.state\./)).toBeNull();
  });

  describe('climate setpoint', () => {
    const climate = (attributes = {}, state = 'heat') => ({
      state,
      attributes: {
        friendly_name: 'Radiator',
        current_temperature: 20,
        temperature: 21,
        target_temp_step: 0.5,
        min_temp: 5,
        max_temp: 21.5,
        ...attributes,
      },
    });

    it('sends only the last value after quick taps', async () => {
      const { callService } = await openRoom({ 'climate.a': climate({ temperature: 20 }) });
      const plus = await screen.findByRole('button', { name: en['common.increase'] });

      vi.useFakeTimers();
      fireEvent.click(plus);
      fireEvent.click(plus);
      expect(callService).not.toHaveBeenCalled();
      expect(screen.getByText(/21°?\D*$/)).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(1000));

      expect(callService).toHaveBeenCalledTimes(1);
      expect(callService).toHaveBeenCalledWith('climate', 'set_temperature', {
        entity_id: 'climate.a',
        temperature: 21,
      });
    });

    it('stops at the maximum temperature', async () => {
      const { callService } = await openRoom({ 'climate.a': climate() });
      const plus = await screen.findByRole('button', { name: en['common.increase'] });

      vi.useFakeTimers();
      fireEvent.click(plus);
      fireEvent.click(plus);
      act(() => vi.advanceTimersByTime(1000));

      expect(callService).toHaveBeenCalledTimes(1);
      expect(callService).toHaveBeenCalledWith('climate', 'set_temperature', {
        entity_id: 'climate.a',
        temperature: 21.5,
      });
      expect(plus).toBeDisabled();
    });

    it('disables the buttons when unavailable', async () => {
      await openRoom({ 'climate.a': climate({}, 'unavailable') });

      expect(await screen.findByRole('button', { name: en['common.increase'] })).toBeDisabled();
      expect(screen.getByRole('button', { name: en['common.decrease'] })).toBeDisabled();
    });
  });
});

describe('RoomExplorerPage loading', () => {
  const entities = { 'light.a': light({ brightness: 128 }) };

  it('shows loading instead of an empty page while fetching', async () => {
    let finish;
    getAreas.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    getAreaEntityMap.mockResolvedValue({ kitchen: ['light.a'] });
    renderPage(entities);

    expect(screen.getByText(en['common.loading'])).toBeInTheDocument();
    expect(screen.queryByText(en['roomExplorer.noRooms'])).toBeNull();

    await act(async () => finish([{ area_id: 'kitchen', name: 'Kitchen' }]));
    await screen.findByText('Kitchen');
    expect(screen.getByText(/1 entities/)).toBeInTheDocument();
  });

  it('fetches the registries once per visit and not again on the next visit', async () => {
    mockRoom(entities);
    const conn = {};
    const first = renderPage(entities, { conn });
    await screen.findByText('Kitchen');
    first.unmount();

    renderPage(entities, { conn });

    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(getAreas).toHaveBeenCalledTimes(1);
    expect(getAreaEntityMap).toHaveBeenCalledTimes(1);
  });

  it('shows cached rooms when the connection only arrives after mounting', async () => {
    mockRoom(entities);
    const conn = {};
    const first = renderPage(entities, { conn });
    await screen.findByText('Kitchen');
    first.unmount();

    const pageId = 'late-connection';
    const page = (currentConn) => (
      <RoomExplorerPage
        entities={entities}
        callService={vi.fn()}
        conn={currentConn}
        pageSettings={{}}
        pageId={pageId}
        t={t}
      />
    );
    const { rerender } = render(page(null));
    rerender(page(conn));

    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(getAreas).toHaveBeenCalledTimes(1);
  });

  it('shows an error with a retry that works', async () => {
    getAreas.mockRejectedValueOnce(new Error('nope'));
    getAreaEntityMap.mockResolvedValue({ kitchen: ['light.a'] });
    renderPage(entities);

    await screen.findByText(en['roomExplorer.loadError']);

    getAreas.mockResolvedValue([{ area_id: 'kitchen', name: 'Kitchen' }]);
    fireEvent.click(screen.getByRole('button', { name: en['error.retry'] }));

    await screen.findByText('Kitchen');
    expect(screen.queryByText(en['roomExplorer.loadError'])).toBeNull();
  });

  it('remembers the open room when leaving the page and coming back', async () => {
    const conn = {};
    const { unmount, pageId } = await openRoom(entities, { conn });
    await screen.findByText('Ceiling');
    unmount();

    renderPage(entities, { conn, pageId });

    expect(screen.getByText('Ceiling')).toBeInTheDocument();
  });

  it('goes back to the overview when the remembered room no longer exists', async () => {
    const { unmount, pageId } = await openRoom(entities);
    await screen.findByText('Ceiling');
    unmount();

    getAreas.mockResolvedValue([{ area_id: 'hall', name: 'Hall' }]);
    getAreaEntityMap.mockResolvedValue({ hall: [] });
    renderPage(entities, { pageId });

    await screen.findByText('Hall');
    expect(screen.queryByText('Ceiling')).toBeNull();
  });
});

describe('RoomExplorerPage touch targets', () => {
  const expect44 = (button) => expect(button.className).toMatch(/\bh-11\b.*\bw-11\b/);

  it('uses 44 px buttons for covers', async () => {
    await openRoom({ 'cover.a': { state: 'open', attributes: { friendly_name: 'Blind' } } });

    expect44(await screen.findByRole('button', { name: '▲' }));
    expect44(screen.getByRole('button', { name: '■' }));
    expect44(screen.getByRole('button', { name: '▼' }));
  });

  it('uses 44 px buttons for media controls', async () => {
    const { container } = await openRoom({
      'media_player.a': { state: 'paused', attributes: { friendly_name: 'Speaker' } },
    });
    await screen.findByText('Speaker');

    for (const icon of ['.lucide-skip-back', '.lucide-play', '.lucide-skip-forward']) {
      expect44(container.querySelector(icon).closest('button'));
    }
  });
});
