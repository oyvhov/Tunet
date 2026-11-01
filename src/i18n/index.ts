import en from './en.json';
import { DEFAULT_LANGUAGE, normalizeLanguage } from './languageUtils';
import type { Language } from './languageUtils';

export type TranslationTable = Record<string, string>;

export { en };

// Only English ships in the main bundle (it is also the fallback); the others load on demand.
// Every supported language must have a loader here.
export const TRANSLATION_LOADERS: Record<Language, () => Promise<TranslationTable>> = {
  en: () => Promise.resolve(en),
  nb: () => import('./nb.json').then((module) => module.default),
  nn: () => import('./nn.json').then((module) => module.default),
  sv: () => import('./sv.json').then((module) => module.default),
  de: () => import('./de.json').then((module) => module.default),
  zh: () => import('./zh.json').then((module) => module.default),
  fr: () => import('./fr.json').then((module) => module.default),
  es: () => import('./es.json').then((module) => module.default),
};

const loadedTables = new Map<Language, TranslationTable>([[DEFAULT_LANGUAGE, en]]);
const pendingLoads = new Map<Language, Promise<TranslationTable>>();

export function getLoadedTranslations(language: unknown): TranslationTable | undefined {
  return loadedTables.get(normalizeLanguage(language));
}

export function loadTranslations(language: unknown): Promise<TranslationTable> {
  const selected = normalizeLanguage(language);
  const loaded = loadedTables.get(selected);
  if (loaded) return Promise.resolve(loaded);
  let pending = pendingLoads.get(selected);
  if (!pending) {
    pending = TRANSLATION_LOADERS[selected]()
      .then((table) => {
        loadedTables.set(selected, table);
        return table;
      })
      .finally(() => pendingLoads.delete(selected));
    pendingLoads.set(selected, pending);
  }
  return pending;
}

export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  LEGACY_NN_MIGRATION_FLAG,
  normalizeLanguage,
  getLocaleForLanguage,
} from './languageUtils';
export type { Language } from './languageUtils';
