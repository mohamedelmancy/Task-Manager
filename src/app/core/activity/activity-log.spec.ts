import { ActivityLog, ActivitySnapshot } from './activity-log';

describe('ActivityLog', () => {
  beforeEach(() => localStorage.clear());

  it('keeps a saved change after a new log is created', () => {
    const log = new ActivityLog();
    log.record('created', snapshot('Write notes'));
    log.record('updated', snapshot('Write the notes'), snapshot('Write notes'));

    const saved = new ActivityLog();
    expect(saved.activities().map((entry) => entry.action)).toEqual(['updated', 'created']);
    expect(saved.activities()[0]?.title).toBe('Write the notes');
    expect(saved.activities()[0]?.changes).toEqual([
      { field: 'title', before: 'Write notes', after: 'Write the notes' },
    ]);
  });

  it('fills history from tasks only when nothing is saved yet', () => {
    const log = new ActivityLog();
    log.remember([
      { id: 'task-002', title: 'Second', updatedAt: '2026-10-29T00:00:00.000Z' },
      { id: 'task-001', title: 'First', updatedAt: '2026-10-30T00:00:00.000Z' },
    ]);
    log.remember([{ id: 'task-003', title: 'Ignored', updatedAt: '2026-10-31T00:00:00.000Z' }]);

    expect(log.activities().map((entry) => entry.title)).toEqual(['First', 'Second']);
  });
});

function snapshot(title: string): ActivitySnapshot {
  return {
    id: 'task-001',
    title,
    description: 'Notes',
    priority: 'medium',
    status: 'todo',
    dueDate: '2026-11-01',
    assigneeName: 'John Doe',
  };
}
