import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

describe('Dashboard & Metrics API Tests', () => {
  let userToken = '';
  let userId = '';
  let projectId = '';

  beforeAll(async () => {
    const u = await request(app).post('/api/v1/auth/register').send({
      name: 'Dashboard User',
      email: `dash_u_${Date.now()}@workspace.dev`,
      password: 'Password123!',
    });
    userToken = u.body.data.tokens.accessToken;
    userId = u.body.data.user.id;

    const p = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Dashboard Metrics Project',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
    projectId = p.body.data.id;

    // Create 3 tasks (1 done, 2 todo)
    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Task 1', status: 'done', assigneeId: userId });

    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Task 2', status: 'todo', assigneeId: userId });

    await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Task 3', status: 'todo', assigneeId: null });
  });

  afterAll(async () => {
    if (projectId) {
      await prisma.project.deleteMany({ where: { id: projectId } });
    }
    await prisma.$disconnect();
  });

  it('GET /api/v1/dashboard/overview - should aggregate user task stats', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/overview')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalAssignedTasks).toBe(2);
    expect(res.body.data.tasksByStatus.done).toBe(1);
    expect(res.body.data.tasksByStatus.todo).toBe(1);
  });

  it('GET /api/v1/projects/:id/progress - should calculate progress % and breakdown', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/progress`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalTasks).toBe(3);
    expect(res.body.data.doneTasks).toBe(1);
    expect(res.body.data.completionPercentage).toBe(33); // 1 out of 3 = 33%
    expect(res.body.data.daysToDeadline).toBeGreaterThan(0);
  });

  it('GET /api/v1/projects/:id/activity - should return paginated activity log', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/activity`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
