import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-account-menu',
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': '$event.stopPropagation()',
    '(document:click)': 'closeMenu()',
    '(document:keydown.escape)': 'closeMenu(true)',
  },
})
export class AccountMenu {
  protected readonly i18n = inject(I18nService);
  protected readonly menuOpen = signal(false);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(returnFocus = false): void {
    if (!this.menuOpen()) {
      return;
    }

    this.menuOpen.set(false);
    if (returnFocus) {
      this.trigger()?.nativeElement.focus();
    }
  }

  protected chooseLanguage(languageId: string): void {
    this.i18n.use(languageId);
    this.closeMenu(true);
  }
}
