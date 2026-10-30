import { Injectable, computed, signal } from '@angular/core';

export type ActivityAction = 'created' | 'updated' | 'deleted';
export type ActivityField =
  'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'assignee';

export interface ActivityChange {
  field: ActivityField;
  before: string;
  after: string;
}

export interface ActivityEntry {
  id: string;
  taskId: string;
  title: string;
  action: ActivityAction;
  at: string;
  changes: ActivityChange[];
}

export interface ActivitySnapshot {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  assigneeName: string;
}

interface SavedTask {
  id: string;
  title: string;
  updatedAt: string;
}

const STORAGE_KEY = 'task-activity';
const LIMIT = 30;
const FIELDS: ActivityField[] = [
  'title',
  'description',
  'status',
  'priority',
  'dueDate',
  'assignee',
];

@Injectable({ providedIn: 'root' })
export class ActivityLog {
  private readonly entries = signal<ActivityEntry[]>(readActivities());

  readonly activities = computed(() =>
    [...this.entries()].sort((left, right) => right.at.localeCompare(left.at)),
  );

  /**
   * Saves one change at the current time and keeps the newest 30.
   * A delete stores the removed values. A create stores the new values.
   * An update stores only the fields that differ from `previous`.
   */
  record(
    action: ActivityAction,
    task: ActivitySnapshot,
    previous: ActivitySnapshot | null = null,
  ): void {
    const at = new Date().toISOString();
    const changes = action === 'deleted' ? fieldChanges(task, null) : fieldChanges(previous, task);
    this.entries.update((current) =>
      [
        { id: `${task.id}-${at}`, taskId: task.id, title: task.title, action, at, changes },
        ...current,
      ].slice(0, LIMIT),
    );
    this.save();
  }

  /** Copies saved tasks into history once, so later edits are not replaced on refresh. */
  remember(tasks: SavedTask[]): void {
    if (this.entries().length > 0 || tasks.length === 0) {
      return;
    }

    const seeded = [...tasks]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, LIMIT)
      .map((task) => ({
        id: `${task.id}-saved`,
        taskId: task.id,
        title: task.title,
        action: 'updated' as const,
        at: task.updatedAt,
        changes: [],
      }));
    this.entries.set(seeded);
    this.save();
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries()));
  }
}

/** Returns one change per field that differs. A missing side is stored as an empty string. */
function fieldChanges(
  before: ActivitySnapshot | null,
  after: ActivitySnapshot | null,
): ActivityChange[] {
  return FIELDS.flatMap((field) => {
    const previous = before ? fieldValue(before, field) : '';
    const next = after ? fieldValue(after, field) : '';
    if (previous === next) {
      return [];
    }
    return [{ field, before: previous, after: next }];
  });
}

function fieldValue(task: ActivitySnapshot, field: ActivityField): string {
  if (field === 'assignee') {
    return task.assigneeName;
  }
  return task[field];
}

/** Reads saved history. Rows stored before field changes existed get an empty change list. */
function readActivities(): ActivityEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((entry) => ({
      ...(entry as ActivityEntry),
      changes: Array.isArray((entry as ActivityEntry).changes)
        ? (entry as ActivityEntry).changes
        : [],
    }));
  } catch {
    return [];
  }
}
