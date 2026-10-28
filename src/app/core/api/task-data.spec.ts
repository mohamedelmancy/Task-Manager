import { parseStatistics, parseTasks } from './task-data';

const statistic = {
  id: 'stat-001',
  title: 'Total Tasks',
  icon: '📊',
  value: 156,
  change: '+12',
  changeLabel: 'this week',
  changeType: 'positive',
  color: '#1976D2',
};

describe('parseStatistics', () => {
  it('reads the statistics file', () => {
    expect(parseStatistics({ statistics: [statistic], lastUpdated: '2026-10-28' })).toEqual({
      statistics: [statistic],
      lastUpdated: '2026-10-28',
    });
  });

  it('rejects a file that is not an object', () => {
    expect(() => parseStatistics([])).toThrow(/object/);
  });
});

describe('parseTasks', () => {
  const task = {
    id: 'task-001',
    title: 'Design new homepage layout',
    description: 'Create wireframes',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-10-30',
    assignee: {
      id: 'user-001',
      name: 'John Doe',
      avatar: 'JD',
      email: 'john.doe@company.com',
    },
    tags: ['Design'],
    createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-28T00:00:00.000Z',
  };

  it('fills missing overdue and completed fields', () => {
    const parsed = parseTasks({
      tasks: [task],
      meta: { totalCount: 1, lastUpdated: '2026-10-28' },
    });

    expect(parsed.tasks[0]).toMatchObject({ isOverdue: false, completedAt: null });
  });

  it('keeps a completed task date', () => {
    const parsed = parseTasks({
      tasks: [{ ...task, status: 'done', completedAt: '2026-10-28T00:00:00.000Z' }],
      meta: { totalCount: 1, lastUpdated: '2026-10-28' },
    });

    expect(parsed.tasks[0]?.completedAt).toBe('2026-10-28T00:00:00.000Z');
  });

  it('rejects an unknown status', () => {
    expect(() =>
      parseTasks({
        tasks: [{ ...task, status: 'later' }],
        meta: { totalCount: 1, lastUpdated: '2026-10-28' },
      }),
    ).toThrow(/status/);
  });
});
