import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

describe('Projects & RBAC API Tests', () => {
  let ownerToken = '';
  let memberToken = '';
  let viewerToken = '';
  let outsiderToken = '';

  let ownerId = '';
  let memberId = '';
  let viewerId = '';
  let outsiderId = '';

  let testProjectId = '';

  beforeAll(async () => {
    // Register test users
    const registerUser = async (name: string, email: string) => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name,
        email,
        password: 'Password123!',
      });
      return { token: res.body.data.tokens.accessToken, user: res.body.data.user };
    };

    const u1 = await registerUser('Project Owner', `p_owner_${Date.now()}@workspace.dev`);
    const u2 = await registerUser('Project Member', `p_member_${Date.now()}@workspace.dev`);
    const u3 = await registerUser('Project Viewer', `p_viewer_${Date.now()}@workspace.dev`);
    const u4 = await registerUser('Project Outsider', `p_outsider_${Date.now()}@workspace.dev`);

    ownerToken = u1.token;
    ownerId = u1.user.id;

    memberToken = u2.token;
    memberId = u2.user.id;

    viewerToken = u3.token;
    viewerId = u3.user.id;

    outsiderToken = u4.token;
    outsiderId = u4.user.id;
  });

  afterAll(async () => {
    if (testProjectId) {
      await prisma.project.deleteMany({ where: { id: testProjectId } });
    }
    await prisma.$disconnect();
  });

  it('POST /api/v1/projects - should create a project with creator as owner', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Workspace Alpha',
        description: 'Testing RBAC and Project flow',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Workspace Alpha');
    testProjectId = res.body.data.id;
  });

  it('POST /api/v1/projects/:id/members - owner should be able to add member and viewer', async () => {
    // Add member
    const res1 = await request(app)
      .post(`/api/v1/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: memberId,
        role: 'member',
      });
    expect(res1.status).toBe(201);

    // Add viewer
    const res2 = await request(app)
      .post(`/api/v1/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: viewerId,
        role: 'viewer',
      });
    expect(res2.status).toBe(201);
  });

  it('GET /api/v1/projects - user should only see projects they belong to', async () => {
    const resMember = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(resMember.status).toBe(200);
    expect(resMember.body.data.some((p: any) => p.id === testProjectId)).toBe(true);

    const resOutsider = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(resOutsider.status).toBe(200);
    expect(resOutsider.body.data.some((p: any) => p.id === testProjectId)).toBe(false);
  });

  it('PATCH /api/v1/projects/:id - viewer should be forbidden from updating project', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${testProjectId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Hacked Name' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('PATCH /api/v1/projects/:id - owner should update project successfully with version bump', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${testProjectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Workspace Alpha (Renamed)', version: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Workspace Alpha (Renamed)');
    expect(res.body.data.version).toBe(2);
  });
});
