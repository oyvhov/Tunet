import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GenericAndroidTVModal from '../modals/GenericAndroidTVModal';

vi.mock('../components/ui/AccessibleModalShell', () => ({
  useModalShell: () => null,
  default: ({ open, children, size }) =>
    open ? (
      <div data-testid="tv-modal-shell" data-size={size}>
        {children()}
      </div>
    ) : null,
}));

const props = {
  show: true,
  onClose: vi.fn(),
  entities: {
    'media_player.living_room_tv': {
      entity_id: 'media_player.living_room_tv',
      state: 'playing',
      attributes: { friendly_name: 'Living room TV' },
    },
  },
  mediaPlayerId: 'media_player.living_room_tv',
  remoteId: 'remote.living_room_tv',
  linkedMediaPlayers: [],
  callService: vi.fn(),
  getA: vi.fn((_entityId, _attribute, fallback) => fallback),
  getEntityImageUrl: vi.fn(() => null),
  customNames: {},
  t: (key) =>
    ({
      'common.close': 'Close',
      'status.statusLabel': 'Status',
      'media.homeScreen': 'Home screen',
      'media.noneMedia': 'No media',
      'shield.back': 'Back',
      'shield.home': 'Home',
      'shield.turnOff': 'Turn off',
      'shield.turnOn': 'Turn on',
      'state.playing': 'Playing',
      'remote.up': 'Up',
      'remote.select': 'Select',
    })[key] || key,
};

describe('GenericAndroidTVModal mobile layout', () => {
  it('uses the shared two-column popup and keeps compact remote sizing', () => {
    render(<GenericAndroidTVModal {...props} />);

    expect(screen.getByTestId('tv-modal-shell').dataset.size).toBe('l');
    expect(screen.getByRole('heading', { name: 'Living room TV' })).toBeInTheDocument();
    expect(screen.getByText('Playing')).toBeInTheDocument();
    expect(screen.queryByText(/Status:/)).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Up' })).toHaveClass(
      'h-11',
      'w-11',
      'sm:h-14',
      'sm:w-14'
    );
    expect(screen.getByRole('button', { name: 'Select' })).toHaveClass(
      'h-10',
      'w-10',
      'sm:h-12',
      'sm:w-12'
    );
  });
});
