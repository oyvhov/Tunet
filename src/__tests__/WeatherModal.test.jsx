import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({
    haConfig: {
      unit_system: {
        temperature: '°C',
        wind_speed: 'km/h',
        pressure: 'hPa',
        precipitation: 'mm',
      },
    },
  }),
}));

vi.mock('../components/charts/SensorHistoryGraph', () => ({
  default: () => <div data-testid="weather-history-graph" />,
}));

vi.mock('../components/ui/AccessibleModalShell', () => ({
  default: ({ open, children }) =>
    open ? (
      <div role="dialog" data-testid="weather-modal-shell">
        {children()}
      </div>
    ) : null,
}));

vi.mock('../icons', () => {
  const Icon = (props) => <svg aria-hidden="true" {...props} />;
  return {
    X: Icon,
    Cloud: Icon,
    CloudRain: Icon,
    Sun: Icon,
    Moon: Icon,
    CloudSun: Icon,
    Wind: Icon,
    Snowflake: Icon,
    Zap: Icon,
    AlertTriangle: Icon,
    getIconComponent: () => Icon,
  };
});

vi.mock('../services/haClient', () => ({
  getForecast: vi.fn(async () => [
    { datetime: '2026-04-27T12:00:00', temperature: 9.1, condition: 'sunny' },
    { datetime: '2026-04-27T13:00:00', temperature: 10.1, condition: 'sunny' },
  ]),
  getHistory: vi.fn(async () => []),
  getStatistics: vi.fn(async () => []),
}));

import WeatherModal from '../modals/WeatherModal';

const translations = {
  'common.close': 'Lukk',
  'weather.condition.sunny': 'Sol',
  'weather.detail.dewPoint': 'Duggpunkt',
  'weather.detail.gust': 'Vindkast',
  'weather.detail.humidity': 'Luftfuktigheit',
  'weather.detail.precip': 'Nedbør',
  'weather.detail.pressure': 'Trykk',
  'weather.detail.temperature': 'Temperatur',
  'weather.detail.wind': 'Vind',
  'weather.name': 'Vêr',
  'weather.noForecast': 'Ingen vêrvarsel',
};

const t = (key) => translations[key] || key;

const weatherEntity = {
  entity_id: 'weather.hjem',
  state: 'sunny',
  attributes: {
    friendly_name: 'Vermelding Hjem',
    temperature: 9.6,
    temperature_unit: '°C',
    humidity: 50,
    pressure: 1026.9,
    wind_speed: 3.2,
    wind_gust_speed: 13.3,
    dew_point: -2.2,
    precipitation: 0,
  },
};

describe('WeatherModal', () => {
  it('uses translated close label and 24-hour forecast labels for Nynorsk', async () => {
    render(
      <WeatherModal
        show
        onClose={vi.fn()}
        conn={{}}
        weatherEntity={weatherEntity}
        tempEntity={null}
        language="nn"
        t={t}
      />
    );

    expect(screen.getByRole('button', { name: 'Lukk' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('12:00').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/PM/)).not.toBeInTheDocument();
  });
});
