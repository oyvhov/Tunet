type TranslationDictionary = Record<string, string>;

const localeLoaders = import.meta.glob<{ default: TranslationDictionary }>([
  './*.json',
  '!./en.json',
]);

export async function loadTranslations(language: string): Promise<TranslationDictionary> {
  const loadLocale = localeLoaders[`./${language}.json`];
  if (!loadLocale) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const localeModule = await loadLocale();
  return localeModule.default;
}
