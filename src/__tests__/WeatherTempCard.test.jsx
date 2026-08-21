import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WeatherTempCard from '../components/cards/WeatherTempCard';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({
    haConfig: { unit_system: { temperature: '°C' } },
  }),
}));

vi.mock('../components/charts/WeatherGraph', () => ({
  default: () => <div data-testid="weather-graph" />,
}));

vi.mock('../components/effects/WeatherEffects', () => ({
  default: () => null,
}));

describe('WeatherTempCard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const renderCard = (overrides = {}) =>
    render(
      <WeatherTempCard
        cardId="weather.home"
        dragProps={{}}
        getControls={() => null}
        cardStyle={{}}
        settingsKey="weather_home"
        cardSettings={{ weather_home: { weatherId: 'weather.home', subtitle: 'Rivenes' } }}
        entities={{
          'weather.home': {
            state: 'partlycloudy',
            attributes: { temperature: 12, temperature_unit: '°C' },
          },
        }}
        tempHistory={[]}
        tempHistoryById={{}}
        forecastsById={{}}
        outsideTempId={null}
        weatherEntityId="weather.home"
        editMode={false}
        isMobile={false}
        language="nn"
        onOpen={vi.fn()}
        t={(key) =>
          ({
            'weather.condition.partlyCloudy': 'Delvis skya',
            'weather.condition.rainy': 'Regn',
            'weather.condition.sunny': 'Sol',
            'weather.view.hourly': 'Timar',
            'weather.view.daily': 'Dagar',
            'weather.view.current': 'No',
            'weather.view.forecast': 'Prognose',
            'weather.view.swipeHint':
              'Sveip mot venstre eller høgre for å byte mellom vêret no og prognosen',
            'weather.name': 'Vêr',
            'weather.noForecast': 'Ingen vêrvarsel tilgjengeleg',
          })[key] || key
        }
        {...overrides}
      />
    );

  const swipeCard = (container, direction) => {
    const card = container.querySelector('[data-haptic]');
    const fromX = direction === 'left' ? 260 : 70;
    const toX = direction === 'left' ? 70 : 260;

    fireEvent.pointerDown(card, { pointerId: 1, button: 0, clientX: fromX, clientY: 80 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: toX, clientY: 82 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: toX, clientY: 82 });
    fireEvent.click(card);
    act(() => vi.advanceTimersByTime(160));
    act(() => vi.advanceTimersByTime(200));
  };

  it('aligns the large weather icon with other dashboard icons on mobile', () => {
    renderCard({ isMobile: true });

    expect(screen.getByAltText('Delvis skya').parentElement).toHaveClass(
      '-mt-1',
      '-ml-1',
      'h-12',
      'w-12'
    );
    expect(screen.getByText('Rivenes')).toHaveClass('line-clamp-2', 'text-left');
    expect(screen.getByText('Rivenes')).not.toHaveClass('truncate');
    expect(screen.getByText('Delvis skya')).toHaveClass('text-[10px]', 'leading-none');
  });

  it('keeps the original card by default and swipes to hourly and daily forecasts', () => {
    const onOpen = vi.fn();
    const { container } = renderCard({
      onOpen,
      forecastsById: {
        'weather.home': {
          hourly: [
            { datetime: '2026-08-21T13:00:00+02:00', temperature: 13, condition: 'sunny' },
            { datetime: '2026-08-21T15:00:00+02:00', temperature: 14, condition: 'rainy' },
          ],
          daily: [
            { datetime: '2026-08-22T12:00:00+02:00', temperature: 17, condition: 'sunny' },
            { datetime: '2026-08-23T12:00:00+02:00', temperature: 16, condition: 'rainy' },
          ],
        },
      },
    });

    expect(screen.getByTestId('weather-graph')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Timar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Prognose' })).not.toBeInTheDocument();

    swipeCard(container, 'left');

    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Timar' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('13°C')).toBeInTheDocument();
    expect(screen.queryByTestId('weather-graph')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dagar' }));

    expect(screen.getByRole('button', { name: 'Dagar' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('17°C')).toBeInTheDocument();
    expect(screen.queryByText('13°C')).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'No' })).not.toBeInTheDocument();
    swipeCard(container, 'right');

    expect(screen.getByTestId('weather-graph')).toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector('[data-haptic]'));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('supports forecast switching on the compact card', () => {
    const { container } = renderCard({
      cardSettings: { weather_home: { weatherId: 'weather.home', size: 'small' } },
      forecastsById: {
        'weather.home': {
          hourly: [
            { datetime: '2026-08-21T13:00:00+02:00', temperature: 13, condition: 'sunny' },
            { datetime: '2026-08-21T15:00:00+02:00', temperature: 14, condition: 'rainy' },
          ],
          daily: [{ datetime: '2026-08-22T12:00:00+02:00', temperature: 17, condition: 'sunny' }],
        },
      },
    });

    expect(screen.getByTestId('weather-graph')).toBeInTheDocument();
    swipeCard(container, 'left');
    expect(screen.queryByTestId('weather-graph')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Timar' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('13°C')).toBeInTheDocument();
  });

  it('adds comfortable horizontal padding to full-width mobile cards', () => {
    const { container } = renderCard({ isMobile: true, isFullWidthMobile: true });

    expect(container.querySelector('[data-testid="weather-swipe-content"]')).toHaveClass(
      'px-7',
      'py-5'
    );
  });

  it('keeps comfortable padding on compact full-width mobile cards', () => {
    const { container } = renderCard({
      isMobile: true,
      isFullWidthMobile: true,
      cardSettings: { weather_home: { weatherId: 'weather.home', size: 'small' } },
    });

    expect(container.querySelector('[data-testid="weather-swipe-content"]')).toHaveClass(
      'px-6',
      'py-3'
    );
  });
});
