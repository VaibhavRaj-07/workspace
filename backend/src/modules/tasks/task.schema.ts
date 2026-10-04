import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const createTaskSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid project ID').optional(), projectId: z.string().uuid('Invalid project ID').optional() }),
  body: z.object({
    projectId: z.string().uuid('Invalid project ID').optional(),
    title: z.string().min(1, 'Task title is required'),
    description: z.string().optional().nullable(),
    status: z.nativeEnum(TaskStatus).default(TaskStatus.todo),
    priority: z.nativeEnum(TaskPriority).default(TaskPriority.medium),
    assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    position: z.number().optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().uuid().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable(),
    position: z.number().optional(),
    version: z.number().int().positive('Version must be a positive integer').optional(),
  }),
});

export const updateTaskStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    status: z.nativeEnum(TaskStatus),
    version: z.number().int().positive().optional(),
  }),
});

export const assignTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    assigneeId: z.string().uuid().optional().nullable(),
    version: z.number().int().positive().optional(),
  }),
});

export const moveTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    status: z.nativeEnum(TaskStatus).optional(),
    position: z.number(),
    version: z.number().int().positive().optional(),
  }),
});

export const resolveConflictSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    strategy: z.enum(['keep_mine', 'keep_theirs', 'manual']),
    baseVersion: z.number().int().positive(),
    manualData: z
      .object({
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        status: z.nativeEnum(TaskStatus).optional(),
        priority: z.nativeEnum(TaskPriority).optional(),
        assigneeId: z.string().uuid().optional().nullable(),
        dueDate: z.string().datetime().optional().nullable(),
        position: z.number().optional(),
      })
      .optional(),
  }),
});

export const taskQuerySchema = z.object({
  params: z.object({
    projectId: z.string().uuid().optional(),
    id: z.string().uuid().optional(),
  }),
  query: z.object({
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().uuid().optional(),
    dueBefore: z.string().datetime().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
    cursor: z.string().uuid().optional(),
    sortBy: z.enum(['position', 'dueDate', 'createdAt', 'priority', 'status']).default('position'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>['body'];
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>['body'];
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>['body'];
export type AssignTaskInput = z.infer<typeof assignTaskSchema>['body'];
export type MoveTaskInput = z.infer<typeof moveTaskSchema>['body'];
export type ResolveConflictInput = z.infer<typeof resolveConflictSchema>['body'];
export type TaskQueryParams = z.infer<typeof taskQuerySchema>['query'];

