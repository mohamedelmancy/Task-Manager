import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DestroyRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { throwError } from 'rxjs';
import axe from 'axe-core';

import { Apis } from '../../../core/api/apis';
import { cacheGetInterceptor, clearGetCache } from '../../../core/http/cache-get.interceptor';
import { openNewTask } from '../../tasks/task-edit-dialog/task-edit-dialog';
import { TeamPage } from './team-page';

const languages = [{ id: 'en', label: 'English', direction: 'ltr' }];

const english = {
  'team.title': 'Team',
  'team.intro': 'People you can assign tasks to.',
  'team.assign': 'Assign task',
  'team.task': '1 task',
  'team.tasks': '{count} tasks',
  'team.loading': 'Loading task counts',
  'team.tasksError': 'Task counts could not be loaded.',
  'team.retry': 'Try again',
  'task.cancel': 'Cancel',
  'task.createError': 'The task could not be added.',
  'task.titleRequired': 'Enter a title.',
};

const tasksFile = {
  tasks: [
    task('task-001', 'user-001', 'John Doe'),
    task('task-002', 'user-001', 'John Doe'),
    task('task-003', 'user-002', 'Sarah Smith'),
  ],
  meta: { totalCount: 3, lastUpdated: '2026-10-28' },
};

function task(id: string, assigneeId: string, name: string) {
  return {
    id,
    title: 'Write the notes',
    description: 'Draft the notes',
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-11-02',
    isOverdue: false,
    completedAt: null,
    assignee: {
      id: assigneeId,
      name,
      avatar: 'AA',
      email: 'person@company.com',
    },
    tags: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
  };
}

describe('TeamPage', () => {
  let fixture: ComponentFixture<TeamPage>;
  let http: HttpTestingController;
  let tasksFail = false;

  beforeEach(async () => {
    tasksFail = false;
    clearGetCache();
    await TestBed.configureTestingModule({
      imports: [TeamPage],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([cacheGetInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamPage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(async () => {
    await closeDialog();
    vi.restoreAllMocks();
    http.verify();
    clearGetCache();
  });

  it('lists people and their task counts', async () => {
    await settle();

    expect(text()).toContain('Team');
    expect(text()).toContain('John Doe');
    expect(text()).toContain('Sarah Smith');
    expect(text()).not.toContain('Mike Johnson');
    expect(text()).not.toContain('Emily Davis');
    expect(text()).toContain('2 tasks');
    expect(text()).toContain('1 task');
    expect(text()).not.toContain('0 tasks');
  });

  it('has no accessibility violations', async () => {
    await settle();

    const results = await axe.run(fixture.nativeElement);
    const violations = results.violations.map((violation) => violation.id);

    expect(violations).toEqual([]);
  });

  it('shows an error and retries when task counts fail', async () => {
    tasksFail = true;
    await settle();
    expect(text()).toContain('Task counts could not be loaded.');

    tasksFail = false;
    const retry = fixture.nativeElement.querySelector('.retry') as HTMLButtonElement;
    retry.click();
    await settle();

    expect(text()).toContain('2 tasks');
    expect(text()).not.toContain('Task counts could not be loaded.');
  });

  it('opens a new task for the selected person', async () => {
    await settle();
    assignTo('Sarah Smith');

    const select = document.querySelector('#task-assigneeId') as HTMLSelectElement;
    expect(select.value).toBe('user-002');
  });

  it('asks for a title before saving', async () => {
    await settle();
    assignTo('Sarah Smith');
    submitDialog();
    await fixture.whenStable();

    expect(document.body.textContent).toContain('Enter a title.');
  });

  it('saves a task for the selected person', async () => {
    await settle();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    assignTo('Sarah Smith');
    setField('#task-title', 'Prepare the notes');
    setField('#task-dueDate', '2026-11-20');
    submitDialog();
    await finishDialog();

    expect(navigate).toHaveBeenCalledWith(['/tasks']);
    expect(document.querySelector('#task-title')).toBeNull();
  });

  it('shows an error when the task cannot be saved', async () => {
    await settle();
    vi.spyOn(TestBed.inject(Apis), 'createTask').mockReturnValue(
      throwError(() => new Error('save failed')),
    );
    assignTo('John Doe');
    setField('#task-title', 'Prepare the notes');
    setField('#task-dueDate', '2026-11-20');
    submitDialog();
    await finishDialog();

    expect(text()).toContain('The task could not be added.');
  });

  it('opens a blank task from the shared helper', async () => {
    await settle();
    openNewTask(
      fixture.componentRef.injector,
      TestBed.inject(Apis),
      fixture.componentRef.injector.get(DestroyRef),
      () => undefined,
      () => undefined,
    );
    await fixture.whenStable();

    const select = document.querySelector('#task-assigneeId') as HTMLSelectElement;
    expect(select.value).toBe('user-001');
  });

  async function settle(): Promise<void> {
    fixture.detectChanges();
    flushKnown();
    await fixture.whenStable();
    fixture.detectChanges();
    flushKnown();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function flushKnown(): void {
    for (const request of http.match(() => true)) {
      const url = request.request.url;
      if (url === '/i18n/languages.json') {
        request.flush(languages);
      } else if (url === '/i18n/en.json') {
        request.flush(english);
      } else if (url === '/data/statistics.json') {
        request.flush({ statistics: [], lastUpdated: '2026-10-28' });
      } else if (url === '/data/tasks.json' && tasksFail) {
        request.flush('nope', { status: 500, statusText: 'Error' });
      } else if (url === '/data/tasks.json') {
        request.flush(tasksFile);
      } else {
        request.flush({});
      }
    }
  }

  function text(): string {
    return fixture.nativeElement.textContent ?? '';
  }

  function assignTo(name: string): void {
    const assign = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      button.textContent?.includes(name),
    ) as HTMLButtonElement;
    assign.click();
    fixture.detectChanges();
  }

  function setField(selector: string, value: string): void {
    const field = document.querySelector(selector) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function submitDialog(): void {
    const save = document.querySelector('button.save') as HTMLButtonElement;
    save.click();
    fixture.detectChanges();
  }

  async function finishDialog(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    fixture.detectChanges();
  }

  async function closeDialog(): Promise<void> {
    const cancel = document.querySelector('button.cancel');
    if (!(cancel instanceof HTMLButtonElement)) {
      return;
    }

    cancel.click();
    await finishDialog();
    fixture.detectChanges();
  }
});
