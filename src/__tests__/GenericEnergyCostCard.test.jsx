import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GenericEnergyCostCard from '../components/cards/GenericEnergyCostCard';

vi.mock('../contexts', () => ({
  useHomeAssistantMeta: () => ({ haConfig: { currency: 'NOK' } }),
}));

const entities = {
  'sensor.cost_today': { entity_id: 'sensor.cost_today', state: '21.4', attributes: {} },
  'sensor.cost_month': { entity_id: 'sensor.cost_month', state: '400', attributes: {} },
};

const renderCard = (settings) =>
  render(
    <GenericEnergyCostCard
      cardId="cost_card"
      todayEntityId="sensor.cost_today"
      monthEntityId="sensor.cost_month"
      entities={entities}
      customNames={{}}
      customIcons={{}}
      settings={settings}
      t={(key) => key}
    />
  );

describe('GenericEnergyCostCard', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the month total next to today on the small card', () => {
    const { container } = renderCard({ size: 'small' });
    expect(screen.getByText('21 NOK')).toBeInTheDocument();
    expect(container.querySelector('[data-cost-month]')).toHaveTextContent('400 NOK');
  });

  it('projects the month total once enough of the month has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 0, 0));
    renderCard({});
    expect(screen.getByText('energyCost.projected')).toBeInTheDocument();
    expect(screen.getByText('~1240 NOK')).toBeInTheDocument();
  });

  it('skips the projection early in the month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 2, 0, 0));
    renderCard({});
    expect(screen.queryByText(/energyCost.projected/)).toBeNull();
  });
});
