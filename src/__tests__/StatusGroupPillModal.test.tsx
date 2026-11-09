import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StatusGroupPillModal from '../modals/StatusGroupPillModal';

const labels: Record<string, string> = {
  'binary.door.open': 'Open',
  'common.on': 'ON',
};
const t = (key: string) => labels[key] || key;

describe('StatusGroupPillModal rows', () => {
  it('shows a door sensor as open rather than on', () => {
    render(
      <StatusGroupPillModal
        show
        onClose={vi.fn()}
        modalState={{ pill: { groupPreset: 'openings_open' }, presetId: 'openings_open' }}
        entities={{
          'binary_sensor.front_door': {
            state: 'on',
            attributes: { friendly_name: 'Front door', device_class: 'door' },
          },
        }}
        t={t}
      />
    );

    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.queryByText('ON')).not.toBeInTheDocument();
  });

  it('gives the per-row action a 44 px tap target', () => {
    render(
      <StatusGroupPillModal
        show
        onClose={vi.fn()}
        modalState={{ pill: { groupPreset: 'lights_on' }, presetId: 'lights_on' }}
        entities={{
          'light.kitchen': { state: 'on', attributes: { friendly_name: 'Kitchen' } },
        }}
        callService={vi.fn()}
        t={t}
      />
    );

    const row = screen.getByText('Kitchen').closest('.popup-surface') as HTMLElement;
    expect(within(row).getByRole('button')).toHaveClass('min-h-11');
  });
});
