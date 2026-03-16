import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SensorCard from '../components/cards/SensorCard';

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
  t: (key) => ({ 'common.on': 'On', 'common.off': 'Off' }[key] || key),
  ...overrides,
});

describe('SensorCard', () => {
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
            (
              {
                'status.on': 'Enabled',
                'status.off': 'Disabled',
                'common.on': 'Turn on',
                'common.off': 'Turn off',
              }[key] || key
            ),
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
});