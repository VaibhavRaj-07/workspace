import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

describe('OCC & Concurrency Safety Engine Tests', () => {
  let user1Token = '';
  let user2Token = '';
  let projectId = '';
  let testTaskId = '';

  beforeAll(async () => {
    // Register test users
    const u1 = await request(app).post('/api/v1/auth/register').send({
      name: 'User One',
      email: `occ_u1_${Date.now()}@workspace.dev`,
      password: 'Password123!',
    });
    user1Token = u1.body.data.tokens.accessToken;

    const u2 = await request(app).post('/api/v1/auth/register').send({
      name: 'User Two',
      email: `occ_u2_${Date.now()}@workspace.dev`,
      password: 'Password123!',
    });
    user2Token = u2.body.data.tokens.accessToken;

    // Create project
    const projRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'OCC Concurrency Test Project' });
    projectId = projRes.body.data.id;

    // Add user 2 to project
    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ userId: u2.body.data.user.id, role: 'member' });

    // Create test task (starts at version 1)
    const taskRes = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Initial Task Title',
        description: 'Initial Description',
        status: 'todo',
        priority: 'low',
        position: 1000,
      });
    testTaskId = taskRes.body.data.id;
  });

  afterAll(async () => {
    if (projectId) {
      await prisma.project.deleteMany({ where: { id: projectId } });
    }
    await prisma.$disconnect();
  });

  it('1. Atomic update matching version - should bump version to 2', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Updated Title by User 1',
        version: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Updated Title by User 1');
    expect(res.body.data.version).toBe(2);
  });

  it('2. Field-level safe auto-merge: non-overlapping field updates should merge cleanly', async () => {
    // Current task is at version 2 (title changed).
    // User 2 has cached version 1 and submits an update to 'priority' and 'description' (which were untouched in v2)
    const res = await request(app)
      .patch(`/api/v1/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        description: 'New Description added by User 2',
        priority: 'urgent',
        version: 1, // User 2 is at v1
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Preserves User 1's title change AND applies User 2's description & priority
    expect(res.body.data.title).toBe('Updated Title by User 1');
    expect(res.body.data.description).toBe('New Description added by User 2');
    expect(res.body.data.priority).toBe('urgent');
    expect(res.body.data.version).toBe(3); // Bumped to 3
  });

  it('3. Overlapping field edits - should return HTTP 409 VERSION_CONFLICT with full conflict details', async () => {
    // Current task is at version 3 (description was modified between v1 and v3).
    // User 1 sends an update to 'description' based on old version 1.
    const res = await request(app)
      .patch(`/api/v1/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        description: 'Conflicting description from old v1',
        version: 1,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VERSION_CONFLICT');
    expect(res.body.error.details.currentVersion).toBe(3);
    expect(res.body.error.details.conflictingFields).toContain('description');
    expect(res.body.error.details.currentTask).toBeDefined();
    expect(res.body.error.details.yourChanges).toBeDefined();
  });

  it('4. POST /tasks/:id/resolve-conflict - manual conflict resolution strategy', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${testTaskId}/resolve-conflict`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        strategy: 'manual',
        baseVersion: 3,
        manualData: {
          title: 'Manually Resolved Title',
          description: 'Merged Description (User1 + User2)',
          status: 'in_progress',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Manually Resolved Title');
    expect(res.body.data.version).toBe(4);
  });

  it('5. ★ CONCURRENCY STRESS TEST: 20 parallel updates on one task (No silent lost updates)', async () => {
    // Fetch latest task version
    const latestTaskRes = await request(app)
      .get(`/api/v1/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${user1Token}`);

    const baseVersion = latestTaskRes.body.data.version;
    const NUM_REQUESTS = 20;

    // Fire 20 parallel requests with competing updates based on the same baseVersion
    const promises = Array.from({ length: NUM_REQUESTS }, (_, index) => {
      return request(app)
        .patch(`/api/v1/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: `Concurrent Title Edit #${index + 1}`,
          version: baseVersion,
        });
    });

    const results = await Promise.all(promises);

    let successCount = 0;
    let conflict409Count = 0;

    for (const r of results) {
      if (r.status === 200) {
        successCount++;
        expect(r.body.data.version).toBeGreaterThan(baseVersion);
      } else if (r.status === 409) {
        conflict409Count++;
        expect(r.body.error.code).toBe('VERSION_CONFLICT');
      } else {
        throw new Error(`Unexpected status code: ${r.status}`);
      }
    }

    // Exactly one of the overlapping edits must succeed as the first committer;
    // all subsequent 19 competing edits on the exact same field ('title') must get 409 Conflict.
    expect(successCount).toBe(1);
    expect(conflict409Count).toBe(NUM_REQUESTS - 1);

    // Verify database state is consistent
    const finalTask = await prisma.task.findUnique({ where: { id: testTaskId } });
    expect(finalTask?.version).toBe(baseVersion + 1);
  });
});
