import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

describe('Comments API Tests', () => {
  let userToken = '';
  let otherUserToken = '';
  let projectId = '';
  let taskId = '';
  let commentId = '';

  beforeAll(async () => {
    const u1 = await request(app).post('/api/v1/auth/register').send({
      name: 'Author One',
      email: `c_author1_${Date.now()}@workspace.dev`,
      password: 'Password123!',
    });
    userToken = u1.body.data.tokens.accessToken;

    const u2 = await request(app).post('/api/v1/auth/register').send({
      name: 'Author Two',
      email: `c_author2_${Date.now()}@workspace.dev`,
      password: 'Password123!',
    });
    otherUserToken = u2.body.data.tokens.accessToken;

    const p = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Comment Test Project' });
    projectId = p.body.data.id;

    const t = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Task for comments' });
    taskId = t.body.data.id;
  });

  afterAll(async () => {
    if (projectId) {
      await prisma.project.deleteMany({ where: { id: projectId } });
    }
    await prisma.$disconnect();
  });

  it('POST /api/v1/tasks/:id/comments - should create comment', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ body: 'First feedback on this task' });

    expect(res.status).toBe(201);
    expect(res.body.data.body).toBe('First feedback on this task');
    expect(res.body.data.version).toBe(1);
    commentId = res.body.data.id;
  });

  it('GET /api/v1/tasks/:id/comments - should list comments for task', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].id).toBe(commentId);
  });

  it('PATCH /api/v1/comments/:id - should allow author to update with OCC', async () => {
    const res = await request(app)
      .patch(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ body: 'Updated comment text', version: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.body).toBe('Updated comment text');
    expect(res.body.data.version).toBe(2);
  });

  it('PATCH /api/v1/comments/:id - should reject non-author edit', async () => {
    const res = await request(app)
      .patch(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ body: 'Unauthorized edit', version: 2 });

    expect(res.status).toBe(403);
  });
});
