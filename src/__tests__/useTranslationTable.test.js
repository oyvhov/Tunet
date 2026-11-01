import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTranslationTable } from '../hooks/useTranslationTable';
import en from '../i18n/en.json';
import sv from '../i18n/sv.json';
import de from '../i18n/de.json';

describe('useTranslationTable', () => {
  it('falls back to English until the chosen language has loaded', async () => {
    const { result, rerender } = renderHook(({ language }) => useTranslationTable(language), {
      initialProps: { language: 'sv' },
    });
    expect(result.current).toBe(en);
    await waitFor(() => expect(result.current).toEqual(sv));

    rerender({ language: 'de' });
    await waitFor(() => expect(result.current).toEqual(de));

    rerender({ language: 'sv' });
    expect(result.current).toEqual(sv);
  });
});
