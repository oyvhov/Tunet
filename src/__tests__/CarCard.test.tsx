import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import CarCard from '../components/cards/CarCard';
import type { EntityMap } from '../types/dashboard';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha', language: 'nb' }),
  useHomeAssistantMeta: () => ({ haConfig: { unit_system: { length: 'km' } } }),
}));

const NOW = new Date(2026, 10, 10, 22, 0, 0);
const t = (key: string) =>
  ({
    'car.chargedAt': 'Charged at {time}',
    'car.chargedIn': 'Charged in {minutes} min',
  })[key] || key;

const sensor = (id: string, state: string, unit?: string): EntityMap => ({
  [id]: { entity_id: id, state, attributes: unit ? { unit_of_measurement: unit } : {} },
});

const renderCar = (entities: EntityMap, settings: Record<string, unknown>) =>
  render(
    <CarCard
      {...({
        cardId: 'car_card_1',
        dragProps: {},
        controls: null,
        cardStyle: {},
        entities,
        editMode: false,
        cardSettings: { 'home::car': settings },
        settingsKey: 'home::car',
        customNames: {},
        customIcons: {},
        getS: (id: string) => entities[id]?.state ?? '',
        onOpen: vi.fn(),
        isMobile: false,
        t,
      } as unknown as ComponentProps<typeof CarCard>)}
    />
  );

const base = {
  ...sensor('sensor.battery', '64', '%'),
  ...sensor('sensor.range', '312', 'km'),
  ...sensor('binary_sensor.charging', 'on'),
};
const mapping = {
  batteryId: 'sensor.battery',
  rangeId: 'sensor.range',
  chargingId: 'binary_sensor.charging',
};

describe('CarCard charge finish', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('shows the range and the time the charge ends', () => {
    const entities = {
      ...base,
      ...sensor('sensor.end', new Date(2026, 10, 11, 5, 40).toISOString()),
    };
    const { container } = renderCar(entities, { ...mapping, chargeEndTimeId: 'sensor.end' });
    expect(container).toHaveTextContent('312 km');
    expect(container).toHaveTextContent('Charged at 05:40');
  });

  it('counts down the last hour from a time-to-full sensor', () => {
    const entities = { ...base, ...sensor('sensor.full', '25', 'min') };
    const { container } = renderCar(entities, { ...mapping, timeToFullId: 'sensor.full' });
    expect(container).toHaveTextContent('Charged in 25 min');
  });

  it('says nothing while the car is not charging or plugged in', () => {
    const entities = {
      ...base,
      ...sensor('binary_sensor.charging', 'off'),
      ...sensor('sensor.full', '25', 'min'),
    };
    const { container } = renderCar(entities, { ...mapping, timeToFullId: 'sensor.full' });
    expect(container).not.toHaveTextContent('Charged');
  });

  it('says nothing when the sensors have no answer', () => {
    const entities = {
      ...base,
      ...sensor('sensor.full', 'unavailable', 'min'),
      ...sensor('sensor.end', 'unknown'),
    };
    const { container } = renderCar(entities, {
      ...mapping,
      timeToFullId: 'sensor.full',
      chargeEndTimeId: 'sensor.end',
    });
    expect(container).not.toHaveTextContent('Charged');
  });
});
