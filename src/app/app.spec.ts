import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import axe from 'axe-core';

import { routes } from './app.routes';

import { clearGetCache } from './core/http/cache-get.interceptor';
import { cacheGetInterceptor } from './core/http/cache-get.interceptor';
import { App } from './app';

const languages = [
  { id: 'en', label: 'English', direction: 'ltr' },
  { id: 'ar', label: 'العربية', direction: 'rtl' },
  { id: 'fr', label: 'Français', direction: 'ltr' },
];

const english = {
  'app.title': 'Task Manager',
  'a11y.skip': 'Skip to content',
  'a11y.sidebar': 'Sidebar',
  'language.label': 'Language',
  'language.error': 'Translations could not be loaded.',
  'language.retry': 'Try again',
};

const arabic = {
  'app.title': 'مدير المهام',
  'language.label': 'اللغة',
};

const french = {
  'app.title': 'Gestionnaire de tâches',
  'language.label': 'Langue',
};

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    clearGetCache();
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([cacheGetInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    clearGetCache();
  });

  it('has no accessibility violations', async () => {
    fixture.detectChanges();
    flushLanguages();
    flushDictionary('en', english);
    await settle();

    const results = await axe.run(fixture.nativeElement);
    const violations = results.violations.map((violation) => violation.id);

    expect(violations).toEqual([]);
  });

  it('shows the English title', async () => {
    fixture.detectChanges();
    flushLanguages();
    flushDictionary('en', english);
    await settle();

    expect(text()).toContain('Task Manager');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches to Arabic and back without requesting English again', async () => {
    fixture.detectChanges();
    flushLanguages();
    flushDictionary('en', english);
    await settle();

    chooseLanguage('ar');
    flushDictionary('ar', arabic);
    await settle();

    expect(text()).toContain('مدير المهام');
    expect(document.documentElement.dir).toBe('rtl');
    expect(fixture.nativeElement.querySelector('#account-menu')).toBeNull();

    chooseLanguage('en');
    http.expectNone('/i18n/en.json');
    await settle();

    expect(text()).toContain('Task Manager');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('loads a language that was added to the language list', async () => {
    fixture.detectChanges();
    flushLanguages();
    flushDictionary('en', english);
    await settle();

    chooseLanguage('fr');
    flushDictionary('fr', french);
    await settle();

    expect(text()).toContain('Gestionnaire de tâches');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('shows an error and retries when the language list fails', async () => {
    fixture.detectChanges();
    http.expectOne('/i18n/languages.json').flush('nope', { status: 500, statusText: 'Error' });
    flushDictionary('en', english);
    await settle();

    openAccountMenu();
    expect(text()).toContain('Translations could not be loaded.');

    const retry = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Try again'),
    ) as HTMLButtonElement | undefined;
    retry?.click();
    fixture.detectChanges();
    flushLanguages();
    await settle();

    expect(text()).toContain('Task Manager');
  });

  function flushLanguages(): void {
    http.expectOne('/i18n/languages.json').flush(languages);
  }

  function flushDictionary(languageId: string, dictionary: Record<string, string>): void {
    http.expectOne(`/i18n/${languageId}.json`).flush(dictionary);
  }

  async function settle(): Promise<void> {
    flushData();
    await fixture.whenStable();
    fixture.detectChanges();
    flushData();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function flushData(): void {
    for (const request of http.match((candidate) => candidate.url.startsWith('/data/'))) {
      if (request.request.url.endsWith('/tasks.json')) {
        request.flush({ tasks: [], meta: { totalCount: 0, lastUpdated: '' } });
        continue;
      }

      request.flush({ statistics: [], lastUpdated: '' });
    }
  }

  function openAccountMenu(): void {
    const trigger = fixture.nativeElement.querySelector('.avatar') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
  }

  function chooseLanguage(languageId: string): void {
    openAccountMenu();
    const choice = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === languageId,
    ) as HTMLButtonElement;
    choice.click();
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent ?? '';
  }
});
