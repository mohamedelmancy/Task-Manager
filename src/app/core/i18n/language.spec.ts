import {
  LANGUAGE_STORAGE_KEY,
  parseLanguages,
  parseTranslations,
  readInitialLanguageId,
} from './language';

describe('parseLanguages', () => {
  it('reads a language list', () => {
    expect(parseLanguages([{ id: 'fr', label: 'Français', direction: 'ltr' }])).toEqual([
      { id: 'fr', label: 'Français', direction: 'ltr' },
    ]);
  });

  it('rejects a file that is not a list', () => {
    expect(() => parseLanguages({})).toThrow(/array/);
  });
});

describe('parseTranslations', () => {
  it('reads string values', () => {
    expect(parseTranslations({ 'app.title': 'Tasks' })).toEqual({ 'app.title': 'Tasks' });
  });

  it('rejects a value that is not a string', () => {
    expect(() => parseTranslations({ 'app.title': 1 })).toThrow(/string/);
  });
});

describe('readInitialLanguageId', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('uses the stored language', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ar');

    expect(readInitialLanguageId()).toBe('ar');
  });
});
