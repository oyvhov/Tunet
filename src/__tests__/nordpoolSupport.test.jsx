import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ language: 'nb', showNextUp: false }));
vi.mock('../contexts', () => ({
  useConfig: () => config,
  useHomeAssistantMeta: () => ({ haConfig: { currency: 'kr' } }),
}));

vi.mock('../components/charts/SparkLine', () => ({
  default: ({ data }) => <div data-testid="spark">{JSON.stringify(data.map((d) => d.value))}</div>,
}));

vi.mock('../components/charts/InteractivePowerGraph', () => ({
  default: ({ priceStats }) => <div data-testid="graph">{JSON.stringify(priceStats)}</div>,
}));

vi.mock('../components/ui/AccessibleModalShell', () => ({
  default: ({ open, children }) => (open ? <div>{children('title')}</div> : null),
  useModalShell: () => null,
}));

import GenericNordpoolCard from '../components/cards/GenericNordpoolCard';
import NordpoolModal from '../modals/NordpoolModal';
import { applyNordpoolSupport, getNordpoolOrePerUnit } from '../services/nordpoolUtils';

const t = (key) => key;
const hours = (value) => Array.from({ length: 24 }, () => value);
const makeEntity = (today, attributes = {}, state = '1') => ({
  entity_id: 'sensor.np',
  state,
  attributes: { friendly_name: 'Price', today, ...attributes },
});
const card = (entity, settings = {}) =>
  render(
    <GenericNordpoolCard cardId="np" entity={entity} settings={settings} t={t} dragProps={{}} />
  );

describe('Nordic price support', () => {
  it('leaves prices at or below the threshold alone', () => {
    expect(applyNordpoolSupport(50, 1)).toBe(50);
    expect(applyNordpoolSupport(93.75, 1)).toBe(93.75);
    expect(applyNordpoolSupport(0.5, 100)).toBe(0.5);
  });

  it('pays 90 percent above the threshold in øre', () => {
    expect(applyNordpoolSupport(200, 1)).toBeCloseTo(104.375);
  });

  it('honours prices in kroner', () => {
    expect(applyNordpoolSupport(2, 100)).toBeCloseTo(1.04375);
  });

  it('leaves missing prices missing', () => {
    expect(applyNordpoolSupport(null, 1)).toBeNull();
  });

  it.each([
    ['øre/kWh', 1],
    ['Øre/kWh', 1],
    ['NOK/kWh', 100],
    ['kr/kWh', 100],
  ])('reads %s', (unit, factor) => {
    expect(getNordpoolOrePerUnit(makeEntity([], { unit_of_measurement: unit }))).toBe(factor);
  });

  it('keeps the øre default for a sensor without a unit', () => {
    expect(getNordpoolOrePerUnit(makeEntity([]))).toBe(1);
  });

  it('honours price_in_cents', () => {
    expect(
      getNordpoolOrePerUnit(makeEntity([], { unit_of_measurement: 'NOK', price_in_cents: true }))
    ).toBe(1);
  });
});

describe('GenericNordpoolCard', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 10, 8, 10, 0, 0) }));
  afterEach(() => vi.useRealTimers());

  it('shows the label and no level for an empty price list', () => {
    const { container } = card(makeEntity([]));
    expect(container).toHaveTextContent('status.unavailable');
    expect(container).toHaveTextContent('--');
    expect(container).not.toHaveTextContent('power.level');
  });

  it('shows unknown for a sensor that is unknown', () => {
    const { container } = card(makeEntity(hours(1), {}, 'unknown'));
    expect(container).toHaveTextContent('common.unknown');
    expect(container).not.toHaveTextContent('1.00');
  });

  it('shows a negative price', () => {
    const { container } = card(makeEntity(hours(-0.12)));
    expect(container).toHaveTextContent('-0.12');
  });

  it('shows no level on the small card either', () => {
    const { container } = card(makeEntity([]), { size: 'small' });
    expect(container).toHaveTextContent('status.unavailable');
    expect(container.querySelector('[aria-label="power.level.normal"]')).toBeNull();
  });

  it('applies support when the setting is on', () => {
    const { container } = card(makeEntity(hours(2), { unit_of_measurement: 'NOK/kWh' }), {
      showWithSupport: true,
    });
    expect(container).toHaveTextContent('1.04');
    expect(screen.getByTestId('spark').textContent).toContain('1.04375');
  });

  it('shows the raw price when the setting is off', () => {
    const { container } = card(makeEntity(hours(2), { unit_of_measurement: 'NOK/kWh' }));
    expect(container).toHaveTextContent('2.00');
  });

  describe('cheapest hours ahead', () => {
    const words = (key) => ({ 'power.cheapestWindow': 'Billigst kl. {start}–{end}' })[key] || key;
    // Cheapest at night, already gone at 10:00; the cheapest still to come is 14–16.
    const prices = hours(5).map((price, hour) =>
      hour === 3 || hour === 4 ? 0 : hour === 14 || hour === 15 ? 1 : price
    );
    const renderCard = (settings = {}) =>
      render(
        <GenericNordpoolCard
          cardId="np"
          entity={makeEntity(prices)}
          settings={settings}
          t={words}
          dragProps={{}}
        />
      );

    afterEach(() => {
      config.showNextUp = false;
    });

    it('stays quiet unless the what happens next line is on', () => {
      expect(renderCard().container).not.toHaveTextContent('Billigst');
    });

    it('names the cheapest two hours still to come', () => {
      config.showNextUp = true;
      expect(renderCard().container).toHaveTextContent('Billigst kl. 14:00–16:00');
    });

    it('leaves the small card alone', () => {
      config.showNextUp = true;
      expect(renderCard({ size: 'small' }).container).not.toHaveTextContent('Billigst');
    });
  });
});

describe('NordpoolModal', () => {
  const modalProps = (overrides = {}) => ({
    show: true,
    onClose: vi.fn(),
    entity: makeEntity([50, 200]),
    fullPriceData: [
      { start: 'a', end: 'b', value: 50 },
      { start: 'b', end: 'c', value: 200 },
    ],
    currentPriceIndex: 0,
    priceStats: { min: 50, max: 200, avg: 125 },
    name: 'Price',
    t,
    language: 'nn',
    saveCardSetting: vi.fn(),
    cardId: 'np',
    settingsKey: 'home::np',
    settings: {},
    ...overrides,
  });

  it('saves the toggle under the settings key the card reads', () => {
    const props = modalProps();
    render(<NordpoolModal {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'nordpool.withoutSupport' }));
    expect(props.saveCardSetting).toHaveBeenCalledWith('home::np', 'showWithSupport', true);
  });

  it('computes the stats from each supported hour', () => {
    render(<NordpoolModal {...modalProps({ settings: { showWithSupport: true } })} />);
    const stats = JSON.parse(screen.getByTestId('graph').textContent);
    expect(stats.avg).toBeCloseTo((50 + 104.375) / 2);
    expect(stats.max).toBeCloseTo(104.375);
    expect(stats.min).toBe(50);
  });

  it('keeps the original stats without support', () => {
    render(<NordpoolModal {...modalProps()} />);
    expect(JSON.parse(screen.getByTestId('graph').textContent).avg).toBe(125);
  });
});
