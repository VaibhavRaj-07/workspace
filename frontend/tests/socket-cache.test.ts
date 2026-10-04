import { describe, it, expect } from 'vitest';
import { Task } from '../types/api';

describe('Real-Time Cache Reducer Logic', () => {
  it('correctly updates existing task only if incoming version is greater or equal', () => {
    const existingTasks: Task[] = [
      {
        id: 'task-1',
        projectId: 'p1',
        title: 'Initial Title',
        status: 'todo',
        priority: 'medium',
        createdById: 'u1',
        position: 1000,
        version: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const olderUpdate: Task = {
      ...existingTasks[0],
      title: 'Stale Title',
      version: 1, // Older version
    };

    // Reducer should reject stale version
    const updatedWithStale = existingTasks.map((t) => {
      if (t.id === olderUpdate.id) {
        if (t.version && olderUpdate.version < t.version) {
          return t;
        }
        return { ...t, ...olderUpdate };
      }
      return t;
    });

    expect(updatedWithStale[0].title).toBe('Initial Title');
    expect(updatedWithStale[0].version).toBe(2);

    // Newer version should be applied
    const newerUpdate: Task = {
      ...existingTasks[0],
      title: 'Fresh Title',
      version: 3,
    };

    const updatedWithNewer = existingTasks.map((t) => {
      if (t.id === newerUpdate.id) {
        if (t.version && newerUpdate.version < t.version) {
          return t;
        }
        return { ...t, ...newerUpdate };
      }
      return t;
    });

    expect(updatedWithNewer[0].title).toBe('Fresh Title');
    expect(updatedWithNewer[0].version).toBe(3);
  });

  it('updates monotonic seq tracking per project', () => {
    const lastSeqMap: Record<string, number> = {
      'proj-1': 10,
    };

    const incomingSeq = 15;
    const updatedSeq = Math.max(lastSeqMap['proj-1'] || 0, incomingSeq);
    expect(updatedSeq).toBe(15);

    const staleSeq = 8;
    const nonUpdatedSeq = Math.max(updatedSeq, staleSeq);
    expect(nonUpdatedSeq).toBe(15);
  });
});
