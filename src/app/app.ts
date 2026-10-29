import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { Apis } from './core/api/apis';
import { I18nService } from './core/i18n/i18n.service';
import { NAV_ITEMS } from './core/navigation/nav-items';
import { TaskSearch } from './core/search/task-search';
import { TaskNotice } from './core/ui/task-notice';
import { AccountMenu } from './shared/ui/account-menu/account-menu';
import { NavIcon } from './shared/ui/nav-icon/nav-icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AccountMenu, NavIcon],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly taskApi = inject(Apis);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);
  protected readonly taskSearch = inject(TaskSearch);
  private readonly taskNotice = inject(TaskNotice);
  protected readonly navItems = NAV_ITEMS;
  protected readonly menuOpen = signal(false);
  private readonly currentUrl = signal(this.router.url);
  protected readonly showSearch = computed(() => this.currentUrl().startsWith('/tasks'));

  constructor() {
    this.document.body.classList.add('use-inter');
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected createTask(): void {
    this.closeMenu();
    this.taskApi.saveError.set('');
    void import('./features/tasks/task-edit-dialog/task-edit-dialog').then(({ openNewTask }) => {
      openNewTask(
        this.injector,
        this.taskApi,
        this.destroyRef,
        () => {
          this.taskNotice.show('task.created');
          void this.router.navigate(['/tasks']);
        },
        () => {
          this.taskApi.saveError.set(this.i18n.t('task.createError'));
        },
      );
    });
  }

  protected searchTasks(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.taskSearch.query.set(input.value);
  }
}
