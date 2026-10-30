import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ArcElement, Chart, DoughnutController, Tooltip } from 'chart.js';

import { Apis } from '../../../core/api/apis';
import { I18nService } from '../../../core/i18n/i18n.service';

Chart.register(DoughnutController, ArcElement, Tooltip);

interface SliceStyle {
  key: string;
  labelKey: string;
  color: string;
}

interface ChartSlice {
  key: string;
  label: string;
  count: number;
  color: string;
}

const STATUS_SLICES: SliceStyle[] = [
  { key: 'todo', labelKey: 'filters.todo', color: '#1976d2' },
  { key: 'in_progress', labelKey: 'filters.inProgress', color: '#c24900' },
  { key: 'done', labelKey: 'filters.done', color: '#367f3a' },
];

const PRIORITY_SLICES: SliceStyle[] = [
  { key: 'high', labelKey: 'filters.high', color: '#c62828' },
  { key: 'medium', labelKey: 'filters.medium', color: '#c24900' },
  { key: 'low', labelKey: 'filters.low', color: '#367f3a' },
];

@Component({
  selector: 'app-task-charts',
  templateUrl: './task-charts.html',
  styleUrl: './task-charts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCharts {
  private readonly taskApi = inject(Apis);
  private readonly statusCanvas = viewChild<ElementRef<HTMLCanvasElement>>('statusChart');
  private readonly priorityCanvas = viewChild<ElementRef<HTMLCanvasElement>>('priorityChart');
  private statusChart: Chart | null = null;
  private priorityChart: Chart | null = null;

  private readonly holdDone = signal(false);
  protected readonly chartPlaceholders = [1, 2];
  protected readonly i18n = inject(I18nService);
  protected readonly statusSlices = computed(() => this.slices(this.statusCounts(), STATUS_SLICES));
  protected readonly prioritySlices = computed(() =>
    this.slices(this.priorityCounts(), PRIORITY_SLICES),
  );

  /** Keeps the skeleton visible for one second, and longer when the tasks are still loading. */
  protected readonly loading = computed(() => {
    if (this.taskApi.tasksStatus() === 'error') {
      return false;
    }

    if (!this.holdDone()) {
      return true;
    }

    const status = this.taskApi.tasksStatus();
    const waiting = status === 'loading' || status === 'idle' || status === 'reloading';
    return waiting && this.taskApi.tasks().length === 0;
  });

  protected readonly failed = computed(() => this.taskApi.tasksStatus() === 'error');

  protected readonly empty = computed(
    () => !this.loading() && !this.failed() && this.taskApi.tasks().length === 0,
  );

  constructor() {
    const timer = setTimeout(() => this.holdDone.set(true), 1000);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    this.taskApi.loadTasks();

    effect(() => {
      const statusCanvas = this.statusCanvas()?.nativeElement;
      const priorityCanvas = this.priorityCanvas()?.nativeElement;
      const status = this.statusSlices();
      const priority = this.prioritySlices();

      untracked(() => {
        if (!statusCanvas || !priorityCanvas) {
          this.destroyCharts();
          return;
        }

        this.statusChart = drawChart(this.statusChart, statusCanvas, status);
        this.priorityChart = drawChart(this.priorityChart, priorityCanvas, priority);
      });
    });

    inject(DestroyRef).onDestroy(() => this.destroyCharts());
  }

  protected retry(): void {
    this.taskApi.retryTasks();
  }

  private statusCounts(): Record<string, number> {
    const counts: Record<string, number> = { todo: 0, in_progress: 0, done: 0 };
    for (const task of this.taskApi.tasks()) {
      counts[task.status] += 1;
    }
    return counts;
  }

  private priorityCounts(): Record<string, number> {
    const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    for (const task of this.taskApi.tasks()) {
      counts[task.priority] += 1;
    }
    return counts;
  }

  private slices(counts: Record<string, number>, styles: SliceStyle[]): ChartSlice[] {
    return styles.map((style) => ({
      key: style.key,
      label: this.i18n.t(style.labelKey),
      count: counts[style.key] ?? 0,
      color: style.color,
    }));
  }

  private destroyCharts(): void {
    this.statusChart?.destroy();
    this.priorityChart?.destroy();
    this.statusChart = null;
    this.priorityChart = null;
  }
}

/**
 * Updates the chart already drawn on this canvas.
 * A replaced canvas gets a new chart, and the previous one is destroyed.
 */
function drawChart(current: Chart | null, canvas: HTMLCanvasElement, slices: ChartSlice[]): Chart {
  const labels = slices.map((slice) => slice.label);
  const data = slices.map((slice) => slice.count);
  const backgroundColor = slices.map((slice) => slice.color);

  if (current?.canvas === canvas) {
    current.data.labels = labels;
    current.data.datasets[0].data = data;
    current.data.datasets[0].backgroundColor = backgroundColor;
    current.update();
    return current;
  }

  current?.destroy();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor, borderColor: '#ffffff', borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      animation: reduceMotion ? false : { duration: 400 },
    },
  });
}
