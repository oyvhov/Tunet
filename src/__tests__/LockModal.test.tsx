import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LockModal from '../modals/LockModal';

vi.mock('../services/haClient', () => ({
  getHistory: vi.fn(() =>
    Promise.resolve([
      { s: 'unlocked', lu: 1_700_000_000 },
      { s: 'locked', lu: 1_700_000_600 },
    ])
  ),
}));

const t = (key: string) =>
  ({
    'lock.state.locked': 'Locked',
    'lock.state.unlocked': 'Unlocked',
    'lock.action.lock': 'Lock',
    'lock.action.unlock': 'Unlock',
    'lock.action.confirmUnlock': 'Confirm unlock',
    'lock.code.prompt': 'Enter code',
    'history.log': 'Log',
    'common.close': 'Close',
  })[key] ?? key;

const conn = { sendMessagePromise: vi.fn() } as never;

describe('LockModal', () => {
  it('shows the lock state and asks for confirmation before unlocking', async () => {
    const callService = vi.fn();
    render(
      <LockModal
        entityId="lock.front_door"
        entity={{ state: 'locked', attributes: { friendly_name: 'Front door' } }}
        conn={conn}
        callService={callService}
        onClose={vi.fn()}
        t={t}
      />
    );
    expect(screen.getByRole('heading', { name: 'Front door' })).toBeInTheDocument();
    expect(screen.getAllByText('Locked').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm unlock' }));
    expect(callService).toHaveBeenCalledWith('lock', 'unlock', { entity_id: 'lock.front_door' });

    await waitFor(() => expect(screen.getByText('Unlocked')).toBeInTheDocument());
  });

  it('sends the code when the lock needs one', () => {
    const callService = vi.fn();
    render(
      <LockModal
        entityId="lock.front_door"
        entity={{ state: 'unlocked', attributes: { code_format: '^\\d{4}$' } }}
        conn={conn}
        callService={callService}
        onClose={vi.fn()}
        t={t}
      />
    );
    const lockButton = screen.getByRole('button', { name: 'Lock' });
    expect(lockButton).toBeDisabled();
    expect(screen.getByLabelText('Enter code')).toHaveAttribute('inputmode', 'numeric');
    fireEvent.change(screen.getByLabelText('Enter code'), { target: { value: '1234' } });
    fireEvent.click(lockButton);
    expect(callService).toHaveBeenCalledWith('lock', 'lock', {
      entity_id: 'lock.front_door',
      code: '1234',
    });
  });

  it('uses a text keyboard for codes that may contain letters', () => {
    render(
      <LockModal
        entityId="lock.front_door"
        entity={{ state: 'locked', attributes: { code_format: '.+' } }}
        conn={conn}
        callService={vi.fn()}
        onClose={vi.fn()}
        t={t}
      />
    );
    expect(screen.getByLabelText('Enter code')).toHaveAttribute('inputmode', 'text');
  });

  it('offers both lock and unlock when the lock is jammed', () => {
    render(
      <LockModal
        entityId="lock.front_door"
        entity={{ state: 'jammed', attributes: {} }}
        conn={conn}
        callService={vi.fn()}
        onClose={vi.fn()}
        t={t}
      />
    );
    expect(screen.getByRole('button', { name: 'Lock' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeEnabled();
  });
});
