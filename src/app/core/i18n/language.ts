export interface Language {
  id: string;
  label: string;
  direction: 'ltr' | 'rtl';
}

export const LANGUAGE_STORAGE_KEY = 'task-manager.language';
export const DEFAULT_LANGUAGE_ID = 'en';

/** Uses the saved language, then the browser language, then English. */
export function readInitialLanguageId(): string {
  const storedLanguage = readStoredLanguage();
  if (storedLanguage) {
    return storedLanguage;
  }

  const browserLanguage = navigator.language.split('-')[0];
  return browserLanguage || DEFAULT_LANGUAGE_ID;
}

export function parseLanguages(value: unknown): Language[] {
  if (!Array.isArray(value)) {
    throw new Error('Language list must be an array');
  }

  const languages = value.filter(isLanguage);
  if (languages.length === 0) {
    throw new Error('Language list is empty');
  }

  return languages;
}

export function parseTranslations(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Translation file must be an object');
  }

  const dictionary: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') {
      throw new Error(`Translation "${key}" must be a string`);
    }
    dictionary[key] = entry;
  }

  return dictionary;
}

function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function isLanguage(value: unknown): value is Language {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const language = value as Record<string, unknown>;
  return (
    typeof language['id'] === 'string' &&
    language['id'].length > 0 &&
    typeof language['label'] === 'string' &&
    (language['direction'] === 'ltr' || language['direction'] === 'rtl')
  );
}
