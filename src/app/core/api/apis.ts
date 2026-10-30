import { httpResource } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import {
  Assignee,
  StatisticsResponse,
  Task,
  TaskPriority,
  TaskStatus,
  TasksResponse,
} from '../../shared/types/task';
import { ActivityLog, ActivitySnapshot } from '../activity/activity-log';
import { clearGetCache } from '../http/cache-get.interceptor';
import { parseStatistics, parseTasks } from './task-data';

export interface NewTask {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignee: Assignee;
}

const EMPTY_STATISTICS: StatisticsResponse = { statistics: [], lastUpdated: '' };
const EMPTY_TASKS: TasksResponse = { tasks: [], meta: { totalCount: 0, lastUpdated: '' } };

@Injectable({ providedIn: 'root' })
export class Apis {
  private readonly activityLog = inject(ActivityLog);
  private readonly tasksRequested = signal(false);
  private readonly removedIds = signal<string[]>([]);
  private readonly addedTasks = signal<Task[]>([]);
  private readonly changedTasks = signal<Task[]>([]);
  readonly saveError = signal('');

  private readonly statisticsResource = httpResource<StatisticsResponse>(
    () => '/data/statistics.json',
    { defaultValue: EMPTY_STATISTICS, parse: parseStatistics },
  );

  private readonly tasksResource = httpResource<TasksResponse>(() => this.tasksUrl(), {
    defaultValue: EMPTY_TASKS,
    parse: parseTasks,
  });

  readonly statisticsStatus = this.statisticsResource.status;
  readonly tasksStatus = this.tasksResource.status;

  readonly statistics = computed(() => this.readStatistics());
  readonly tasks = computed(() => this.readTasks());
  readonly tasksUpdated = computed(() => this.readTasksUpdated());

  loadTasks(): void {
    this.tasksRequested.set(true);
  }

  retryStatistics(): void {
    clearGetCache('/data/statistics.json');
    this.statisticsResource.reload();
  }

  retryTasks(): void {
    clearGetCache('/data/tasks.json');
    this.tasksResource.reload();
  }

  createTask(draft: NewTask): Observable<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      id: this.nextTaskId(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      status: draft.status,
      priority: draft.priority,
      dueDate: draft.dueDate,
      isOverdue: this.isOverdue(draft.status, draft.dueDate),
      completedAt: draft.status === 'done' ? now : null,
      assignee: draft.assignee,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    this.saveError.set('');
    this.addedTasks.update((tasks) => [...tasks, task]);
    this.activityLog.record('created', toSnapshot(task));
    return of(task);
  }

  /**
   * Replaces the task in this session and records the fields that changed.
   * A task that is already done keeps its original completion time.
   */
  updateTask(taskId: string, draft: NewTask): Observable<Task> {
    const current = this.tasks().find((task) => task.id === taskId);
    if (!current) {
      return throwError(() => new Error('Task was not found.'));
    }

    const now = new Date().toISOString();
    const task: Task = {
      ...current,
      title: draft.title.trim(),
      description: draft.description.trim(),
      status: draft.status,
      priority: draft.priority,
      dueDate: draft.dueDate,
      isOverdue: this.isOverdue(draft.status, draft.dueDate),
      completedAt: draft.status === 'done' ? (current.completedAt ?? now) : null,
      assignee: draft.assignee,
      updatedAt: now,
    };
    this.saveError.set('');
    this.addedTasks.update((tasks) => tasks.map((item) => (item.id === task.id ? task : item)));
    this.changedTasks.update((tasks) => [...tasks.filter((item) => item.id !== task.id), task]);
    this.activityLog.record('updated', toSnapshot(task), toSnapshot(current));
    return of(task);
  }

  removeTask(taskId: string): Observable<void> {
    const current = this.tasks().find((task) => task.id === taskId);
    this.removedIds.update((ids) => [...ids, taskId]);
    if (current) {
      this.activityLog.record('deleted', toSnapshot(current));
    }
    return of(undefined);
  }

  private readStatistics(): StatisticsResponse['statistics'] {
    if (this.statisticsResource.status() === 'error') {
      return [];
    }

    return this.statisticsResource.value().statistics;
  }

  /**
   * Joins the loaded file with this session's edits.
   * Creates, updates, and deletes stay in memory and are not written back to the file.
   */
  private readTasks(): Task[] {
    if (this.tasksResource.status() === 'error') {
      return [];
    }

    const removed = new Set(this.removedIds());
    const changes = new Map(this.changedTasks().map((task) => [task.id, task]));
    const loaded = this.tasksResource
      .value()
      .tasks.filter((task) => !removed.has(task.id))
      .map((task) => changes.get(task.id) ?? task);
    const loadedIds = new Set(loaded.map((task) => task.id));
    const pending = this.addedTasks().filter(
      (task) => !removed.has(task.id) && !loadedIds.has(task.id),
    );
    return [...loaded, ...pending];
  }

  /** Keeps the tasks request idle until a screen asks for them. */
  private tasksUrl(): string | undefined {
    return this.tasksRequested() ? '/data/tasks.json' : undefined;
  }

  private nextTaskId(): string {
    const numbers = this.tasks().map((task) => Number(task.id.replace('task-', '')));
    const next = Math.max(0, ...numbers.filter((number) => Number.isFinite(number))) + 1;
    return `task-${String(next).padStart(3, '0')}`;
  }

  /** A done task is never overdue. Dates are compared as `YYYY-MM-DD`. */
  private isOverdue(status: TaskStatus, dueDate: string): boolean {
    const today = this.tasksUpdated().slice(0, 10);
    return status !== 'done' && today > dueDate;
  }

  private readTasksUpdated(): string {
    if (this.tasksResource.status() === 'error') {
      return '';
    }

    return this.tasksResource.value().meta.lastUpdated;
  }
}

function toSnapshot(task: Task): ActivitySnapshot {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate,
    assigneeName: task.assignee.name,
  };
}
