import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { I18nService } from '../../core/i18n/i18n.service';

type StatisticTone = 'neutral' | 'positive' | 'negative';

interface StatisticCard {
  id: string;
  labelKey: string;
  value: string;
  noteKey: string;
  tone: StatisticTone;
  iconSrc: string;
}

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly i18n = inject(I18nService);

  protected readonly cards: StatisticCard[] = [
    {
      id: 'total',
      labelKey: 'stats.total',
      value: '156',
      noteKey: 'stats.totalNote',
      tone: 'positive',
      iconSrc: 'icons/dashboard.svg',
    },
    {
      id: 'completed',
      labelKey: 'stats.completed',
      value: '89',
      noteKey: 'stats.completedNote',
      tone: 'positive',
      iconSrc: 'icons/tasks.svg',
    },
    {
      id: 'inProgress',
      labelKey: 'stats.inProgress',
      value: '42',
      noteKey: 'stats.inProgressNote',
      tone: 'neutral',
      iconSrc: 'icons/in-progress.svg',
    },
    {
      id: 'overdue',
      labelKey: 'stats.overdue',
      value: '25',
      noteKey: 'stats.overdueNote',
      tone: 'negative',
      iconSrc: 'icons/overdue.svg',
    },
  ];
}
