import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import VacuumCard from '../components/cards/VacuumCard';
import MowerCard from '../components/cards/MowerCard';
import VacuumModal from '../modals/VacuumModal';
import type { EntityMap } from '../types/dashboard';

const t = (key: string) => key;
const VACUUM = 'vacuum.rocky';
type Attributes = Record<string, unknown>;

const entity = (id: string, state: string, attributes: Attributes = {}) => ({
  [id]: { entity_id: id, state, attributes, last_changed: '', last_updated: '' },
});
const lookup =
  (entities: EntityMap) =>
  (id: string, attr: string, fallback: unknown = null) =>
    entities[id]?.attributes?.[attr] ?? fallback;

const asProps = <T,>(props: unknown) => props as T;

function renderVacuumCard(entities: EntityMap) {
  const callService = vi.fn(async () => ({}));
  const props = asProps<ComponentProps<typeof VacuumCard>>({
    vacuumId: VACUUM,
    entities,
    cardSettings: {},
    settingsKey: 'home::vacuum',
    customNames: {},
    customIcons: {},
    getA: lookup(entities),
    callService,
    onOpen: () => {},
    t,
  });
  return { ...render(<VacuumCard {...props} />), callService };
}

function renderMowerCard(entities: EntityMap) {
  const props = asProps<ComponentProps<typeof MowerCard>>({
    mowerId: 'lawn_mower.plen',
    entities,
    cardSettings: {},
    settingsKey: 'home::mower',
    customNames: {},
    customIcons: {},
    getA: lookup(entities),
    callService: vi.fn(async () => ({})),
    t,
  });
  return render(<MowerCard {...props} />);
}

interface PopupOptions {
  settings?: Attributes;
  callService?: ReturnType<typeof vi.fn>;
  areaMapping?: Record<string, unknown>;
}

function popupProps(
  entities: EntityMap,
  { settings = {}, callService, areaMapping }: PopupOptions
) {
  const conn = {
    sendMessagePromise: vi.fn(async (message: { type: string }) => {
      if (message.type === 'config/entity_registry/list') {
        return areaMapping
          ? [{ entity_id: VACUUM, options: { vacuum: { area_mapping: areaMapping } } }]
          : [];
      }
      if (message.type === 'config/area_registry/list') {
        return Object.keys(areaMapping || {}).map((id) => ({ area_id: id, name: id }));
      }
      return {};
    }),
  };
  return {
    conn,
    callService: callService || vi.fn(async () => ({})),
    props: {
      show: true,
      onClose: () => {},
      entities,
      getA: lookup(entities),
      t,
      vacuumId: VACUUM,
      vacuumSettings: settings,
      getEntityImageUrl: (url: string) => url,
    },
  };
}

async function renderPopup(entities: EntityMap, options: PopupOptions = {}) {
  const { conn, callService, props } = popupProps(entities, options);
  const element = <VacuumModal {...props} conn={conn} callService={callService} />;
  const view = render(element);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return { ...view, conn, callService, props };
}

const roomSelect = entity('select.rocky_room', 'Kitchen', { options: ['Kitchen', 'Bath'] });
const docked = (attributes: Attributes = {}) => entity(VACUUM, 'docked', attributes);

describe('vacuum and mower cards', () => {
  afterEach(cleanup);

  it.each(['unavailable', 'unknown'])('disables the vacuum buttons when %s', (state) => {
    const { container } = renderVacuumCard(entity(VACUUM, state));
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons.length).toBe(2);
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it.each(['unavailable', 'unknown'])('disables the mower buttons when %s', (state) => {
    const { container } = renderMowerCard(entity('lawn_mower.plen', state));
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons.length).toBe(2);
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it('keeps the buttons usable for a docked vacuum', () => {
    const { container } = renderVacuumCard(docked());
    expect([...container.querySelectorAll('button')].some((b) => b.disabled)).toBe(false);
  });

  it.each(['small', 'large'])('docks the remapped vacuum from the %s card', (size) => {
    const remapped = 'vacuum.remapped';
    const entities = entity(remapped, 'docked');
    const callService = vi.fn(async () => ({}));
    const props = asProps<ComponentProps<typeof VacuumCard>>({
      vacuumId: VACUUM,
      entityId: remapped,
      entities,
      cardSettings: { 'home::vacuum': { size } },
      settingsKey: 'home::vacuum',
      customNames: {},
      customIcons: {},
      getA: lookup(entities),
      callService,
      onOpen: () => {},
      t,
    });
    const { container } = render(<VacuumCard {...props} />);
    fireEvent.click(container.querySelector('.lucide-house')!.closest('button')!);
    expect(callService).toHaveBeenCalledWith('vacuum', 'return_to_base', { entity_id: remapped });
  });

  it('names an unavailable vacuum and mower through the shared label', () => {
    expect(renderVacuumCard(entity(VACUUM, 'unavailable')).container).toHaveTextContent(
      'status.unavailable'
    );
    cleanup();
    expect(renderMowerCard(entity('lawn_mower.plen', 'unknown')).container).toHaveTextContent(
      'common.unknown'
    );
  });

  it('reads the battery from a sensor when the vacuum has no battery attribute', () => {
    const entities = {
      ...docked(),
      ...entity('sensor.rocky_battery', '100', { unit_of_measurement: '%' }),
    };
    const { container } = renderVacuumCard(entities);
    expect(container).toHaveTextContent('vacuum.docked');
    expect(container).toHaveTextContent('100%');
  });

  it('only says charging when the battery says so', () => {
    expect(renderVacuumCard(docked()).container).toHaveTextContent('vacuum.docked');
    cleanup();
    expect(renderVacuumCard(docked({ battery_level: 54 })).container).toHaveTextContent(
      'vacuum.charging'
    );
    cleanup();
    expect(renderVacuumCard(entity(VACUUM, 'charging')).container).toHaveTextContent(
      'vacuum.charging'
    );
  });
});

describe('vacuum popup', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  const openRooms = () => fireEvent.click(screen.getByText('vacuum.roomCleaning'));

  it('disables every control while the vacuum is unavailable', async () => {
    const entities = {
      ...entity(VACUUM, 'unavailable', { supported_features: 16383, fan_speed_list: ['max'] }),
      ...roomSelect,
    };
    await renderPopup(entities, {
      settings: { roomScripts: [{ entityId: 'script.a', label: 'A' }] },
    });
    expect((screen.getByText('vacuum.start').closest('button') as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByText('vacuum.home').closest('button') as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByText('vacuum.find').closest('button') as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByText('A').closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText(/vacuum\.suction/).closest('fieldset')).toHaveProperty(
      'disabled',
      true
    );
    openRooms();
    expect(
      (screen.getByText('vacuum.cleanSelected').closest('button') as HTMLButtonElement).disabled
    ).toBe(true);
    expect(document.querySelector('select')?.disabled).toBe(true);
  });

  it('keeps the picked room through unrelated Home Assistant updates', async () => {
    const entities = { ...docked(), ...roomSelect };
    const { rerender, conn, callService, props } = await renderPopup(entities);
    openRooms();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Bath' } });
    expect(select.value).toBe('Bath');

    rerender(
      <VacuumModal
        {...props}
        entities={{ ...entities, ...entity('sensor.other', '1') }}
        conn={conn}
        callService={callService}
      />
    );
    expect((document.querySelector('select') as HTMLSelectElement).value).toBe('Bath');
  });

  it('starts the vacuum after selecting the room', async () => {
    const { callService } = await renderPopup({ ...docked(), ...roomSelect });
    openRooms();
    fireEvent.click(screen.getByText('vacuum.cleanSelected'));
    await waitFor(() => expect(callService).toHaveBeenCalledTimes(2));
    expect(callService.mock.calls[0]).toEqual([
      'select',
      'select_option',
      { entity_id: 'select.rocky_room', option: 'Kitchen' },
    ]);
    expect(callService.mock.calls[1]).toEqual(['vacuum', 'start', { entity_id: VACUUM }]);
  });

  it('does not start the vacuum when selecting the room fails', async () => {
    const callService = vi.fn(async () => {
      throw new Error('failed');
    });
    await renderPopup({ ...docked(), ...roomSelect }, { callService });
    openRooms();
    await act(async () => {
      fireEvent.click(screen.getByText('vacuum.cleanSelected'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(callService).toHaveBeenCalledTimes(1);
  });

  it('runs room scripts through callService', async () => {
    const { callService, conn } = await renderPopup(docked(), {
      settings: { roomScripts: [{ entityId: 'script.kitchen', label: 'Kjøkken' }] },
    });
    conn.sendMessagePromise.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByText('Kjøkken'));
    });
    expect(callService).toHaveBeenCalledWith('script', 'turn_on', { entity_id: 'script.kitchen' });
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
  });

  it('cleans mapped areas through callService', async () => {
    const { callService, conn } = await renderPopup(docked(), {
      areaMapping: { stue: ['1'] },
    });
    conn.sendMessagePromise.mockClear();
    openRooms();
    fireEvent.click(screen.getByText('stue'));
    await act(async () => {
      fireEvent.click(screen.getByText('vacuum.cleanSelected'));
    });
    expect(callService).toHaveBeenCalledWith('vacuum', 'clean_area', {
      target: { entity_id: VACUUM },
      cleaning_area_id: ['stue'],
    });
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
  });

  it('resets consumables through callService', async () => {
    const entities = {
      ...docked(),
      ...roomSelect,
      ...entity('sensor.rocky_main_brush_time_left', '100', { unit_of_measurement: 'h' }),
      ...entity('button.rocky_reset_main_brush', 'unknown'),
    };
    const { callService, conn } = await renderPopup(entities);
    conn.sendMessagePromise.mockClear();
    fireEvent.click(screen.getByText('vacuum.statsHistory'));
    fireEvent.click(screen.getByText('vacuum.reset'));
    await act(async () => {
      fireEvent.click(screen.getByText('vacuum.confirmResetShort'));
    });
    expect(callService).toHaveBeenCalledWith('button', 'press', {
      entity_id: 'button.rocky_reset_main_brush',
    });
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
  });

  it('offers return to base only with the RETURN_HOME feature', async () => {
    await renderPopup(entity(VACUUM, 'docked', { supported_features: 8 }));
    expect(screen.queryByRole('button', { name: 'vacuum.home' })).toBeNull();
  });

  it('stops instead of pausing when only STOP is supported', async () => {
    const { callService } = await renderPopup(
      entity(VACUUM, 'cleaning', { supported_features: 2 | 8 })
    );
    fireEvent.click(screen.getByRole('button', { name: /vacuum\.stop/ }));
    expect(callService).toHaveBeenCalledWith('vacuum', 'stop', { entity_id: VACUUM });
  });

  it('offers find only with the LOCATE feature', async () => {
    await renderPopup(docked({ supported_features: 16 | 64 | 256 | 1024 }));
    expect(screen.queryByText('vacuum.find')).toBeNull();
    cleanup();
    await renderPopup(docked({ supported_features: 512 }));
    expect(screen.getByText('vacuum.find')).toBeTruthy();
  });

  it('offers suction only with FAN_SPEED and a real list of levels', async () => {
    await renderPopup(docked({ supported_features: 16 }));
    expect(screen.queryByLabelText(/vacuum\.suction/)).toBeNull();
    cleanup();
    await renderPopup(docked({ supported_features: 16, fan_speed_list: ['eco'] }));
    expect(screen.queryByLabelText(/vacuum\.suction/)).toBeNull();
    cleanup();
    await renderPopup(docked({ supported_features: 32, fan_speed_list: ['eco'] }));
    fireEvent.click(screen.getByLabelText(/vacuum\.suction/));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['eco']);
  });

  const stats = (attributes: Attributes) => ({ ...docked(attributes), ...roomSelect });

  it('shows no unit next to an empty average', async () => {
    await renderPopup(stats({}));
    fireEvent.click(screen.getByText('vacuum.statsHistory'));
    const tile = screen.getByText('vacuum.avgTime').parentElement as HTMLElement;
    expect(tile).toHaveTextContent('--');
    expect(tile).not.toHaveTextContent('vacuum.statsMinutes');
    expect(document.body).not.toHaveTextContent('-- m²');
  });

  it('uses the unit of the total for the average', async () => {
    const entities = {
      ...stats({}),
      ...entity('sensor.rocky_total_clean_count', '4'),
      ...entity('sensor.rocky_total_cleaning_time', '10', { unit_of_measurement: 'h' }),
    };
    await renderPopup(entities, {
      settings: {
        totalCleanCountSensorId: 'sensor.rocky_total_clean_count',
        totalCleanTimeSensorId: 'sensor.rocky_total_cleaning_time',
      },
    });
    fireEvent.click(screen.getByText('vacuum.statsHistory'));
    const tile = screen.getByText('vacuum.avgTime').parentElement as HTMLElement;
    expect(tile).toHaveTextContent('2.5 h');
  });
});
