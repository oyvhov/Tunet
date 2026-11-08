import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConfigModal from '../modals/ConfigModal';
import { validateUrl } from '../config/onboarding';

const t = (key: string) => key;

function renderFirstRun(config: Record<string, unknown>) {
  return render(
    <ConfigModal
      open
      t={t}
      configTab="connection"
      setConfigTab={vi.fn()}
      config={{ url: '', token: 'token', authMethod: 'token', ...config }}
      setConfig={vi.fn()}
      themes={{}}
      onClose={vi.fn()}
      isOnboardingActive
      onboardingSteps={[
        { key: 'connection', label: 'Connection', icon: () => null },
        { key: 'preferences', label: 'Preferences', icon: () => null },
        { key: 'finish', label: 'Finish', icon: () => null },
      ]}
      onboardingStep={0}
      setOnboardingStep={vi.fn()}
      onboardingUrlError=""
      setOnboardingUrlError={vi.fn()}
      onboardingTokenError=""
      setOnboardingTokenError={vi.fn()}
      setConnectionTestResult={vi.fn()}
      testConnection={vi.fn()}
      validateUrl={validateUrl}
    />
  );
}

describe('first-run connection step', () => {
  it('explains why a URL without a scheme cannot be tested', () => {
    renderFirstRun({ url: 'homeassistant.local:8123/' });

    expect(screen.getByText('onboarding.invalidUrl')).toBeInTheDocument();
  });

  it('stays quiet before anything is typed', () => {
    renderFirstRun({ url: '' });

    expect(screen.queryByText('onboarding.invalidUrl')).not.toBeInTheDocument();
  });

  it('accepts a complete URL', () => {
    renderFirstRun({ url: 'https://homeassistant.local:8123' });

    expect(screen.queryByText('onboarding.invalidUrl')).not.toBeInTheDocument();
    expect(screen.queryByText('onboarding.urlTrailingSlash')).not.toBeInTheDocument();
  });

  it('warns about a trailing slash before the connection test fails on it', () => {
    renderFirstRun({ url: 'https://homeassistant.local:8123/' });

    expect(screen.getByText('onboarding.urlTrailingSlash')).toBeInTheDocument();
  });

  it('translates the add-on mode explanation', () => {
    renderFirstRun({ isIngress: true, url: 'https://ingress.local' });

    expect(screen.getByText('onboarding.addonModeTitle')).toBeInTheDocument();
    expect(screen.queryByText(/Long-Lived Access Token/)).not.toBeInTheDocument();
  });
});
