import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { Apis } from '../../../core/api/apis';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TaskNotice } from '../../../core/ui/task-notice';
import { Assignee } from '../../../shared/types/task';
import { startNewTask } from '../../tasks/task-edit-dialog/task-edit-dialog';

interface TeamMemberRow {
  id: string;
  name: string;
  email: string;
  avatar: string;
  taskLabel: string;
}

@Component({
  selector: 'app-team-page',
  templateUrl: './team-page.html',
  styleUrl: './team-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPage {
  private readonly taskApi = inject(Apis);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly taskNotice = inject(TaskNotice);
  protected readonly i18n = inject(I18nService);
  protected readonly saveError = this.taskApi.saveError;
  protected readonly members = computed(() => this.memberRows());
  protected readonly loading = computed(() => {
    const status = this.taskApi.tasksStatus();
    const waiting = status === 'loading' || status === 'idle' || status === 'reloading';
    return waiting && this.members().length === 0;
  });
  protected readonly failed = computed(
    () => this.taskApi.tasksStatus() === 'error' && this.members().length === 0,
  );
  protected readonly empty = computed(
    () => !this.loading() && !this.failed() && this.members().length === 0,
  );

  constructor() {
    this.taskApi.loadTasks();
  }

  protected retry(): void {
    this.taskApi.retryTasks();
  }

  protected assign(memberId: string): void {
    this.taskApi.saveError.set('');
    startNewTask(
      this.dialog,
      this.taskApi,
      this.destroyRef,
      () => {
        this.taskNotice.show('task.created');
        void this.router.navigate(['/tasks']);
      },
      () => {
        this.taskApi.saveError.set(this.i18n.t('task.createError'));
      },
      memberId,
    );
  }

  private memberRows(): TeamMemberRow[] {
    const people = new Map<string, { person: Assignee; count: number }>();
    for (const task of this.taskApi.tasks()) {
      const current = people.get(task.assignee.id);
      if (current) {
        current.count += 1;
        continue;
      }

      people.set(task.assignee.id, { person: task.assignee, count: 1 });
    }

    return [...people.values()].map(({ person, count }) => ({
      id: person.id,
      name: person.name,
      email: person.email,
      avatar: person.avatar,
      taskLabel: this.taskLabel(count),
    }));
  }

  private taskLabel(count: number): string {
    if (count === 1) {
      return this.i18n.t('team.task');
    }

    return this.i18n.t('team.tasks').replace('{count}', String(count));
  }
}
