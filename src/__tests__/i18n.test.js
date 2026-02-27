import { describe, it, expect } from 'vitest';
import { en, nb, nn, sv, de } from '../i18n';

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
  it('exports English, Bokmal, Nynorsk and Swedish translation objects', () => {
    expect(en).toBeDefined();
    expect(nb).toBeDefined();
    expect(nn).toBeDefined();
    expect(sv).toBeDefined();
    expect(de).toBeDefined();
    expect(typeof en).toBe('object');
    expect(typeof nb).toBe('object');
    expect(typeof nn).toBe('object');
    expect(typeof sv).toBe('object');
    expect(typeof de).toBe('object');
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

    const locales = { en, nb, nn, sv, de };
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
  });

  it('no empty translation values', () => {
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
  });
});
