import en from './en.json';
import nb from './nb.json';
import nn from './nn.json';
import sv from './sv.json';
import de from './de.json';
import zh from './zh.json';
import fr from './fr.json';
import es from './es.json';

export { en, nb, nn, sv, de, zh, fr, es };

/**
 * Every supported language must have a translation table here.
 * @type {Record<import('./languageUtils').Language, Record<string, string>>}
 */
export const TRANSLATIONS = { en, nb, nn, sv, de, zh, fr, es };
export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  LEGACY_NN_MIGRATION_FLAG,
  normalizeLanguage,
  getLocaleForLanguage,
} from './languageUtils';
