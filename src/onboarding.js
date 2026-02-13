import { Wifi, Settings, Check } from 'lucide-react';

export const buildOnboardingSteps = (t) => [
  { key: 'connection', label: t('onboarding.step.connection'), icon: Wifi },
  { key: 'preferences', label: t('onboarding.step.preferences'), icon: Settings },
  { key: 'finish', label: t('onboarding.step.finish'), icon: Check }
];

export const validateUrl = (url) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};
