import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { cacheGetInterceptor, clearGetCache } from '../http/cache-get.interceptor';
import { Apis } from './apis';

const statisticsFile = {
  statistics: [
    {
      id: 'stat-001',
      title: 'Total Tasks',
      icon: '📊',
      value: 156,
      change: '+12',
      changeLabel: 'this week',
      changeType: 'positive',
      color: '#1976D2',
    },
  ],
  lastUpdated: '2026-10-28',
};

const tasksFile = {
  tasks: [
    {
      id: 'task-001',
      title: 'Design new homepage layout',
      description: 'Create wireframes',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-30',
      isOverdue: true,
      assignee: {
        id: 'user-001',
        name: 'John Doe',
        avatar: 'JD',
        email: 'john.doe@company.com',
      },
      tags: ['Design'],
      createdAt: '2026-10-26T00:00:00.000Z',
      updatedAt: '2026-10-28T00:00:00.000Z',
    },
  ],
  meta: { totalCount: 1, lastUpdated: '2026-10-28' },
};

@Component({
  selector: 'app-task-api-host',
  template: `{{ api.statisticsStatus() }} {{ api.tasks().length }}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly api = inject(Apis);
}

describe('TaskApi', () => {
  let fixture: ComponentFixture<Host>;
  let http: HttpTestingController;

  beforeEach(async () => {
    clearGetCache();
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideHttpClient(withInterceptors([cacheGetInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Host);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    clearGetCache();
  });

  it('reads statistics', async () => {
    fixture.detectChanges();
    http.expectOne('/data/statistics.json').flush(statisticsFile);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.api.statistics()[0]?.value).toBe(156);
  });

  it('waits to request tasks', async () => {
    fixture.detectChanges();
    http.expectOne('/data/statistics.json').flush(statisticsFile);
    http.expectNone('/data/tasks.json');

    fixture.componentInstance.api.loadTasks();
    fixture.detectChanges();
    http.expectOne('/data/tasks.json').flush(tasksFile);
    await fixture.whenStable();

    expect(fixture.componentInstance.api.tasks()[0]?.isOverdue).toBe(true);
  });

  it('retries a failed statistics request', async () => {
    fixture.detectChanges();
    http.expectOne('/data/statistics.json').flush('nope', { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.api.statisticsStatus()).toBe('error');

    fixture.componentInstance.api.retryStatistics();
    fixture.detectChanges();
    http.expectOne('/data/statistics.json').flush(statisticsFile);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.api.statistics()[0]?.value).toBe(156);
  });

  it('hides a task after it is deleted', async () => {
    fixture.detectChanges();
    http.expectOne('/data/statistics.json').flush(statisticsFile);
    fixture.componentInstance.api.loadTasks();
    fixture.detectChanges();
    http.expectOne('/data/tasks.json').flush(tasksFile);
    await fixture.whenStable();

    fixture.componentInstance.api.removeTask('task-001').subscribe();
    fixture.detectChanges();

    expect(fixture.componentInstance.api.tasks()).toEqual([]);
  });

  it('shows an edited task title', async () => {
    fixture.detectChanges();
    http.expectOne('/data/statistics.json').flush(statisticsFile);
    fixture.componentInstance.api.loadTasks();
    fixture.detectChanges();
    http.expectOne('/data/tasks.json').flush(tasksFile);
    await fixture.whenStable();

    fixture.componentInstance.api
      .updateTask('task-001', {
        title: 'Design the homepage',
        description: tasksFile.tasks[0].description,
        priority: 'high',
        status: 'todo',
        dueDate: tasksFile.tasks[0].dueDate,
        assignee: tasksFile.tasks[0].assignee,
      })
      .subscribe();
    fixture.detectChanges();

    expect(fixture.componentInstance.api.tasks()[0]?.title).toBe('Design the homepage');
  });

  it('shows a task added in this session', async () => {
    fixture.detectChanges();
    http.expectOne('/data/statistics.json').flush(statisticsFile);
    fixture.componentInstance.api.loadTasks();
    fixture.detectChanges();
    http.expectOne('/data/tasks.json').flush(tasksFile);
    await fixture.whenStable();

    fixture.componentInstance.api
      .createTask({
        title: 'Write release notes',
        description: tasksFile.tasks[0].description,
        priority: 'high',
        status: 'todo',
        dueDate: tasksFile.tasks[0].dueDate,
        assignee: tasksFile.tasks[0].assignee,
      })
      .subscribe();
    fixture.detectChanges();

    expect(fixture.componentInstance.api.tasks().map((task) => task.id)).toEqual([
      'task-001',
      'task-002',
    ]);
  });
});
