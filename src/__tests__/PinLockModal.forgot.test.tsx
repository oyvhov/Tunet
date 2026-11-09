import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PinLockModal from '../components/ui/PinLockModal';
import SettingsPinLockModal from '../components/ui/SettingsPinLockModal';

const disableSettingsLock = vi.fn();
vi.mock('../contexts', () => ({
  useConfig: () => ({ disableSettingsLock }),
}));

const t = (key: string) => key;
const forgotLink = () => screen.queryByRole('button', { name: 'settings.lock.forgot' });

describe('PIN lock way out', () => {
  it('keeps the reset out of view until a wrong PIN has been entered', () => {
    render(<PinLockModal open onClose={vi.fn()} onSubmit={vi.fn()} onForgot={vi.fn()} t={t} />);

    expect(forgotLink()).not.toBeInTheDocument();
  });

  it('offers no reset where the caller does not allow one', () => {
    render(<PinLockModal open onClose={vi.fn()} onSubmit={vi.fn()} error="Wrong" t={t} />);

    expect(forgotLink()).not.toBeInTheDocument();
  });

  it('asks before resetting, and only resets on confirmation', () => {
    const onForgot = vi.fn();
    const onClose = vi.fn();
    render(
      <PinLockModal
        open
        onClose={onClose}
        onSubmit={vi.fn()}
        onForgot={onForgot}
        error="Wrong"
        t={t}
      />
    );

    fireEvent.click(forgotLink() as HTMLElement);

    expect(screen.getByText('settings.lock.forgotConfirm')).toBeInTheDocument();
    expect(onForgot).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'settings.lock.resetLock' }));

    expect(onForgot).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('goes back to the keypad when the reset is declined', () => {
    const onForgot = vi.fn();
    render(
      <PinLockModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        onForgot={onForgot}
        error="Wrong"
        t={t}
      />
    );

    fireEvent.click(forgotLink() as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));

    expect(onForgot).not.toHaveBeenCalled();
    expect(screen.queryByText('settings.lock.forgotConfirm')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
  });

  it('removes the settings lock from the dashboard prompt', () => {
    disableSettingsLock.mockClear();
    render(<SettingsPinLockModal open onClose={vi.fn()} onSubmit={vi.fn()} error="Wrong" t={t} />);

    fireEvent.click(forgotLink() as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'settings.lock.resetLock' }));

    expect(disableSettingsLock).toHaveBeenCalledTimes(1);
  });
});
