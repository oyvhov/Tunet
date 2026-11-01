import { useEffect, useState } from 'react';
import { en, getLoadedTranslations, loadTranslations, normalizeLanguage } from '../i18n';
import type { TranslationTable } from '../i18n';

/** The table for `language`, or English until that language has finished loading. */
export function useTranslationTable(language: unknown): TranslationTable {
  const selected = normalizeLanguage(language);
  const [, setLoadedCount] = useState(0);

  useEffect(() => {
    if (getLoadedTranslations(selected)) return undefined;
    let cancelled = false;
    loadTranslations(selected).then(
      () => {
        if (!cancelled) setLoadedCount((count) => count + 1);
      },
      (error: unknown) => console.error(`Failed to load the ${selected} translations:`, error)
    );
    return () => {
      cancelled = true;
    };
  }, [selected]);

  return getLoadedTranslations(selected) ?? en;
}
