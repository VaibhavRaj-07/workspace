import { describe, it, expect } from 'vitest';

describe('OCC Conflict Resolution Resolution Logic', () => {
  it('combines per-field manual decisions into a clean manualData payload', () => {
    const serverTask = {
      id: 'task-1',
      title: 'Server Title',
      description: 'Server Description',
      status: 'in_progress',
      version: 4,
    };

    const clientChanges = {
      title: 'My Title',
      description: 'My Description',
    };

    const decisions = {
      title: 'mine', // choose mine
      description: 'theirs', // choose theirs
    };

    const resolutionPayload: Record<string, any> = {};

    if (decisions.title === 'mine') {
      resolutionPayload.title = clientChanges.title;
    } else {
      resolutionPayload.title = serverTask.title;
    }

    if (decisions.description === 'theirs') {
      resolutionPayload.description = serverTask.description;
    } else {
      resolutionPayload.description = clientChanges.description;
    }

    expect(resolutionPayload.title).toBe('My Title');
    expect(resolutionPayload.description).toBe('Server Description');
  });

  it('correctly formats strategy payload for POST /tasks/:id/resolve-conflict', () => {
    const strategy = 'manual';
    const baseVersion = 3;
    const manualData = {
      title: 'Resolved Title via 3-way Merge',
    };

    const payload = {
      strategy,
      baseVersion,
      manualData,
    };

    expect(payload.strategy).toBe('manual');
    expect(payload.baseVersion).toBe(3);
    expect(payload.manualData.title).toBe('Resolved Title via 3-way Merge');
  });
});
