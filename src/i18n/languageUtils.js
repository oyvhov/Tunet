export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'nb', 'nn', 'sv', 'de', 'zh'];
export const LEGACY_NN_MIGRATION_FLAG = 'tunet_language_migrated_to_nb';

export function normalizeLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
}

export function getLocaleForLanguage(language) {
  if (language === 'nb') return 'nb-NO';
  if (language === 'nn') return 'nn-NO';
  if (language === 'sv') return 'sv-SE';
  if (language === 'de') return 'de-DE';
  if (language === 'zh') return 'zh-CN';
  return 'en-US';
}
