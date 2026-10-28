import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';

import {
  DEFAULT_LANGUAGE_ID,
  LANGUAGE_STORAGE_KEY,
  Language,
  parseLanguages,
  parseTranslations,
  readInitialLanguageId,
} from './language';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly title = inject(Title);
  private readonly selectedLanguageId = signal(readInitialLanguageId());
  private readonly dictionary = signal<Readonly<Record<string, string>>>({});

  private readonly languagesResource = httpResource<Language[]>(() => '/i18n/languages.json', {
    defaultValue: [],
    parse: parseLanguages,
  });

  private readonly dictionaryResource = httpResource<Record<string, string>>(
    () => this.dictionaryUrl(),
    {
      defaultValue: {},
      parse: parseTranslations,
    },
  );

  readonly languageId = this.selectedLanguageId.asReadonly();

  readonly languages = computed(() => this.knownLanguages());

  readonly currentLanguage = computed(() =>
    this.languages().find((language) => language.id === this.selectedLanguageId()),
  );

  readonly loadError = computed(
    () => this.languagesResource.error() ?? this.dictionaryResource.error(),
  );

  constructor() {
    effect(() => this.rememberResolvedDictionary());
    effect(() => this.applyDocumentLanguage());
    effect(() => this.useFirstLanguageWhenCurrentIsMissing());
  }

  t(key: string): string {
    return this.dictionary()[key] ?? key;
  }

  use(languageId: string): void {
    this.selectedLanguageId.set(languageId);
  }

  reload(): void {
    this.languagesResource.reload();
    this.dictionaryResource.reload();
  }

  private knownLanguages(): Language[] {
    if (this.languagesResource.status() === 'error') {
      return [];
    }

    return this.languagesResource.value();
  }

  private dictionaryUrl(): string | undefined {
    const languageId = this.selectedLanguageId();
    const languages = this.knownLanguages();
    const languageIsKnown = languages.some((language) => language.id === languageId);

    if (languages.length > 0 && !languageIsKnown) {
      return undefined;
    }

    return `/i18n/${languageId}.json`;
  }

  private rememberResolvedDictionary(): void {
    const status = this.dictionaryResource.status();
    if (status !== 'resolved' && status !== 'local') {
      return;
    }

    this.dictionary.set(this.dictionaryResource.value());
  }

  private applyDocumentLanguage(): void {
    const language = this.currentLanguage();
    document.documentElement.lang = language?.id ?? this.selectedLanguageId();
    document.documentElement.dir = language?.direction ?? 'ltr';
    localStorage.setItem(LANGUAGE_STORAGE_KEY, this.selectedLanguageId());

    const title = this.dictionary()['app.title'];
    if (title) {
      this.title.setTitle(title);
    }
  }

  private useFirstLanguageWhenCurrentIsMissing(): void {
    const languages = this.languages();
    if (languages.length === 0) {
      return;
    }

    const languageIsKnown = languages.some((language) => language.id === this.selectedLanguageId());
    if (languageIsKnown) {
      return;
    }

    this.selectedLanguageId.set(languages[0]?.id ?? DEFAULT_LANGUAGE_ID);
  }
}
