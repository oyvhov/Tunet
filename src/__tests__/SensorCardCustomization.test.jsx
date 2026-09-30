import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SensorCard from '../components/cards/SensorCard';

const units = vi.hoisted(() => ({ mode: 'follow_ha' }));
vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: units.mode }),
  useHomeAssistantMeta: () => ({ haConfig: { unit_system: { temperature: '°C' } } }),
}));

const scene = {
  entity_id: 'scene.night',
  state: '2026-09-29T20:00:00Z',
  attributes: { friendly_name: 'Night lights' },
};
const climate = {
  entity_id: 'climate.living_room',
  state: 'off',
  attributes: { supported_features: 384, current_temperature: 23 },
};
const temperature = {
  entity_id: 'sensor.temperature',
  state: '23',
  attributes: { device_class: 'temperature', unit_of_measurement: '°C' },
};
const props = (overrides = {}) => ({
  entity: scene,
  entities: {
    [scene.entity_id]: scene,
    [climate.entity_id]: climate,
    [temperature.entity_id]: temperature,
  },
  conn: { sendMessagePromise: vi.fn().mockResolvedValue({}) },
  settings: { size: 'large', showGraph: false },
  name: 'Night lights',
  t: (key) => key,
  onOpen: vi.fn(),
  ...overrides,
});

describe('SensorCard customization', () => {
  afterEach(() => {
    units.mode = 'follow_ha';
  });
  it('keeps the custom scene label and reports only acknowledged command success', async () => {
    let resolve;
    const conn = {
      sendMessagePromise: vi.fn().mockReturnValue(
        new Promise((done) => {
          resolve = done;
        })
      ),
    };
    const p = props({
      conn,
      settings: {
        size: 'large',
        sensorStatusMode: 'hidden',
        sensorAction: { label: 'Start night lights' },
      },
    });
    render(<SensorCard {...p} />);
    expect(screen.queryByText('sensor.scene.label')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Start night lights' });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('sensor.action.pending');
    expect(screen.queryByText('sensor.action.sent')).not.toBeInTheDocument();
    resolve({});
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('sensor.action.sent'));
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent('Start night lights');
    expect(conn.sendMessagePromise).toHaveBeenCalledWith({
      type: 'call_service',
      domain: 'scene',
      service: 'turn_on',
      service_data: { entity_id: 'scene.night' },
    });
    expect(p.onOpen).not.toHaveBeenCalled();
  });

  it('shows an error instead of positive scene feedback when HA rejects', async () => {
    const callService = vi.fn().mockRejectedValue(new Error('Failed'));
    render(<SensorCard {...props({ callService })} />);
    fireEvent.click(screen.getByRole('button', { name: 'sensor.scene.activate' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('sensor.action.error')
    );
    expect(screen.queryByText('sensor.action.sent')).not.toBeInTheDocument();
  });

  it('displays one sensor while toggling a different climate entity', async () => {
    const callService = vi.fn().mockResolvedValue({});
    const p = props({
      entity: temperature,
      callService,
      settings: {
        sensorAction: {
          type: 'toggle',
          entityId: climate.entity_id,
          labelOff: 'Start cooling',
          labelOn: 'Stop cooling',
        },
      },
    });
    const { rerender } = render(<SensorCard {...p} />);
    expect(screen.getByText('23')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start cooling' }));
    expect(callService).toHaveBeenCalledWith('climate', 'turn_on', {
      entity_id: climate.entity_id,
    });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('sensor.action.pending')
    );
    rerender(
      <SensorCard
        {...p}
        entities={{ ...p.entities, [climate.entity_id]: { ...climate, state: 'cool' } }}
      />
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('sensor.action.confirmed')
    );
    expect(screen.getByRole('button', { name: 'Stop cooling' })).toBeEnabled();
  });

  it('uses selected status attributes and renders numeric visuals', () => {
    render(
      <SensorCard
        {...props({
          settings: {
            sensorStatusMode: 'attribute',
            sensorStatusEntityId: climate.entity_id,
            sensorStatusAttribute: 'current_temperature',
            sensorVariant: 'gauge',
          },
        })}
      />
    );
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('uses text status instead of the numeric entity value', () => {
    render(
      <SensorCard
        {...props({
          entity: temperature,
          settings: { sensorStatusMode: 'text', sensorStatusText: 'Comfortable' },
        })}
      />
    );
    expect(screen.getByText('Comfortable')).toBeInTheDocument();
    expect(screen.queryByText('23')).not.toBeInTheDocument();
  });

  it.each(['large', 'small'])(
    'keeps icon feedback tied to its action target in %s size',
    async (size) => {
      const p = props({
        entity: temperature,
        settings: {
          size,
          sensorAction: {
            type: 'toggle',
            entityId: climate.entity_id,
            trigger: 'icon',
            label: 'Cooling',
          },
        },
      });
      const { rerender } = render(<SensorCard {...p} />);
      const button = screen.getByRole('button', { name: 'Cooling', exact: true });
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(p.onOpen).not.toHaveBeenCalled();
      rerender(
        <SensorCard
          {...p}
          entities={{ ...p.entities, [climate.entity_id]: { ...climate, state: 'cool' } }}
        />
      );
      await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'false'));
      expect(button.className).toContain('text-[var(--accent-color)]');
      fireEvent.keyDown(
        screen.getByRole('button', { name: 'Night lights: sensor.action.details' }),
        { key: 'Enter' }
      );
      expect(p.onOpen).toHaveBeenCalledOnce();
    }
  );

  it('activates a whole card using the keyboard while keeping details separate', async () => {
    const p = props({
      settings: { sensorAction: { trigger: 'card', label: 'Night' } },
    });
    render(<SensorCard {...p} />);
    const card = screen.getByRole('button', { name: 'Night', exact: true });
    fireEvent.keyDown(card, { key: ' ' });
    expect(p.conn.sendMessagePromise).toHaveBeenCalledOnce();
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(p.conn.sendMessagePromise).toHaveBeenCalledOnce();
    await waitFor(() => expect(card).toHaveAttribute('aria-busy', 'false'));
    expect(screen.queryByText('sensor.action.details')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'sensor.action.details', exact: true }));
    expect(p.onOpen).toHaveBeenCalledOnce();
    expect(p.conn.sendMessagePromise).toHaveBeenCalledOnce();
  });

  it('opens the configured details entity while offline', () => {
    const p = props({
      conn: null,
      settings: { sensorAction: { type: 'more-info', entityId: climate.entity_id } },
    });
    render(<SensorCard {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'sensor.action.details', exact: true }));
    expect(p.onOpen).toHaveBeenCalledWith(climate.entity_id);
  });

  it.each([false, { room: 'Bedroom' }])(
    'renders non-scalar and boolean status attributes: %j',
    (value) => {
      render(
        <SensorCard
          {...props({
            entity: { ...scene, attributes: { ...scene.attributes, value } },
            entities: {},
            settings: { sensorStatusMode: 'attribute', sensorStatusAttribute: 'value' },
          })}
        />
      );
      expect(
        screen.getByText(typeof value === 'object' ? JSON.stringify(value) : String(value))
      ).toBeInTheDocument();
    }
  );

  it('converts zero temperature rather than treating it as binary state', () => {
    units.mode = 'imperial';
    render(<SensorCard {...props({ entity: { ...temperature, state: '0' }, entities: {} })} />);
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('°F')).toBeInTheDocument();
  });

  it('does not hide a separately selected input number status', () => {
    const status = { entity_id: 'input_number.target', state: '17', attributes: {} };
    render(
      <SensorCard
        {...props({
          entities: { [scene.entity_id]: scene, [status.entity_id]: status },
          settings: { sensorStatusMode: 'entity', sensorStatusEntityId: status.entity_id },
        })}
      />
    );
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('hides numeric visuals together with a hidden status', () => {
    const { container } = render(
      <SensorCard
        {...props({
          entity: temperature,
          settings: { sensorStatusMode: 'hidden', sensorVariant: 'gauge' },
        })}
      />
    );
    expect(container.querySelector('[data-sensor-graph]')).toBeNull();
    expect(screen.queryByText('23')).not.toBeInTheDocument();
  });

  it.each([{ preview: true }, { editMode: true }, { conn: null }])(
    'prevents execution while previewing, editing or offline: %j',
    (override) => {
      const p = props({
        ...override,
        settings: { sensorAction: { type: 'scene', label: 'Night' } },
      });
      render(<SensorCard {...p} />);
      const button = screen.getByRole('button', { name: 'Night' });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      if (p.conn) expect(p.conn.sendMessagePromise).not.toHaveBeenCalled();
    }
  );
  it('ignores layout values stored by earlier versions', () => {
    const { container } = render(
      <SensorCard
        {...props({ settings: { size: 'large', showGraph: false, sensorLayout: 'compact' } })}
      />
    );
    expect(container.querySelector('[data-sensor-layout]')).toBeNull();
    expect(screen.getByRole('button', { name: 'sensor.scene.activate' }).className).toContain(
      'w-full'
    );
  });

  it('lets a small action button shrink to an icon when its card is narrow', () => {
    render(
      <SensorCard
        {...props({
          settings: {
            size: 'small',
            showGraph: false,
            sensorAction: { label: 'Start night lights' },
          },
        })}
      />
    );
    const button = screen.getByRole('button', { name: 'Start night lights' });
    expect(button.className).toContain('max-w-[min(10rem,45cqw)]');
    expect(button.className).toContain('@max-[200px]:w-11');
    expect(screen.getByText('Start night lights').className).toContain('@max-[200px]:sr-only');
    expect(screen.getByText('Night lights')).toBeInTheDocument();
  });
  it('ignores subtitles stored by earlier versions', () => {
    render(
      <SensorCard {...props({ settings: { size: 'large', sensorSubtitle: 'Living room' } })} />
    );
    expect(screen.queryByText('Living room')).not.toBeInTheDocument();
  });
  it.each([
    ['button.doorbell', '2026-09-29T19:00:00+00:00'],
    ['input_button.reset', 'unknown'],
  ])('shows a plain label instead of the raw state for %s', (entityId, state) => {
    const entity = { entity_id: entityId, state, attributes: {} };
    render(<SensorCard {...props({ entity, entities: { [entityId]: entity } })} />);
    expect(screen.getByText('sensor.button.label')).toBeInTheDocument();
    expect(screen.queryByText(state)).not.toBeInTheDocument();
  });

  it.each([
    ['icon', 'large'],
    ['card', 'large'],
    ['icon', 'small'],
    ['card', 'small'],
  ])('shows the text set for a %s action on the %s card', (trigger, size) => {
    render(
      <SensorCard
        {...props({
          settings: { size, showGraph: false, sensorAction: { trigger, label: 'Good night' } },
        })}
      />
    );
    expect(screen.getByText('Good night')).toBeInTheDocument();
  });

  it('shows the text only once when the action is a button', () => {
    render(
      <SensorCard
        {...props({
          settings: { showGraph: false, sensorAction: { trigger: 'button', label: 'Good night' } },
        })}
      />
    );
    expect(screen.getAllByText('Good night')).toHaveLength(1);
  });

  it('adds no caption when no text has been set for an icon action', () => {
    render(
      <SensorCard
        {...props({ settings: { showGraph: false, sensorAction: { trigger: 'icon' } } })}
      />
    );
    expect(screen.queryByText('sensor.scene.activate')).not.toBeInTheDocument();
  });

  it('disables an action whose target cannot run it instead of failing when tapped', () => {
    render(
      <SensorCard
        {...props({ entity: temperature, settings: { sensorAction: { type: 'toggle' } } })}
      />
    );
    expect(screen.getByRole('button', { name: 'sensor.action.turnOn' })).toBeDisabled();
  });

  it('does not add an info button when the whole card already opens details', () => {
    render(
      <SensorCard
        {...props({
          settings: { showGraph: false, sensorAction: { type: 'more-info', trigger: 'card' } },
        })}
      />
    );
    expect(
      screen.getAllByRole('button', { name: 'sensor.action.details', exact: true })
    ).toHaveLength(1);
  });
});
