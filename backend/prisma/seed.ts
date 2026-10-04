import { PrismaClient, ProjectRole, ProjectStatus, TaskPriority, TaskStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { aiClient } from '../src/modules/ai/ai.client.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.idempotencyRecord.deleteMany();
  await prisma.projectEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.taskFieldHistory.deleteMany();
  await prisma.taskEmbedding.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing records');

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('Password123!', saltRounds);

  // 1. Create Users
  const alex = await prisma.user.create({
    data: {
      name: 'Alex Rivers',
      email: 'alex@workspace.dev',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const sarah = await prisma.user.create({
    data: {
      name: 'Sarah Chen',
      email: 'sarah@workspace.dev',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    },
  });

  const rahul = await prisma.user.create({
    data: {
      name: 'Rahul Patel',
      email: 'rahul@workspace.dev',
      passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  console.log(` Created 3 demo users: ${alex.email}, ${sarah.email}, ${rahul.email}`);

  // 2. Create Project 1: NextGen Cloud Workspace Platform
  const now = new Date();
  const deadlineProj1 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const deadlineProj2 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const proj1 = await prisma.project.create({
    data: {
      name: 'NextGen Cloud Workspace Platform',
      description:
        'Enterprise real-time collaborative workspace with conflict-free editing, live cursors, and Kanban automation.',
      ownerId: alex.id,
      deadline: deadlineProj1,
      status: ProjectStatus.active,
      version: 1,
    },
  });

  // Members for Project 1
  await prisma.projectMember.createMany({
    data: [
      { projectId: proj1.id, userId: alex.id, role: ProjectRole.owner },
      { projectId: proj1.id, userId: sarah.id, role: ProjectRole.admin },
      { projectId: proj1.id, userId: rahul.id, role: ProjectRole.member },
    ],
  });

  // Project 2: AI Knowledge Graph Engine
  const proj2 = await prisma.project.create({
    data: {
      name: 'AI-Powered Knowledge Graph Engine',
      description:
        'Distributed semantic indexing pipeline with vector embeddings and multi-tenant search indexing.',
      ownerId: sarah.id,
      deadline: deadlineProj2,
      status: ProjectStatus.active,
      version: 1,
    },
  });

  // Members for Project 2
  await prisma.projectMember.createMany({
    data: [
      { projectId: proj2.id, userId: sarah.id, role: ProjectRole.owner },
      { projectId: proj2.id, userId: alex.id, role: ProjectRole.admin },
      { projectId: proj2.id, userId: rahul.id, role: ProjectRole.viewer },
    ],
  });

  console.log(` Created 2 projects: "${proj1.name}", "${proj2.name}"`);

  // 3. Create Tasks for Project 1 (12 tasks)
  const proj1Tasks = [
    {
      title: 'Architect Optimistic Concurrency Control (OCC) Engine',
      description: 'Implement atomic version checks and automatic field-level merge for non-overlapping edits.',
      status: TaskStatus.done,
      priority: TaskPriority.urgent,
      assigneeId: alex.id,
      createdById: alex.id,
      dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      position: 10000,
    },
    {
      title: 'Implement WebSocket Monotonic Sequence Replay Buffer',
      description: 'Maintain per-project event stream sequence numbers with catch-up replay upon client reconnect.',
      status: TaskStatus.done,
      priority: TaskPriority.high,
      assigneeId: sarah.id,
      createdById: alex.id,
      dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      completedAt: new Date(),
      position: 20000,
    },
    {
      title: 'Real-time Advisory Task Editing Locks (Heartbeat)',
      description: 'Broadcast task:editing:start with 30s auto-expiry timer so peers see live editing indicators.',
      status: TaskStatus.in_progress,
      priority: TaskPriority.high,
      assigneeId: rahul.id,
      createdById: alex.id,
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      position: 30000,
    },
    {
      title: 'Design Kanban Drag-and-Drop Order Re-balancing',
      description: 'Support continuous float positions for zero-reindex drag and drop between swimlanes.',
      status: TaskStatus.in_progress,
      priority: TaskPriority.medium,
      assigneeId: rahul.id,
      createdById: sarah.id,
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      position: 40000,
    },
    {
      title: 'File Attachment Abstraction with MIME Whitelisting',
      description: 'Implement secure multipart upload with 10MB ceiling and fallback from local disk to Supabase.',
      status: TaskStatus.in_review,
      priority: TaskPriority.medium,
      assigneeId: sarah.id,
      createdById: alex.id,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      position: 50000,
    },
    {
      title: 'Background Deadline Notification Cron Job',
      description: 'Check impending deadlines under 24h and overdue items, firing push notifications.',
      status: TaskStatus.in_review,
      priority: TaskPriority.medium,
      assigneeId: alex.id,
      createdById: sarah.id,
      dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      position: 60000,
    },
    {
      title: 'Idempotency-Key Header Request Deduplication',
      description: 'Guarantee at-most-once execution for retried network calls across all POST endpoints.',
      status: TaskStatus.todo,
      priority: TaskPriority.high,
      assigneeId: sarah.id,
      createdById: alex.id,
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      position: 70000,
    },
    {
      title: 'Automated Project Completion State Trigger',
      description: 'Auto-transition project status to completed when all tasks transition to done state.',
      status: TaskStatus.todo,
      priority: TaskPriority.low,
      assigneeId: rahul.id,
      createdById: alex.id,
      dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      position: 80000,
    },
    {
      title: 'Interactive Swagger OpenAPI 3.0 Documentation',
      description: 'Provide live testable schema documentation at /docs with Bearer auth support.',
      status: TaskStatus.todo,
      priority: TaskPriority.medium,
      assigneeId: alex.id,
      createdById: rahul.id,
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      position: 90000,
    },
    {
      title: 'Load Testing: 20 Parallel Concurrent Edits Stress Suite',
      description: 'Validate zero update loss under aggressive OCC conflict scenarios.',
      status: TaskStatus.todo,
      priority: TaskPriority.urgent,
      assigneeId: alex.id,
      createdById: alex.id,
      dueDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
      position: 100000,
    },
  ];

  for (const t of proj1Tasks) {
    const createdTask = await prisma.task.create({
      data: {
        ...t,
        projectId: proj1.id,
        version: 1,
      },
    });

    // Add field history
    await prisma.taskFieldHistory.create({
      data: {
        taskId: createdTask.id,
        fromVersion: 0,
        toVersion: 1,
        changedFields: ['title', 'description', 'status', 'priority', 'assigneeId', 'position'],
        diff: { initial: { to: t } },
        actorId: t.createdById,
      },
    });

    // Add activity log
    await prisma.activityLog.create({
      data: {
        projectId: proj1.id,
        taskId: createdTask.id,
        actorId: t.createdById,
        action: 'TASK_CREATED',
        metadata: { title: t.title, priority: t.priority },
      },
    });

    // Add pre-computed embedding
    const vector = aiClient.generateFallbackVector(`${t.title}\n\n${t.description}`);
    await prisma.taskEmbedding.create({
      data: {
        taskId: createdTask.id,
        vector,
        textHash: 'seed_hash_' + createdTask.id,
      },
    });
  }

  // 4. Create Tasks for Project 2 (6 tasks)
  const proj2Tasks = [
    {
      title: 'Vector Embedding Batch Pipeline',
      description: 'Generate OpenAI text-embedding-3 vectors for knowledge documents in batches of 100.',
      status: TaskStatus.in_progress,
      priority: TaskPriority.urgent,
      assigneeId: sarah.id,
      createdById: sarah.id,
      dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      position: 10000,
    },
    {
      title: 'Hybrid Dense-Sparse Vector Retrieval',
      description: 'Combine BM25 keyword matching with HNSW cosine similarity search.',
      status: TaskStatus.todo,
      priority: TaskPriority.high,
      assigneeId: alex.id,
      createdById: sarah.id,
      dueDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      position: 20000,
    },
    {
      title: 'Multi-Tenant RBAC Graph Filter Layer',
      description: 'Ensure retrieval queries respect project membership and document permissions.',
      status: TaskStatus.todo,
      priority: TaskPriority.medium,
      assigneeId: sarah.id,
      createdById: sarah.id,
      dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      position: 30000,
    },
    {
      title: 'Graph Reranker Evaluation Benchmark',
      description: 'Benchmark Cohere Rerank v3 against cross-encoders for top-10 accuracy.',
      status: TaskStatus.done,
      priority: TaskPriority.low,
      assigneeId: sarah.id,
      createdById: sarah.id,
      dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      position: 40000,
    },
    {
      title: 'Semantic Graph Visualization UI Component',
      description: 'Force-directed graph layout for exploring entity relationships in browser.',
      status: TaskStatus.todo,
      priority: TaskPriority.medium,
      assigneeId: null,
      createdById: sarah.id,
      dueDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      position: 50000,
    },
  ];

  for (const t of proj2Tasks) {
    const createdTask = await prisma.task.create({
      data: {
        ...t,
        projectId: proj2.id,
        version: 1,
      },
    });

    await prisma.taskFieldHistory.create({
      data: {
        taskId: createdTask.id,
        fromVersion: 0,
        toVersion: 1,
        changedFields: ['title', 'description', 'status', 'priority'],
        diff: { initial: { to: t } },
        actorId: t.createdById,
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId: proj2.id,
        taskId: createdTask.id,
        actorId: t.createdById,
        action: 'TASK_CREATED',
        metadata: { title: t.title },
      },
    });

    const vector = aiClient.generateFallbackVector(`${t.title}\n\n${t.description}`);
    await prisma.taskEmbedding.create({
      data: {
        taskId: createdTask.id,
        vector,
        textHash: 'seed_hash_' + createdTask.id,
      },
    });
  }

  console.log(' Created 15+ rich tasks across both projects');

  // 5. Create Comments
  const firstTask = await prisma.task.findFirst({ where: { projectId: proj1.id } });
  if (firstTask) {
    await prisma.comment.createMany({
      data: [
        {
          taskId: firstTask.id,
          authorId: alex.id,
          body: 'OCC versioning ensures that simultaneous updates on different fields will auto-merge smoothly without 409!',
          version: 1,
        },
        {
          taskId: firstTask.id,
          authorId: sarah.id,
          body: 'Tested with 20 concurrent requests. Zero data loss verified!',
          version: 1,
        },
        {
          taskId: firstTask.id,
          authorId: rahul.id,
          body: 'The UI now displays an interactive resolution modal whenever a true conflict occurs.',
          version: 1,
        },
      ],
    });
  }

  // 6. Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: alex.id,
        type: 'PROJECT_INVITATION',
        payload: {
          projectName: 'AI-Powered Knowledge Graph Engine',
          role: 'admin',
          invitedBy: 'Sarah Chen',
        },
      },
      {
        userId: rahul.id,
        type: 'TASK_ASSIGNED',
        payload: {
          taskTitle: 'Real-time Advisory Task Editing Locks (Heartbeat)',
          projectName: 'NextGen Cloud Workspace Platform',
        },
      },
    ],
  });

  console.log('✅ Seed completed successfully! Demo database is ready.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
