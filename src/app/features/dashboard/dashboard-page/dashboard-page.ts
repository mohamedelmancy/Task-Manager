import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

import { Apis } from '../../../core/api/apis';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ChangeType, Statistic } from '../../../shared/types/task';
import { TaskCharts } from '../task-charts/task-charts';

interface StatisticCard {
  id: string;
  value: string;
  tone: ChangeType;
  icon: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [TaskCharts],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly taskApi = inject(Apis);
  protected readonly i18n = inject(I18nService);
  private readonly holdDone = signal(false);
  protected readonly placeholders = [1, 2, 3, 4];

  protected readonly cards = computed(() => this.taskApi.statistics().map(toCard));

  /** Keeps the skeleton visible for one second, and longer when the statistics are still loading. */
  protected readonly loading = computed(() => {
    if (this.taskApi.statisticsStatus() === 'error') {
      return false;
    }

    if (!this.holdDone()) {
      return true;
    }

    const status = this.taskApi.statisticsStatus();
    const waiting = status === 'loading' || status === 'idle' || status === 'reloading';
    return waiting && this.cards().length === 0;
  });

  protected readonly failed = computed(() => this.taskApi.statisticsStatus() === 'error');

  protected readonly empty = computed(
    () => !this.loading() && !this.failed() && this.cards().length === 0,
  );

  constructor() {
    const timer = setTimeout(() => this.holdDone.set(true), 1000);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  protected retry(): void {
    this.taskApi.retryStatistics();
  }
}

function toCard(statistic: Statistic): StatisticCard {
  return {
    id: statistic.id,
    value: String(statistic.value),
    tone: statistic.changeType,
    icon: statistic.icon,
  };
}
