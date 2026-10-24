export const SUPPORTED_LANGUAGES = ['en', 'nb', 'nn', 'sv', 'de', 'zh', 'fr', 'es'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'en';
export const LEGACY_NN_MIGRATION_FLAG = 'tunet_language_migrated_to_nb';

export function normalizeLanguage(language: unknown): Language {
  return (SUPPORTED_LANGUAGES as readonly unknown[]).includes(language)
    ? (language as Language)
    : DEFAULT_LANGUAGE;
}

export function getLocaleForLanguage(language: unknown): string {
  if (language === 'nb') return 'nb-NO';
  if (language === 'nn') {
    const supportsNynorsk =
      typeof Intl !== 'undefined' &&
      typeof Intl.DateTimeFormat?.supportedLocalesOf === 'function' &&
      Intl.DateTimeFormat.supportedLocalesOf('nn-NO').length > 0;
    return supportsNynorsk ? 'nn-NO' : 'nb-NO';
  }
  if (language === 'sv') return 'sv-SE';
  if (language === 'de') return 'de-DE';
  if (language === 'zh') return 'zh-CN';
  if (language === 'fr') return 'fr-FR';
  if (language === 'es') return 'es-ES';
  return 'en-US';
}
