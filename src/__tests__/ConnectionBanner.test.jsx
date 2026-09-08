import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConnectionBanner from '../layouts/ConnectionBanner';

const mocks = vi.hoisted(() => ({
  homeAssistant: {
    haUnavailableVisible: true,
    oauthExpired: false,
    disconnectedSince: Date.now() - 10_000,
  },
  setShowConfigModal: vi.fn(),
}));

vi.mock('../contexts', () => ({
  useHomeAssistant: () => mocks.homeAssistant,
  useModalActions: () => ({ setShowConfigModal: mocks.setShowConfigModal }),
}));

const t = (key) =>
  ({
    'ha.reconnecting': 'Connecting…',
    'ha.unavailable': 'Home Assistant is currently unavailable. Data may be outdated.',
    'ha.disconnectedFor': 'Disconnected for {time}',
    'ha.retry': 'Retry connection',
    'system.oauth.expired': 'Your connection has expired.',
    'system.oauth.loginButton': 'Log in again',
  })[key] || key;

describe('ConnectionBanner mobile presentation', () => {
  beforeEach(() => {
    mocks.homeAssistant.haUnavailableVisible = true;
    mocks.homeAssistant.oauthExpired = false;
    mocks.homeAssistant.disconnectedSince = Date.now() - 10_000;
  });

  it('shows only a short reconnecting label on mobile', () => {
    render(<ConnectionBanner t={t} setConfigTab={vi.fn()} />);

    expect(screen.getByText('Connecting…')).toHaveClass('sm:hidden');
    expect(
      screen.getByText('Home Assistant is currently unavailable. Data may be outdated.')
    ).toHaveClass('hidden', 'sm:inline');
    expect(screen.getByText(/Disconnected for/)).toHaveClass('hidden', 'sm:inline');
    expect(screen.getByRole('status')).toHaveClass(
      'w-fit',
      'rounded-full',
      'border-[var(--glass-border)]',
      'bg-[var(--glass-bg)]',
      'opacity-80'
    );
  });

  it('keeps the actionable authentication message visible', () => {
    mocks.homeAssistant.oauthExpired = true;
    render(<ConnectionBanner t={t} setConfigTab={vi.fn()} />);

    expect(screen.getByText('Your connection has expired.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Log in again' })).toBeVisible();
    expect(screen.queryByText('Connecting…')).not.toBeInTheDocument();
  });
});
