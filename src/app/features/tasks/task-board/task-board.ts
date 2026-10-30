import { DOCUMENT } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { Apis } from '../../../core/api/apis';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TaskNotice } from '../../../core/ui/task-notice';
import { Task, TaskPriority, TaskStatus } from '../../../shared/types/task';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { TaskDraft, TaskEditDialog } from '../task-edit-dialog/task-edit-dialog';

interface BoardCard {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  priorityKey: string;
  overdue: boolean;
  done: boolean;
  note: string;
  iconSrc: string;
  tag: string;
  initials: string;
  handle: string;
}

interface BoardColumn {
  status: TaskStatus;
  labelKey: string;
  countLabel: string;
  tasks: BoardCard[];
}

const COLUMNS: readonly { status: TaskStatus; labelKey: string }[] = [
  { status: 'todo', labelKey: 'filters.todo' },
  { status: 'in_progress', labelKey: 'filters.inProgress' },
  { status: 'done', labelKey: 'filters.done' },
];

@Component({
  selector: 'app-task-board',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag],
  templateUrl: './task-board.html',
  styleUrl: './task-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeMenu($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class TaskBoard {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly taskApi = inject(Apis);
  private readonly taskNotice = inject(TaskNotice);
  protected readonly i18n = inject(I18nService);

  readonly status = input('all');
  readonly priority = input('all');
  readonly assigneeId = input('all');
  readonly query = input('');

  /** Full board order after a drag. Null until the first drop, so the loaded order is used. */
  private readonly edits = signal<Task[] | null>(null);
  protected readonly openMenuId = signal<string | null>(null);
  protected readonly inlineEdit = signal<InlineEdit | null>(null);
  protected readonly actionError = signal('');

  protected readonly loading = computed(() => this.isLoading());
  protected readonly failed = computed(() => this.taskApi.tasksStatus() === 'error');
  protected readonly columns = computed(() => this.buildColumns());

  constructor() {
    this.taskApi.loadTasks();
  }

  protected retry(): void {
    this.edits.set(null);
    this.taskApi.retryTasks();
  }

  /** Reorders or moves a card between columns. The new order lasts for this visit only. */
  protected drop(event: CdkDragDrop<BoardCard[]>): void {
    const moved = this.moveTasks(event);
    if (moved) {
      this.edits.set(moved);
    }
  }

  protected toggleMenu(taskId: string): void {
    this.openMenuId.update((current) => (current === taskId ? null : taskId));
  }

  protected closeMenu(event?: Event): void {
    const target = event?.target;
    if (target instanceof Element && target.closest('.card-menu')) {
      return;
    }

    this.openMenuId.set(null);
  }

  protected onEscape(): void {
    if (this.inlineEdit()) {
      this.inlineEdit.set(null);
      return;
    }

    this.closeMenu();
  }

  protected menuLabel(title: string): string {
    return this.i18n.t('task.actions').replace('{title}', title);
  }

  protected editTask(taskId: string, trigger: HTMLButtonElement): void {
    const task = this.taskById(taskId);
    if (!task) {
      return;
    }

    this.closeMenu();
    this.inlineEdit.set(null);
    this.dialog
      .open(TaskEditDialog, {
        data: { task },
        width: '28rem',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: 'first-tabbable',
        restoreFocus: false,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((draft: TaskDraft | undefined) => {
        if (draft) {
          this.persist(task.id, draft);
        }
        trigger.focus();
      });
  }

  protected editingField(taskId: string, field: InlineField): boolean {
    const current = this.inlineEdit();
    return current?.id === taskId && current.field === field;
  }

  protected startInline(taskId: string, field: InlineField, value: string, event: Event): void {
    event.stopPropagation();
    this.closeMenu();
    this.inlineEdit.set({ id: taskId, field, value });
  }

  protected changeInline(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inlineEdit.update((current) => (current ? { ...current, value } : null));
  }

  protected cancelInline(event: Event): void {
    event.stopPropagation();
    this.inlineEdit.set(null);
  }

  protected saveInline(): void {
    const edit = this.inlineEdit();
    const task = edit ? this.taskById(edit.id) : undefined;
    this.inlineEdit.set(null);
    if (!edit || !task) {
      return;
    }

    const title = edit.field === 'title' ? edit.value.trim() : task.title;
    const description = edit.field === 'description' ? edit.value.trim() : task.description;
    if (title === '' || (title === task.title && description === task.description)) {
      return;
    }

    this.persist(task.id, {
      title,
      description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      assignee: task.assignee,
    });
  }

  protected deleteTask(taskId: string, trigger: HTMLButtonElement): void {
    const task = this.taskById(taskId);
    if (!task) {
      return;
    }

    this.closeMenu();
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: this.i18n.t('task.deleteTitle'),
          message: this.i18n.t('task.deleteMessage').replace('{title}', task.title),
          confirmLabel: this.i18n.t('task.yes'),
          cancelLabel: this.i18n.t('task.cancel'),
        },
        autoFocus: 'first-tabbable',
        restoreFocus: false,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed: boolean | undefined) => {
        if (!confirmed) {
          trigger.focus();
          return;
        }

        this.removeTask(taskId, trigger);
      });
  }

  private isLoading(): boolean {
    const status = this.taskApi.tasksStatus();
    const waiting = status === 'loading' || status === 'idle' || status === 'reloading';
    return waiting && this.placedTasks().length === 0;
  }

  private buildColumns(): BoardColumn[] {
    const visible = this.placedTasks().filter((task) => this.matchesFilters(task));
    const today = this.taskApi.tasksUpdated();
    const languageId = this.i18n.languageId();

    return COLUMNS.map((column) => {
      const tasks = visible
        .filter((task) => task.status === column.status)
        .map((task) => toCard(task, today, languageId, (key) => this.i18n.t(key)));

      return {
        status: column.status,
        labelKey: column.labelKey,
        countLabel: this.i18n.t('board.count').replace('{count}', String(tasks.length)),
        tasks,
      };
    });
  }

  /** Uses the drag order when one exists, then appends tasks created after that drop. */
  private placedTasks(): Task[] {
    const saved = this.taskApi.tasks();
    const edits = this.edits();
    if (!edits) {
      return saved;
    }

    const ids = new Set(edits.map((task) => task.id));
    return [...edits, ...saved.filter((task) => !ids.has(task.id))];
  }

  private removeTask(taskId: string, trigger: HTMLButtonElement): void {
    this.taskApi
      .removeTask(taskId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionError.set('');
          this.edits.update((current) => current?.filter((task) => task.id !== taskId) ?? null);
          this.document.getElementById('content')?.focus();
        },
        error: () => {
          this.actionError.set(this.i18n.t('task.deleteError'));
          trigger.focus();
        },
      });
  }

  private taskById(taskId: string): Task | undefined {
    return this.placedTasks().find((task) => task.id === taskId);
  }

  private persist(taskId: string, draft: TaskDraft): void {
    this.taskApi
      .updateTask(taskId, draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.actionError.set('');
          this.taskNotice.show('task.updated');
          this.edits.update(
            (current) => current?.map((item) => (item.id === saved.id ? saved : item)) ?? null,
          );
        },
        error: () => {
          this.actionError.set(this.i18n.t('task.updateError'));
        },
      });
  }

  /** A task is shown only when every active filter matches. An empty search matches everything. */
  private matchesFilters(task: Task): boolean {
    const status = this.status();
    const priority = this.priority();
    const assigneeId = this.assigneeId();
    const query = this.query().trim().toLowerCase();
    const statusMatches = status === 'all' || task.status === status;
    const priorityMatches = priority === 'all' || task.priority === priority;
    const assigneeMatches = assigneeId === 'all' || task.assignee.id === assigneeId;
    const queryMatches = matchesQuery(task, query);
    return statusMatches && priorityMatches && assigneeMatches && queryMatches;
  }

  /**
   * Applies a drop to the whole task list.
   * A card that changes column gets that column's status. A drop in the same spot is ignored.
   */
  private moveTasks(event: CdkDragDrop<BoardCard[]>): Task[] | null {
    const sameSpot =
      event.previousContainer === event.container && event.previousIndex === event.currentIndex;
    if (sameSpot) {
      return null;
    }

    const source = [...event.previousContainer.data];
    const target = event.previousContainer === event.container ? source : [...event.container.data];

    if (event.previousContainer === event.container) {
      moveCard(source, event.previousIndex, event.currentIndex);
    } else {
      const [card] = source.splice(event.previousIndex, 1);
      target.splice(event.currentIndex, 0, card);
    }

    const nextStatus = event.container.id as TaskStatus;
    const previousStatus = event.previousContainer.id as TaskStatus;
    const today = this.taskApi.tasksUpdated();
    const statusById = new Map<string, TaskStatus>();
    for (const card of source) {
      statusById.set(card.id, previousStatus);
    }
    for (const card of target) {
      statusById.set(card.id, nextStatus);
    }

    const updated = this.placedTasks().map((task) => {
      const status = statusById.get(task.id);
      return status && status !== task.status ? withStatus(task, status, today) : task;
    });

    return orderTasks(updated, previousStatus, source, nextStatus, target);
  }
}

interface InlineEdit {
  id: string;
  field: InlineField;
  value: string;
}

type InlineField = 'title' | 'description';

function matchesQuery(task: Task, query: string): boolean {
  if (query === '') {
    return true;
  }

  const title = task.title.toLowerCase();
  const description = task.description.toLowerCase();
  return title.includes(query) || description.includes(query);
}

function toCard(
  task: Task,
  today: string,
  languageId: string,
  translate: (key: string) => string,
): BoardCard {
  const firstName = task.assignee.name.split(' ')[0] ?? task.assignee.name;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    priorityKey: `filters.${task.priority}`,
    overdue: task.isOverdue,
    done: task.status === 'done',
    note: taskNote(task, today, languageId, translate),
    iconSrc: noteIcon(task),
    tag: task.tags[0] ?? '',
    initials: task.assignee.avatar,
    handle: `@${firstName}`,
  };
}

/**
 * Done tasks show when they were completed.
 * Overdue tasks show how many days late they are, and the rest show the due date.
 */
function taskNote(
  task: Task,
  today: string,
  languageId: string,
  translate: (key: string) => string,
): string {
  if (task.status === 'done' && task.completedAt) {
    const days = daysBetween(task.completedAt, today);
    if (days <= 0) {
      return translate('board.completedToday');
    }
    if (days === 1) {
      return translate('board.completedYesterday');
    }
    return translate('board.completedOn').replace(
      '{date}',
      formatDay(task.completedAt, languageId),
    );
  }

  if (task.isOverdue) {
    const days = Math.max(1, daysBetween(task.dueDate, today));
    if (days === 1) {
      return translate('board.overdueOne');
    }
    return translate('board.overdue').replace('{count}', String(days));
  }

  return translate('board.due').replace('{date}', formatDay(task.dueDate, languageId));
}

function noteIcon(task: Task): string {
  if (task.status === 'done' && task.completedAt) {
    return 'icons/tasks.svg';
  }
  if (task.isOverdue) {
    return 'icons/overdue.svg';
  }
  return 'icons/calendar.svg';
}

/**
 * Moving a task to Done clears the overdue flag and keeps an existing completion time.
 * Moving it out of Done clears that time and recalculates overdue from the due date.
 */
function withStatus(task: Task, status: TaskStatus, today: string): Task {
  if (status === 'done') {
    return {
      ...task,
      status,
      isOverdue: false,
      completedAt: task.completedAt ?? today,
    };
  }

  return {
    ...task,
    status,
    isOverdue: today.slice(0, 10) > task.dueDate,
    completedAt: null,
  };
}

/** Rebuilds the list as To Do, then In Progress, then Done, using the dropped card order in each column. */
function orderTasks(
  tasks: Task[],
  previousStatus: TaskStatus,
  source: BoardCard[],
  nextStatus: TaskStatus,
  target: BoardCard[],
): Task[] {
  const buckets = groupByStatus(tasks);
  buckets[previousStatus] = sortBucket(buckets[previousStatus], source);
  if (previousStatus !== nextStatus) {
    buckets[nextStatus] = sortBucket(buckets[nextStatus], target);
  }

  return [...buckets.todo, ...buckets.in_progress, ...buckets.done];
}

function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  return {
    todo: tasks.filter((task) => task.status === 'todo'),
    in_progress: tasks.filter((task) => task.status === 'in_progress'),
    done: tasks.filter((task) => task.status === 'done'),
  };
}

/** Keeps the visible drop order, then appends tasks hidden by the current filters. */
function sortBucket(tasks: Task[], cards: BoardCard[]): Task[] {
  const ids = cards.map((card) => card.id);
  const visible = ids
    .map((id) => tasks.find((task) => task.id === id))
    .filter((task): task is Task => task !== undefined);
  const hidden = tasks.filter((task) => !ids.includes(task.id));
  return [...visible, ...hidden];
}

function moveCard(cards: BoardCard[], from: number, to: number): void {
  const [card] = cards.splice(from, 1);
  cards.splice(to, 0, card);
}

/** Whole calendar days between two dates. The time of day is ignored. */
function daysBetween(earlier: string, later: string): number {
  const start = Date.parse(`${earlier.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${later.slice(0, 10)}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/** Formats the calendar day in local time so a UTC timestamp does not shift the date. */
function formatDay(isoDate: string, languageId: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(languageId, { month: 'short', day: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}
