const localeLoaders = import.meta.glob('./*.json');

export async function loadTranslations(language) {
  const loadLocale = localeLoaders[`./${language}.json`];
  if (!loadLocale) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const localeModule = await loadLocale();
  return localeModule.default;
}
