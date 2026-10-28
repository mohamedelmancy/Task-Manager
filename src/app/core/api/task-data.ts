import {
  Assignee,
  ChangeType,
  Statistic,
  StatisticsResponse,
  Task,
  TaskPriority,
  TaskStatus,
  TasksResponse,
} from '../../shared/types/task';

const STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];
const PRIORITIES: readonly TaskPriority[] = ['high', 'medium', 'low'];
const CHANGE_TYPES: readonly ChangeType[] = ['positive', 'negative', 'neutral'];

export function parseStatistics(value: unknown): StatisticsResponse {
  const record = readRecord(value, 'Statistics file');
  const statistics = readArray(record, 'statistics').map((item) => parseStatistic(item));
  const lastUpdated = readString(record, 'lastUpdated');

  return { statistics, lastUpdated };
}

export function parseTasks(value: unknown): TasksResponse {
  const record = readRecord(value, 'Tasks file');
  const tasks = readArray(record, 'tasks').map((item) => parseTask(item));
  const meta = readRecord(record['meta'], 'Tasks meta');

  return {
    tasks,
    meta: {
      totalCount: readNumber(meta, 'totalCount'),
      lastUpdated: readString(meta, 'lastUpdated'),
    },
  };
}

function parseStatistic(value: unknown): Statistic {
  const record = readRecord(value, 'Statistic');

  return {
    id: readString(record, 'id'),
    title: readString(record, 'title'),
    icon: readString(record, 'icon'),
    value: readNumber(record, 'value'),
    change: readString(record, 'change'),
    changeLabel: readString(record, 'changeLabel'),
    changeType: readChoice(record, 'changeType', CHANGE_TYPES),
    color: readString(record, 'color'),
  };
}

function parseTask(value: unknown): Task {
  const record = readRecord(value, 'Task');
  const completedAt = record['completedAt'];

  return {
    id: readString(record, 'id'),
    title: readString(record, 'title'),
    description: readString(record, 'description'),
    status: readChoice(record, 'status', STATUSES),
    priority: readChoice(record, 'priority', PRIORITIES),
    dueDate: readString(record, 'dueDate'),
    isOverdue: record['isOverdue'] === true,
    completedAt: typeof completedAt === 'string' ? completedAt : null,
    assignee: parseAssignee(record['assignee']),
    tags: readArray(record, 'tags').map((tag) => {
      if (typeof tag !== 'string') {
        throw new Error('Task tag must be a string');
      }
      return tag;
    }),
    createdAt: readString(record, 'createdAt'),
    updatedAt: readString(record, 'updatedAt'),
  };
}

function parseAssignee(value: unknown): Assignee {
  const record = readRecord(value, 'Assignee');

  return {
    id: readString(record, 'id'),
    name: readString(record, 'name'),
    avatar: readString(record, 'avatar'),
    email: readString(record, 'email'),
  };
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function readArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(`${key} must be a list`);
  }

  return value;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string`);
  }

  return value;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number') {
    throw new Error(`${key} must be a number`);
  }

  return value;
}

function readChoice<T extends string>(
  record: Record<string, unknown>,
  key: string,
  choices: readonly T[],
): T {
  const value = record[key];
  const match = choices.find((choice) => choice === value);
  if (!match) {
    throw new Error(`${key} is invalid`);
  }

  return match;
}
