import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Apis } from '../../../core/api/apis';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TaskSearch } from '../../../core/search/task-search';
import { TaskNotice } from '../../../core/ui/task-notice';
import { startNewTask } from '../task-edit-dialog/task-edit-dialog';
import { TaskBoard } from '../task-board/task-board';

@Component({
  selector: 'app-tasks-page',
  imports: [TaskBoard],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeMenus($event)',
    '(document:keydown.escape)': 'closeMenus()',
  },
})
export class TasksPage {
  private readonly taskApi = inject(Apis);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);
  protected readonly saveError = this.taskApi.saveError;
  protected readonly taskSearch = inject(TaskSearch);
  private readonly taskNotice = inject(TaskNotice);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly statusOptions = [
    { value: 'all', labelKey: 'filters.all' },
    { value: 'todo', labelKey: 'filters.todo' },
    { value: 'in_progress', labelKey: 'filters.inProgress' },
    { value: 'done', labelKey: 'filters.done' },
  ];
  protected readonly priorityOptions = [
    { value: 'all', labelKey: 'filters.all' },
    { value: 'high', labelKey: 'filters.high' },
    { value: 'medium', labelKey: 'filters.medium' },
    { value: 'low', labelKey: 'filters.low' },
  ];
  protected readonly filters = signal({
    status: 'all',
    priority: 'all',
    assigneeId: 'all',
  });
  protected readonly priorityOpen = signal(false);
  protected readonly assigneeOpen = signal(false);
  protected readonly priorityLabel = computed(() => this.currentPriorityLabel());
  protected readonly assignees = computed(() => this.assigneeOptions());
  protected readonly assigneeLabel = computed(() => this.currentAssigneeLabel());

  constructor() {
    this.taskApi.loadTasks();
    effect(() => {
      const key = this.taskNotice.consume();
      if (key === '') {
        return;
      }

      untracked(() => {
        this.snackBar.open(this.i18n.t(key), undefined, {
          duration: 2500,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: 'task-toast',
        });
      });
    });
  }

  protected togglePriority(): void {
    this.assigneeOpen.set(false);
    this.priorityOpen.update((open) => !open);
  }

  protected toggleAssignee(): void {
    this.priorityOpen.set(false);
    this.assigneeOpen.update((open) => !open);
  }

  protected filterName(labelKey: string, value: string): string {
    const label = this.i18n.t(labelKey);
    return value === label ? label : `${label}, ${value}`;
  }

  protected closeMenus(event?: Event): void {
    const target = event?.target;
    if (target instanceof Element && target.closest('.dropdown')) {
      return;
    }

    this.priorityOpen.set(false);
    this.assigneeOpen.set(false);
  }

  protected chooseStatus(status: string): void {
    this.filters.update((filters) => ({ ...filters, status }));
  }

  protected choosePriority(priority: string): void {
    this.filters.update((filters) => ({ ...filters, priority }));
    this.closeMenus();
  }

  protected createTask(): void {
    this.closeMenus();
    this.taskApi.saveError.set('');
    startNewTask(
      this.dialog,
      this.taskApi,
      this.destroyRef,
      () => this.taskNotice.show('task.created'),
      () => {
        this.taskApi.saveError.set(this.i18n.t('task.createError'));
      },
    );
  }

  protected chooseAssignee(assigneeId: string): void {
    this.filters.update((filters) => ({ ...filters, assigneeId }));
    this.closeMenus();
  }

  private currentPriorityLabel(): string {
    const selected = this.priorityOptions.find(
      (option) => option.value === this.filters().priority,
    );
    if (!selected || selected.value === 'all') {
      return this.i18n.t('filters.priority');
    }

    return this.i18n.t(selected.labelKey);
  }

  private assigneeOptions(): { id: string; name: string }[] {
    const people = new Map<string, string>();
    for (const task of this.taskApi.tasks()) {
      if (!people.has(task.assignee.id)) {
        people.set(task.assignee.id, task.assignee.name);
      }
    }

    return [...people].map(([id, name]) => ({ id, name }));
  }

  private currentAssigneeLabel(): string {
    const selected = this.assignees().find((person) => person.id === this.filters().assigneeId);
    return selected?.name ?? this.i18n.t('filters.assignee');
  }
}
