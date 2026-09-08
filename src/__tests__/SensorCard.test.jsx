import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SensorCard from '../components/cards/SensorCard';

const { getHistoryMock, getStatisticsMock } = vi.hoisted(() => ({
  getHistoryMock: vi.fn(),
  getStatisticsMock: vi.fn(),
}));

vi.mock('../services/haClient', async (importOriginal) => ({
  ...(await importOriginal()),
  getHistory: getHistoryMock,
  getStatistics: getStatisticsMock,
}));

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({
    haConfig: {
      unit_system: {
        temperature: '°C',
      },
    },
  }),
}));

const baseProps = (overrides = {}) => ({
  entity: {
    entity_id: 'input_boolean.jellyfin_downstairs',
    state: 'on',
    attributes: {
      friendly_name: 'Jellyfin Downstairs',
    },
  },
  entities: {},
  conn: null,
  settings: { size: 'small' },
  dragProps: {},
  cardStyle: {},
  Icon: null,
  name: 'Jellyfin Downstairs',
  editMode: false,
  controls: null,
  onControl: vi.fn(),
  onOpen: vi.fn(),
  t: (key) => ({ 'common.on': 'On', 'common.off': 'Off' })[key] || key,
  ...overrides,
});

describe('SensorCard', () => {
  it('shows an informative script status instead of repeating the entity type', () => {
    const t = (key) =>
      ({
        'sensor.script.ready': 'Ready',
        'sensor.script.running': 'Running',
      })[key] || key;

    const { rerender } = render(
      <SensorCard
        {...baseProps({
          entity: {
            entity_id: 'script.feed_cat',
            state: 'off',
            attributes: { friendly_name: 'Feed cat' },
          },
          name: 'Feed cat',
          settings: { size: 'large' },
          t,
        })}
      />
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.queryByText('Script')).not.toBeInTheDocument();

    rerender(
      <SensorCard
        {...baseProps({
          entity: {
            entity_id: 'script.feed_cat',
            state: 'on',
            attributes: { friendly_name: 'Feed cat' },
          },
          name: 'Feed cat',
          settings: { size: 'large' },
          t,
        })}
      />
    );

    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('allows the script status text to be customized', () => {
    render(
      <SensorCard
        {...baseProps({
          entity: {
            entity_id: 'script.feed_cat',
            state: 'off',
            attributes: { friendly_name: 'Feed cat' },
          },
          name: 'Feed cat',
          settings: { size: 'large', scriptStatusText: 'Ready to feed' },
        })}
      />
    );

    expect(screen.getByText('Ready to feed')).toBeInTheDocument();
  });

  it('keeps small mobile titles truncated instead of wrapping vertically', () => {
    render(<SensorCard {...baseProps()} isMobile />);

    const title = screen.getByText('Jellyfin Downstairs');

    expect(title.className).toContain('truncate');
    expect(title.className).not.toContain('break-words');
  });

  it('uses compact mobile typography for large non-numeric states', () => {
    render(
      <SensorCard
        {...baseProps({
          settings: { size: 'large' },
          entity: {
            entity_id: 'binary_sensor.front_door',
            state: 'on',
            attributes: {
              friendly_name: 'Front Door',
              device_class: 'door',
            },
          },
          name: 'Front Door',
        })}
        isMobile
      />
    );

    const stateLabel = screen.getByText('binary.door.open');

    expect(stateLabel.className).toContain('text-[1.4rem]');
    expect(stateLabel.className).toContain('truncate');
  });

  it('shows toggle state as a compact chip on large mobile toggle cards', () => {
    render(
      <SensorCard
        {...baseProps({
          settings: { size: 'large' },
          t: (key) =>
            ({
              'status.on': 'Enabled',
              'status.off': 'Disabled',
              'common.on': 'Turn on',
              'common.off': 'Turn off',
            })[key] || key,
        })}
        isMobile
      />
    );

    const stateChip = screen.getByText('Enabled');

    expect(stateChip.className).toContain('rounded-full');
    expect(stateChip.className).toContain('text-[9px]');
    expect(stateChip.className).not.toContain('text-[1.4rem]');
  });

  it('scales donut visuals down on mobile small cards', () => {
    const { container } = render(
      <SensorCard
        {...baseProps({
          settings: { size: 'small', sensorVariant: 'donut' },
          entity: {
            entity_id: 'sensor.temperature',
            state: '14',
            attributes: {
              friendly_name: 'Temperature',
              unit_of_measurement: '%',
            },
          },
          name: 'Temperature',
        })}
        isMobile
      />
    );

    expect(container.querySelector('svg[width="36"][height="36"]')).not.toBeNull();
  });

  it('scales a small gauge from the available card width', () => {
    const { container } = render(
      <SensorCard
        {...baseProps({
          settings: { size: 'small', sensorVariant: 'gauge' },
          entity: {
            entity_id: 'sensor.pollen',
            state: '2',
            attributes: {
              friendly_name: 'Pollen',
            },
          },
          name: 'Pollen',
        })}
      />
    );

    const gauge = Array.from(container.querySelectorAll('svg')).find(
      (svg) => svg.getAttribute('viewBox') === '0 0 80 44'
    );

    expect(gauge).toBeDefined();
    expect(gauge.className.baseVal).toContain('w-[clamp(3.5rem,25cqw,6rem)]');
    expect(gauge.parentElement.className).toContain('ml-auto');
    expect(gauge.parentElement.className).toContain('pr-1');
    expect(screen.getByText('Pollen').parentElement.className).not.toContain('padding-right');
  });

  it('keeps the same right inset for small donut visuals', () => {
    const { container } = render(
      <SensorCard
        {...baseProps({
          settings: { size: 'small', sensorVariant: 'donut' },
          entity: {
            entity_id: 'sensor.humidity',
            state: '48',
            attributes: {
              friendly_name: 'Humidity',
              unit_of_measurement: '%',
            },
          },
          name: 'Humidity',
        })}
      />
    );

    const donut = container.querySelector('svg[width="42"][height="42"]');

    expect(donut).not.toBeNull();
    expect(donut.parentElement.className).toContain('ml-auto');
    expect(donut.parentElement.className).toContain('pr-1');
    expect(screen.getByText('Humidity').parentElement.className).not.toContain('pr-14');
  });

  it('renders a responsive bar visual on small cards', () => {
    const { container } = render(
      <SensorCard
        {...baseProps({
          settings: { size: 'small', sensorVariant: 'bar' },
          entity: {
            entity_id: 'sensor.humidity',
            state: '48',
            attributes: {
              friendly_name: 'Humidity',
              unit_of_measurement: '%',
            },
          },
          name: 'Humidity',
        })}
      />
    );

    const graph = container.querySelector('[data-sensor-graph="bar"]');
    const bar = graph?.querySelector('div[style*="height: 8px"]');

    expect(graph).not.toBeNull();
    expect(graph.className).toContain('ml-auto');
    expect(graph.className).toContain('pr-1');
    expect(graph.firstElementChild.className).toContain('w-[clamp(3.5rem,25cqw,6rem)]');
    expect(bar).not.toBeNull();
    expect(screen.getByText('Humidity').parentElement.className).not.toContain('padding-right');
  });

  it('keeps history graphs inset from the right edge', async () => {
    getHistoryMock.mockResolvedValueOnce([
      { state: '20', last_changed: '2026-07-25T18:00:00.000Z' },
      { state: '24', last_changed: '2026-07-25T19:00:00.000Z' },
    ]);

    const { container } = render(
      <SensorCard
        {...baseProps({
          conn: {},
          settings: { size: 'large', sensorVariant: 'default', showGraph: true },
          entity: {
            entity_id: 'sensor.temperature',
            state: '24',
            attributes: {
              friendly_name: 'Temperature',
              unit_of_measurement: '°C',
            },
          },
          name: 'Temperature',
        })}
      />
    );

    await waitFor(() => {
      expect(container.querySelector('[data-sensor-graph="history"]')).not.toBeNull();
    });

    expect(container.querySelector('[data-sensor-graph="history"]').className).toContain('right-0');
    expect(
      container.querySelector('[data-sensor-graph="history"] [data-chart-safe-inset="12"]')
    ).not.toBeNull();
  });

  it('scales bar visuals down on mobile large cards', () => {
    const { container } = render(
      <SensorCard
        {...baseProps({
          settings: { size: 'large', sensorVariant: 'bar' },
          entity: {
            entity_id: 'sensor.temperature',
            state: '14',
            attributes: {
              friendly_name: 'Temperature',
              unit_of_measurement: '%',
            },
          },
          name: 'Temperature',
        })}
        isMobile
      />
    );

    expect(container.querySelector('div[style*="height: 14px"]')).not.toBeNull();
  });

  it('scales donut visuals down on mobile large cards', () => {
    const { container } = render(
      <SensorCard
        {...baseProps({
          settings: { size: 'large', sensorVariant: 'donut' },
          entity: {
            entity_id: 'sensor.speed',
            state: '565.2',
            attributes: {
              friendly_name: 'Emby Speed',
              unit_of_measurement: 'km/h',
            },
          },
          name: 'Emby Speed',
        })}
        isMobile
      />
    );

    expect(container.querySelector('svg[width="64"][height="64"]')).not.toBeNull();
    expect(screen.getByText('565.2').className).toContain('text-[1.3rem]');
  });

  it('uses the styled dropdown for select entities and triggers select_option without opening the card', () => {
    const onControl = vi.fn();
    const onOpen = vi.fn();

    const { container } = render(
      <SensorCard
        {...baseProps({
          entity: {
            entity_id: 'select.hvac_mode',
            state: 'Eco',
            attributes: {
              friendly_name: 'HVAC Mode',
              options: ['Eco', 'Boost', 'Away'],
            },
          },
          name: 'HVAC Mode',
          onControl,
          onOpen,
          settings: { size: 'large' },
        })}
      />
    );

    expect(container.querySelector('select')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'sensor.select.label: Eco' }));
    fireEvent.click(screen.getByRole('option', { name: 'Boost' }));

    expect(onControl).toHaveBeenCalledWith('select_option', 'Boost');
    expect(onOpen).not.toHaveBeenCalled();
  });
});
