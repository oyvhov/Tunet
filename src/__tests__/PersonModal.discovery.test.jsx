import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PersonModal from '../modals/PersonModal';

vi.mock('leaflet', () => ({
  default: {
    map: () => ({ setView: vi.fn().mockReturnThis(), invalidateSize: vi.fn(), remove: vi.fn() }),
    tileLayer: () => ({ addTo: vi.fn().mockReturnThis(), remove: vi.fn() }),
    divIcon: vi.fn(),
    marker: () => ({ addTo: vi.fn().mockReturnThis(), remove: vi.fn() }),
  },
}));

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({ haConfig: {} }),
}));

const t = (key) => key;

const person = (attributes = {}, state = 'not_home') => ({
  entity_id: 'person.ola',
  state,
  attributes: { friendly_name: 'Ola Nordmann', ...attributes },
});

const tracker = (entityId, friendlyName, attributes = {}) => ({
  entity_id: entityId,
  state: 'not_home',
  attributes: { friendly_name: friendlyName, latitude: 60.4, longitude: 5.3, ...attributes },
});

const batterySensor = (entityId, state = '80') => ({
  entity_id: entityId,
  state,
  attributes: { device_class: 'battery', unit_of_measurement: '%' },
});

function renderModal({ entity = person(), entities = {}, settings = {} } = {}) {
  return render(
    <PersonModal
      show
      onClose={vi.fn()}
      personId="person.ola"
      entity={entity}
      entities={{ 'person.ola': entity, ...entities }}
      t={t}
      settings={settings}
    />
  );
}

describe('PersonModal tracker discovery', () => {
  it('does not borrow the tracker of a relative who shares the surname', () => {
    renderModal({
      entities: {
        'device_tracker.kari_nordmann_phone': tracker(
          'device_tracker.kari_nordmann_phone',
          'Kari Nordmann Phone'
        ),
      },
    });

    expect(screen.getByText('map.locationUnknown')).toBeInTheDocument();
    expect(screen.queryByText('Kari Nordmann Phone')).not.toBeInTheDocument();
  });

  it('does not present the person as their own device tracker', () => {
    renderModal();

    expect(screen.queryByText('person.deviceTracker')).not.toBeInTheDocument();
  });

  it('finds the tracker that carries the first name', () => {
    renderModal({
      entities: {
        'device_tracker.ola_phone': tracker('device_tracker.ola_phone', 'Pixel 9'),
      },
    });

    expect(screen.queryByText('map.locationUnknown')).not.toBeInTheDocument();
    expect(screen.getAllByText('Pixel 9').length).toBeGreaterThan(0);
  });

  it('matches the transliterated entity id of a name with Norwegian letters', () => {
    const entity = person({ friendly_name: 'Øyvind Hansen' });
    renderModal({
      entity,
      entities: {
        'device_tracker.oyvind_phone': tracker('device_tracker.oyvind_phone', 'Pixel 9'),
      },
    });

    expect(screen.getAllByText('Pixel 9').length).toBeGreaterThan(0);
  });

  it('matches whole words, so a short name cannot claim a longer one', () => {
    renderModal({
      entities: {
        'device_tracker.nikolas_phone': tracker('device_tracker.nikolas_phone', 'Nikolas Phone'),
      },
    });

    expect(screen.getByText('map.locationUnknown')).toBeInTheDocument();
  });

  it('skips a tracker that another person entity already owns', () => {
    renderModal({
      entities: {
        'person.kari': {
          entity_id: 'person.kari',
          state: 'home',
          attributes: {
            friendly_name: 'Kari',
            device_trackers: ['device_tracker.ola_old_phone'],
          },
        },
        'device_tracker.ola_old_phone': tracker('device_tracker.ola_old_phone', 'Old phone'),
      },
    });

    expect(screen.getByText('map.locationUnknown')).toBeInTheDocument();
  });
});

describe('PersonModal battery discovery', () => {
  it('shows the battery of the linked tracker when none is configured', () => {
    renderModal({
      entity: person({ source: 'device_tracker.ola_phone' }),
      entities: {
        'device_tracker.ola_phone': tracker('device_tracker.ola_phone', 'Pixel 9', {
          battery_level: 64,
        }),
      },
    });

    expect(screen.getByText('person.battery')).toBeInTheDocument();
    expect(screen.getByText('64%')).toBeInTheDocument();
  });

  it('shows a battery sensor found by first name', () => {
    renderModal({
      entities: { 'sensor.ola_phone_battery': batterySensor('sensor.ola_phone_battery', '37') },
    });

    expect(screen.getByText('37%')).toBeInTheDocument();
  });

  it('does not show the battery of a relative who shares the surname', () => {
    renderModal({
      entities: { 'sensor.kari_nordmann_battery': batterySensor('sensor.kari_nordmann_battery') },
    });

    expect(screen.queryByText('person.battery')).not.toBeInTheDocument();
  });

  it('does not grab an arbitrary battery when the person has no name', () => {
    const entity = person({ friendly_name: undefined });
    renderModal({
      entity,
      entities: { 'sensor.garage_door_battery': batterySensor('sensor.garage_door_battery') },
    });

    expect(screen.queryByText('person.battery')).not.toBeInTheDocument();
  });

  it('leaves out a discovered battery whose sensor is unavailable', () => {
    renderModal({
      entities: {
        'sensor.ola_phone_battery': batterySensor('sensor.ola_phone_battery', 'unavailable'),
      },
    });

    expect(screen.queryByText('person.battery')).not.toBeInTheDocument();
  });

  it('keeps a configured phone battery instead of adding a discovered one', () => {
    renderModal({
      entity: person({ battery_level: 12 }),
      entities: { 'sensor.chosen_battery': batterySensor('sensor.chosen_battery', '91') },
      settings: { phoneBatteryEntity: 'sensor.chosen_battery' },
    });

    expect(screen.getByText('91%')).toBeInTheDocument();
    expect(screen.queryByText('12%')).not.toBeInTheDocument();
    expect(screen.queryByText('person.battery')).not.toBeInTheDocument();
  });

  it('does not invent a reading when the configured battery is unavailable', () => {
    renderModal({
      entity: person({ battery_level: 12 }),
      entities: {
        'sensor.chosen_battery': batterySensor('sensor.chosen_battery', 'unavailable'),
      },
      settings: { phoneBatteryEntity: 'sensor.chosen_battery' },
    });

    expect(screen.queryByText('12%')).not.toBeInTheDocument();
  });
});
