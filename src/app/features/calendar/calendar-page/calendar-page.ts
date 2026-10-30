import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';

import { ActivityField, ActivityLog } from '../../../core/activity/activity-log';
import { Apis } from '../../../core/api/apis';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-calendar-page',
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  private readonly taskApi = inject(Apis);
  private readonly activityLog = inject(ActivityLog);

  protected readonly i18n = inject(I18nService);
  protected readonly placeholders = [1, 2, 3];
  protected readonly openId = signal('');

  protected readonly activities = computed(() => {
    const languageId = this.i18n.languageId();
    return this.activityLog.activities().map((entry) => ({
      ...entry,
      actionLabel: this.i18n.t(`activity.${entry.action}`),
      when: formatWhen(entry.at, languageId),
      changes: entry.changes.map((change) => ({
        field: change.field,
        label: this.i18n.t(FIELD_LABEL[change.field]),
        before: displayValue(change.field, change.before, languageId, (key) => this.i18n.t(key)),
        after: displayValue(change.field, change.after, languageId, (key) => this.i18n.t(key)),
      })),
    }));
  });

  /** Shows the loader only when no history is available yet. Saved rows stay visible during a reload. */
  protected readonly loading = computed(() => {
    const status = this.taskApi.tasksStatus();
    const waiting = status === 'loading' || status === 'idle' || status === 'reloading';
    return waiting && this.activities().length === 0;
  });

  protected readonly failed = computed(
    () => this.taskApi.tasksStatus() === 'error' && this.activities().length === 0,
  );

  protected readonly empty = computed(
    () => !this.loading() && !this.failed() && this.activities().length === 0,
  );

  constructor() {
    this.taskApi.loadTasks();
    effect(() => {
      const status = this.taskApi.tasksStatus();
      const tasks = this.taskApi.tasks();
      if (status !== 'resolved' && status !== 'local') {
        return;
      }

      // Seed history once the file has loaded. `untracked` avoids recording this read as a dependency.
      untracked(() => this.activityLog.remember(tasks));
    });
  }

  protected retry(): void {
    this.taskApi.retryTasks();
  }

  protected toggle(id: string): void {
    this.openId.update((current) => (current === id ? '' : id));
  }
}

const FIELD_LABEL: Record<ActivityField, string> = {
  title: 'task.title',
  description: 'task.description',
  status: 'filters.status',
  priority: 'filters.priority',
  dueDate: 'task.dueDate',
  assignee: 'filters.assignee',
};

const STATUS_LABEL: Record<string, string> = {
  todo: 'filters.todo',
  in_progress: 'filters.inProgress',
  done: 'filters.done',
};

/** Shows a translated status or priority, a short due date, or the raw text for other fields. */
function displayValue(
  field: ActivityField,
  value: string,
  languageId: string,
  translate: (key: string) => string,
): string {
  if (value === '') {
    return '';
  }
  if (field === 'priority') {
    return translate(`filters.${value}`);
  }
  if (field === 'status') {
    return translate(STATUS_LABEL[value] ?? value);
  }
  if (field === 'dueDate') {
    return formatDay(value, languageId);
  }
  return value;
}

/** Formats the calendar day in local time so a UTC timestamp does not shift the date. */
function formatDay(isoDate: string, languageId: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(languageId, { month: 'short', day: 'numeric' }).format(
    new Date(year, month - 1, day),
  );
}

function formatWhen(isoDate: string, languageId: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(languageId, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
