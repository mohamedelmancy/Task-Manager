import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';

import { StatisticsResponse, Task, TasksResponse } from '../../shared/types/task';
import { clearGetCache } from '../http/cache-get.interceptor';
import { parseStatistics, parseTasks } from './task-data';

const EMPTY_STATISTICS: StatisticsResponse = { statistics: [], lastUpdated: '' };
const EMPTY_TASKS: TasksResponse = { tasks: [], meta: { totalCount: 0, lastUpdated: '' } };

@Injectable({ providedIn: 'root' })
export class TaskApi {
  private readonly tasksRequested = signal(false);

  private readonly statisticsResource = httpResource<StatisticsResponse>(
    () => '/data/statistics.json',
    { defaultValue: EMPTY_STATISTICS, parse: parseStatistics },
  );

  private readonly tasksResource = httpResource<TasksResponse>(
    () => (this.tasksRequested() ? '/data/tasks.json' : undefined),
    { defaultValue: EMPTY_TASKS, parse: parseTasks },
  );

  readonly statisticsStatus = this.statisticsResource.status;
  readonly tasksStatus = this.tasksResource.status;

  readonly statistics = computed(() => this.readStatistics());
  readonly tasks = computed(() => this.readTasks());

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

  private readStatistics(): StatisticsResponse['statistics'] {
    if (this.statisticsResource.status() === 'error') {
      return [];
    }

    return this.statisticsResource.value().statistics;
  }

  private readTasks(): Task[] {
    if (this.tasksResource.status() === 'error') {
      return [];
    }

    return this.tasksResource.value().tasks;
  }
}
