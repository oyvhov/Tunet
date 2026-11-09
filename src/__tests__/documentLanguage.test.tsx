import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigProvider, useConfig } from '../contexts/ConfigContext';

type Config = ReturnType<typeof useConfig>;

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute('lang');
});

describe('document language', () => {
  it('follows the configured language', () => {
    localStorage.setItem('tunet_language', 'nn');
    let config: Config | undefined;
    const Probe = () => {
      config = useConfig();
      return null;
    };
    render(
      <ConfigProvider>
        <Probe />
      </ConfigProvider>
    );
    expect(document.documentElement.lang).toBe('nn');

    act(() => config?.setLanguage('de'));
    expect(document.documentElement.lang).toBe('de');
  });
});
