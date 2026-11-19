import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { en, TranslationKey } from './locales/en';
import tr from './locales/tr';
import fr from './locales/fr';
import ar from './locales/ar';
import {
  formatMessage,
  getLocale,
  getTextDirection,
  isRtlLanguage,
  setLocale,
  translate,
} from './index';

describe('i18n Engine & Locale Dictionaries', () => {
  it('maintains 100% key parity and non-empty strings across en, tr, fr, and ar', () => {
    const enKeys = Object.keys(en) as TranslationKey[];
    const dicts = { tr, fr, ar };

    for (const [locale, dict] of Object.entries(dicts)) {
      const dictKeys = Object.keys(dict);
      assert.equal(
        dictKeys.length,
        enKeys.length,
        `Locale "${locale}" key count mismatch (${dictKeys.length} vs ${enKeys.length})`
      );

      for (const key of enKeys) {
        assert.ok(
          typeof dict[key] === 'string' && dict[key].trim().length > 0,
          `Missing or empty translation for "${locale}.${key}"`
        );

        // Ensure interpolation tokens match English placeholders
        const expectedVars = [...en[key].matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]);
        for (const v of expectedVars) {
          assert.ok(
            dict[key].includes(`{${v}}`),
            `Missing placeholder "{${v}}" in "${locale}.${key}": "${dict[key]}"`
          );
        }
      }
    }
  });

  it('interpolates template variables cleanly and preserves unmatched tokens', () => {
    assert.equal(formatMessage('Good morning, {name}', { name: 'Amina' }), 'Good morning, Amina');
    assert.equal(formatMessage('{home} of {total}', { home: 2, total: 3 }), '2 of 3');
    assert.equal(formatMessage('Hello {missing}', {}), 'Hello {missing}');
  });

  it('detects RTL exclusively for Arabic', () => {
    assert.equal(isRtlLanguage('ar'), true);
    assert.equal(getTextDirection('ar'), 'rtl');
    assert.equal(isRtlLanguage('en'), false);
    assert.equal(isRtlLanguage('tr'), false);
    assert.equal(isRtlLanguage('fr'), false);
    assert.equal(getTextDirection('fr'), 'ltr');
  });

  it('switches locales asynchronously and translates keys across all 4 languages', async () => {
    await setLocale('tr');
    assert.equal(getLocale(), 'tr');
    assert.equal(translate('nav.chores'), 'İşler');

    await setLocale('fr');
    assert.equal(getLocale(), 'fr');
    assert.equal(translate('nav.money'), 'Dépenses');

    await setLocale('ar');
    assert.equal(getLocale(), 'ar');
    assert.equal(translate('home.imHome'), 'أنا في البيت');

    await setLocale('en');
    assert.equal(getLocale(), 'en');
    assert.equal(translate('home.imHome'), "I'm Home");
  });
});
