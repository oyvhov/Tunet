import { describe, it, expect } from 'vitest';
import {
  en,
  getLoadedTranslations,
  loadTranslations,
  SUPPORTED_LANGUAGES,
  TRANSLATION_LOADERS,
} from '../i18n';
import nb from '../i18n/nb.json';
import nn from '../i18n/nn.json';
import sv from '../i18n/sv.json';
import de from '../i18n/de.json';
import zh from '../i18n/zh.json';
import fr from '../i18n/fr.json';
import es from '../i18n/es.json';

const getPlaceholders = (value) => {
  const matches = String(value).match(/\{[^}]+\}/g) || [];
  return [...new Set(matches)].sort();
};

const expectParityWithEnglish = (targetTranslations, languageCode) => {
  const enKeys = Object.keys(en).sort();
  const targetKeys = Object.keys(targetTranslations).sort();
  const missingInTarget = enKeys.filter((key) => !targetKeys.includes(key));
  const extraInTarget = targetKeys.filter((key) => !enKeys.includes(key));

  expect(
    missingInTarget,
    `Keys in en.json missing from ${languageCode}.json: ${missingInTarget.join(', ')}`
  ).toHaveLength(0);
  expect(
    extraInTarget,
    `Keys in ${languageCode}.json missing from en.json: ${extraInTarget.join(', ')}`
  ).toHaveLength(0);

  enKeys.forEach((key) => {
    const enPlaceholders = getPlaceholders(en[key]);
    const targetPlaceholders = getPlaceholders(targetTranslations[key]);
    expect(
      targetPlaceholders,
      `${languageCode}.json key "${key}" has placeholder mismatch. Expected: ${enPlaceholders.join(', ') || '(none)'}; Actual: ${targetPlaceholders.join(', ') || '(none)'}`
    ).toEqual(enPlaceholders);
  });
};

describe('i18n', () => {
  it('exports supported translation objects including French and Chinese', () => {
    expect(en).toBeDefined();
    expect(nb).toBeDefined();
    expect(nn).toBeDefined();
    expect(sv).toBeDefined();
    expect(de).toBeDefined();
    expect(zh).toBeDefined();
    expect(fr).toBeDefined();
    expect(es).toBeDefined();
    expect(typeof en).toBe('object');
    expect(typeof nb).toBe('object');
    expect(typeof nn).toBe('object');
    expect(typeof sv).toBe('object');
    expect(typeof de).toBe('object');
    expect(typeof zh).toBe('object');
    expect(typeof fr).toBe('object');
    expect(typeof es).toBe('object');
  });

  it('fan keys exist across all supported locales including German', () => {
    const fanKeys = [
      'addCard.available.fans',
      'addCard.item.fans',
      'addCard.type.fan',
      'fan.direction',
      'fan.direction.forward',
      'fan.direction.reverse',
      'fan.directionNotAvailable',
      'fan.oscillate',
      'fan.preset',
      'fan.presetNotAvailable',
      'fan.speed',
      'fan.disableAnimation',
      'fan.disableAnimationHint',
      'fan.turnOff',
      'fan.turnOn',
    ];

    const locales = { en, nb, nn, sv, de, fr, es, zh };
    Object.entries(locales).forEach(([code, locale]) => {
      fanKeys.forEach((key) => {
        expect(locale[key], `${code}.json is missing fan key "${key}"`).toBeDefined();
      });
    });
  });

  it('en is source-of-truth for key and placeholder parity', () => {
    expectParityWithEnglish(nb, 'nb');
    expectParityWithEnglish(nn, 'nn');
    expectParityWithEnglish(sv, 'sv');
    expectParityWithEnglish(de, 'de');
    expectParityWithEnglish(fr, 'fr');
    expectParityWithEnglish(es, 'es');
    expectParityWithEnglish(zh, 'zh');
  });

  it('no empty translation values', () => {
    for (const [key, value] of Object.entries(zh)) {
      expect(value, `zh.json key ${key} is empty`).not.toBe('');
    }
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.json key "${key}" is empty`).not.toBe('');
    }
    for (const [key, value] of Object.entries(nb)) {
      expect(value, `nb.json key "${key}" is empty`).not.toBe('');
    }
    for (const [key, value] of Object.entries(nn)) {
      expect(value, `nn.json key "${key}" is empty`).not.toBe('');
    }
    for (const [key, value] of Object.entries(sv)) {
      expect(value, `sv.json key "${key}" is empty`).not.toBe('');
    }
    for (const [key, value] of Object.entries(de)) {
      expect(value, `de.json key "${key}" is empty`).not.toBe('');
    }
    for (const [key, value] of Object.entries(fr)) {
      expect(value, `fr.json key "${key}" is empty`).not.toBe('');
    }
    for (const [key, value] of Object.entries(es)) {
      expect(value, `es.json key "${key}" is empty`).not.toBe('');
    }
  });

  it('registers a translation loader for every supported language', () => {
    expect(Object.keys(TRANSLATION_LOADERS).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it('keeps only English loaded until another language is requested', async () => {
    expect(getLoadedTranslations('en')).toBe(en);
    expect(getLoadedTranslations('nn')).toBeUndefined();
    const [first, second] = await Promise.all([loadTranslations('nn'), loadTranslations('nn')]);
    expect(first).toBe(second);
    expect(first).toEqual(nn);
    expect(getLoadedTranslations('nn')).toBe(first);
    expect(await loadTranslations('klingon')).toBe(en);
  });
});
