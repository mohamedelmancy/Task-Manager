import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

import { Apis } from '../../../core/api/apis';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Assignee, Task, TaskPriority, TaskStatus } from '../../../shared/types/task';

export interface TaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignee: Assignee;
}

export interface TaskEditData {
  task?: Task;
  assigneeId?: string;
}

export function openNewTask(
  injector: Injector,
  taskApi: Apis,
  destroyRef: DestroyRef,
  onSaved: () => void,
  onError: () => void,
): void {
  startNewTask(injector.get(MatDialog), taskApi, destroyRef, onSaved, onError);
}

export function startNewTask(
  dialog: MatDialog,
  taskApi: Apis,
  destroyRef: DestroyRef,
  onSaved: () => void,
  onError: () => void,
  assigneeId = '',
): void {
  taskApi.loadTasks();
  dialog
    .open<TaskEditDialog, TaskEditData, TaskDraft>(TaskEditDialog, {
      data: { assigneeId },
      width: '28rem',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: 'first-tabbable',
    })
    .afterClosed()
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe((draft) => {
      if (!draft) {
        return;
      }

      taskApi.createTask(draft).subscribe({
        next: onSaved,
        error: onError,
      });
    });
}

type TaskField = 'title' | 'dueDate' | 'assigneeId';

const requiredFields: TaskField[] = ['title', 'dueDate', 'assigneeId'];

@Component({
  selector: 'app-task-edit-dialog',
  imports: [ReactiveFormsModule, MatDialogModule],
  templateUrl: './task-edit-dialog.html',
  styleUrl: './task-edit-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskEditDialog {
  private readonly document = inject(DOCUMENT);
  private readonly dialogRef = inject(MatDialogRef<TaskEditDialog, TaskDraft>);
  private readonly data = inject<TaskEditData>(MAT_DIALOG_DATA);
  private readonly taskApi = inject(Apis);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly i18n = inject(I18nService);
  protected readonly headingKey = this.data.task ? 'task.edit' : 'task.create';
  protected readonly assignees = computed(() => peopleFrom(this.taskApi.tasks()));
  protected readonly priorities: { value: TaskPriority; labelKey: string }[] = [
    { value: 'high', labelKey: 'filters.high' },
    { value: 'medium', labelKey: 'filters.medium' },
    { value: 'low', labelKey: 'filters.low' },
  ];
  protected readonly statuses: { value: TaskStatus; labelKey: string }[] = [
    { value: 'todo', labelKey: 'filters.todo' },
    { value: 'in_progress', labelKey: 'filters.inProgress' },
    { value: 'done', labelKey: 'filters.done' },
  ];
  protected readonly submitted = signal(false);
  protected readonly earliestDueDate = localToday();
  protected readonly form = this.formBuilder.nonNullable.group({
    title: [this.data.task?.title ?? '', Validators.required],
    description: [this.data.task?.description ?? ''],
    priority: [this.data.task?.priority ?? 'medium'],
    status: [this.data.task?.status ?? 'todo'],
    dueDate: [this.data.task?.dueDate ?? '', [Validators.required, dueDateNotPast]],
    assigneeId: [this.data.task?.assignee.id ?? this.data.assigneeId ?? '', Validators.required],
  });

  constructor() {
    effect(() => {
      const firstId = this.assignees()[0]?.id;
      if (!firstId || this.form.controls.assigneeId.value !== '') {
        return;
      }

      this.form.controls.assigneeId.setValue(firstId);
    });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected invalid(name: TaskField): boolean {
    return this.submitted() && this.form.controls[name].invalid;
  }

  protected dueDateErrorKey(): string {
    return this.form.controls.dueDate.hasError('past')
      ? 'task.dueDatePast'
      : 'task.dueDateRequired';
  }

  protected save(): void {
    const title = this.form.controls.title;
    if (title.value.trim() === '') {
      title.setErrors({ required: true });
    }

    this.submitted.set(true);
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const value = this.form.getRawValue();
    const assignee = this.assignees().find((person) => person.id === value.assigneeId);
    if (!assignee) {
      this.form.controls.assigneeId.setErrors({ required: true });
      this.focusFirstInvalid();
      return;
    }

    this.dialogRef.close({
      title: value.title.trim(),
      description: value.description.trim(),
      priority: value.priority,
      status: value.status,
      dueDate: value.dueDate,
      assignee,
    });
  }

  private focusFirstInvalid(): void {
    const name = requiredFields.find((field) => this.form.controls[field].invalid);
    this.document.getElementById(`task-${name}`)?.focus();
  }
}

/** Today's date in the local calendar, as `YYYY-MM-DD`, so it can be compared as text. */
function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Rejects a due date before today. An empty value is left for the required check. */
function dueDateNotPast(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value;
  if (value === '' || value >= localToday()) {
    return null;
  }

  return { past: true };
}

/** Lists each person who is assigned to at least one task, in the order they first appear. */
function peopleFrom(tasks: Task[]): Assignee[] {
  const people = new Map<string, Assignee>();
  for (const task of tasks) {
    if (!people.has(task.assignee.id)) {
      people.set(task.assignee.id, task.assignee);
    }
  }

  return [...people.values()];
}
