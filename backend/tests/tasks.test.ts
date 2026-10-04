import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

describe('Tasks API & Kanban Operations Tests', () => {
  let userToken = '';
  let userId = '';
  let projectId = '';
  let taskId = '';

  beforeAll(async () => {
    const u = await request(app).post('/api/v1/auth/register').send({
      name: 'Task Tester',
      email: `task_test_${Date.now()}@workspace.dev`,
      password: 'Password123!',
    });
    userToken = u.body.data.tokens.accessToken;
    userId = u.body.data.user.id;

    const p = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Task Test Project' });
    projectId = p.body.data.id;
  });

  afterAll(async () => {
    if (projectId) {
      await prisma.project.deleteMany({ where: { id: projectId } });
    }
    await prisma.$disconnect();
  });

  it('POST /api/v1/projects/:id/tasks - should create task with default position and version 1', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Complete Kanban DnD',
        description: 'Implement drag and drop support',
        status: 'todo',
        priority: 'high',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.version).toBe(1);
    expect(res.body.data.position).toBeGreaterThan(0);
    taskId = res.body.data.id;
  });

  it('GET /api/v1/projects/:id/tasks - should list tasks with status and priority filters', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?status=todo&priority=high`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].id).toBe(taskId);
  });

  it('PATCH /api/v1/tasks/:id/status - should update status and record completion timestamp on done', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'done', version: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('done');
    expect(res.body.data.completedAt).toBeDefined();
    expect(res.body.data.version).toBe(2);
  });

  it('PATCH /api/v1/tasks/:id/move - should update status and position for kanban drag-and-drop', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/move`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        status: 'in_progress',
        position: 12500.5,
        version: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
    expect(res.body.data.position).toBe(12500.5);
    expect(res.body.data.version).toBe(3);
  });

  it('PATCH /api/v1/tasks/:id/assign - should assign task to user', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}/assign`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        assigneeId: userId,
        version: 3,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.assigneeId).toBe(userId);
    expect(res.body.data.version).toBe(4);
  });

  it('DELETE /api/v1/tasks/:id - should delete task cleanly', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });
});
