import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SensorCard from '../components/cards/SensorCard';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({ haConfig: {} }),
}));

const script = { entity_id: 'script.natt', state: 'off', attributes: { friendly_name: 'Natt' } };

function setup(connected) {
  const callService = vi.fn(async () => ({}));
  render(
    <SensorCard
      entity={script}
      entities={{ 'script.natt': script }}
      conn={{}}
      connected={connected}
      callService={callService}
      settings={{ size: 'large' }}
      t={(key) => key}
    />
  );
  return { callService };
}

describe('SensorCard and the connection', () => {
  it('does not run an action while Home Assistant is disconnected', async () => {
    const { callService } = setup(false);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sensor\.script\.run/ }));
    });
    expect(callService).not.toHaveBeenCalled();
  });

  it('runs the action when connected', async () => {
    const { callService } = setup(true);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sensor\.script\.run/ }));
    });
    expect(callService).toHaveBeenCalledWith('script', 'turn_on', { entity_id: 'script.natt' });
  });
});
