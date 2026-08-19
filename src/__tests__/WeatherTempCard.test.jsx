import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  it('aligns the large weather icon with other dashboard icons on mobile', () => {
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
        isMobile
        onOpen={vi.fn()}
        t={(key) =>
          key === 'weather.condition.partlyCloudy' ? 'Partly cloudy' : key
        }
      />
    );

    expect(screen.getByAltText('Partly cloudy').parentElement).toHaveClass(
      '-mt-1',
      '-ml-1',
      'h-12',
      'w-12'
    );
    expect(screen.getByText('Rivenes')).toHaveClass('line-clamp-2', 'text-left');
    expect(screen.getByText('Rivenes')).not.toHaveClass('truncate');
    expect(screen.getByText('Partly cloudy')).toHaveClass('text-[10px]', 'leading-none');
  });
});
