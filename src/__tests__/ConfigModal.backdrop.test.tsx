import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConfigModal from '../modals/ConfigModal';
import { validateUrl } from '../config/onboarding';

const t = (key: string) => key;

describe('system settings backdrop', () => {
  it('dims and blurs the page like the other popups while the panel stays still', () => {
    render(
      <ConfigModal
        open
        t={t}
        configTab="connection"
        setConfigTab={vi.fn()}
        config={{ url: 'https://homeassistant.local:8123', token: 'token', authMethod: 'token' }}
        setConfig={vi.fn()}
        themes={{}}
        onClose={vi.fn()}
        isOnboardingActive={false}
        validateUrl={validateUrl}
      />
    );

    const panel = screen.getByRole('dialog');
    const overlay = panel.parentElement as HTMLElement;
    expect(panel).toHaveClass('modal-panel--still');
    expect(overlay.getAttribute('style')).toContain('background-color: var(--modal-scrim)');
    expect(overlay.getAttribute('style')).toContain('blur(var(--modal-blur))');
  });
});
