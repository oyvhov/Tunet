import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GeneralSettingsTab from '../modals/GeneralSettingsTab';

const config = vi.hoisted(() => ({
  unitsMode: 'follow_ha',
  setUnitsMode: vi.fn(),
  settingsLockEnabled: false,
  settingsLockSessionUnlocked: false,
  enableSettingsLock: vi.fn(),
  disableSettingsLock: vi.fn(),
  unlockSettingsLock: vi.fn(),
  lockSettingsSession: vi.fn(),
}));

vi.mock('../contexts', () => ({ useConfig: () => config }));

vi.mock('../components/ui/PinLockModal', () => ({
  default: ({ open, title }: { open: boolean; title: string }) =>
    open ? <div data-testid="pin-dialog">{title}</div> : null,
}));

const makeProps = (overrides = {}) => ({
  t: (key: string) => key,
  language: 'nn',
  setLanguage: vi.fn(),
  inactivityTimeout: 0,
  setInactivityTimeout: vi.fn(),
  ...overrides,
});

const openLockSection = () => {
  fireEvent.click(screen.getByRole('button', { name: /settings\.lock\.title/ }));
};

const typePins = (pin: string, confirmation: string) => {
  fireEvent.change(screen.getByPlaceholderText('settings.lock.pin'), { target: { value: pin } });
  fireEvent.change(screen.getByPlaceholderText('settings.lock.pinConfirm'), {
    target: { value: confirmation },
  });
};

describe('GeneralSettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    config.settingsLockEnabled = false;
    config.settingsLockSessionUnlocked = false;
    localStorage.removeItem('tunet_inactivity_timeout');
  });

  it.each(['settings.language', 'settings.unitSystem', 'settings.lock.title', 'settings.behavior'])(
    'shows %s',
    (label) => {
      render(<GeneralSettingsTab {...makeProps()} />);

      expect(screen.getAllByText(new RegExp(label.replace(/\./g, '\\.'))).length).toBeGreaterThan(
        0
      );
    }
  );

  it('does not draw a box inside a box', () => {
    const { container } = render(<GeneralSettingsTab {...makeProps()} />);

    expect(container.querySelector('.popup-surface .popup-surface')).toBeNull();
  });

  it('turns on the return-home timer and remembers it', () => {
    const props = makeProps();
    render(<GeneralSettingsTab {...props} />);

    fireEvent.click(screen.getByRole('switch', { name: 'settings.inactivity' }));

    expect(props.setInactivityTimeout).toHaveBeenCalledWith(60);
    expect(localStorage.getItem('tunet_inactivity_timeout')).toBe('60');
  });

  it('refuses two different PINs', () => {
    render(<GeneralSettingsTab {...makeProps()} />);
    openLockSection();

    typePins('1234', '4321');
    fireEvent.click(screen.getByRole('button', { name: 'settings.lock.enable' }));

    expect(screen.getByText('settings.lock.pinMismatch')).toBeInTheDocument();
    expect(config.enableSettingsLock).not.toHaveBeenCalled();
  });

  it('enables the lock with two matching PINs', () => {
    render(<GeneralSettingsTab {...makeProps()} />);
    openLockSection();

    typePins('1234', '1234');
    fireEvent.click(screen.getByRole('button', { name: 'settings.lock.enable' }));

    expect(config.enableSettingsLock).toHaveBeenCalledWith('1234');
  });

  it('asks for the PIN before disabling the lock', () => {
    config.settingsLockEnabled = true;
    config.settingsLockSessionUnlocked = true;
    render(<GeneralSettingsTab {...makeProps()} />);
    openLockSection();

    fireEvent.click(screen.getByRole('button', { name: 'settings.lock.disable' }));

    expect(screen.getByTestId('pin-dialog')).toHaveTextContent('settings.lock.enterPinToDisable');
    expect(config.disableSettingsLock).not.toHaveBeenCalled();
  });
});
