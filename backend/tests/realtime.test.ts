import { describe, it, expect } from 'vitest';
import { eventBufferService } from '../src/realtime/event.buffer.js';
import { presenceService } from '../src/realtime/presence.service.js';

describe('Realtime Sequence & Presence Layer Tests', () => {
  const dummyProjectId = 'test-proj-' + Date.now();

  it('Event Buffer - should generate monotonic sequence numbers', async () => {
    const seq1 = await eventBufferService.getNextSeq(dummyProjectId);
    const seq2 = await eventBufferService.getNextSeq(dummyProjectId);
    const seq3 = await eventBufferService.getNextSeq(dummyProjectId);

    expect(seq2).toBe(seq1 + 1);
    expect(seq3).toBe(seq2 + 1);
  });

  it('Presence Service - should manage online project users and advisory locks', () => {
    const user1 = { id: 'u1', name: 'Alice', avatarUrl: null };
    const user2 = { id: 'u2', name: 'Bob', avatarUrl: null };

    // Add users
    const usersAfterAlice = presenceService.addUserToProject(dummyProjectId, user1, 'socket-1');
    expect(usersAfterAlice.length).toBe(1);

    const usersAfterBob = presenceService.addUserToProject(dummyProjectId, user2, 'socket-2');
    expect(usersAfterBob.length).toBe(2);

    // Advisory Task Locking
    const lockResult1 = presenceService.startEditingTask('task-123', user1);
    expect(lockResult1.success).toBe(true);
    expect(lockResult1.currentEditor?.userId).toBe('u1');

    // Competing lock attempt by Bob while Alice holds it
    const lockResult2 = presenceService.startEditingTask('task-123', user2);
    expect(lockResult2.success).toBe(false);
    expect(lockResult2.currentEditor?.userId).toBe('u1');

    // Alice releases lock
    const released = presenceService.stopEditingTask('task-123', 'u1');
    expect(released).toBe(true);

    // Now Bob can acquire lock
    const lockResult3 = presenceService.startEditingTask('task-123', user2);
    expect(lockResult3.success).toBe(true);
  });
});
