import { z } from 'zod';
import { ProjectRole, ProjectStatus } from '@prisma/client';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters'),
    description: z.string().optional().nullable(),
    deadline: z.string().datetime().optional().nullable(),
    autoCompleteWhenAllDone: z.boolean().default(true),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional().nullable(),
    deadline: z.string().datetime().optional().nullable(),
    status: z.nativeEnum(ProjectStatus).optional(),
    autoCompleteWhenAllDone: z.boolean().optional(),
    version: z.number().int().positive().optional(),
  }),
});

export const addProjectMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    userId: z.string().uuid('Invalid user ID').optional(),
    email: z.string().email('Invalid user email').optional(),
    role: z.nativeEnum(ProjectRole).default(ProjectRole.member),
  }).refine((data) => data.userId || data.email, {
    message: 'Either userId or email must be provided',
  }),
});

export const updateProjectMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    userId: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    role: z.nativeEnum(ProjectRole),
  }),
});

export const projectQuerySchema = z.object({
  query: z.object({
    status: z.nativeEnum(ProjectStatus).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    cursor: z.string().uuid().optional(),
    search: z.string().optional(),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>['body'];
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>['body'];
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>['body'];
export type UpdateProjectMemberInput = z.infer<typeof updateProjectMemberSchema>['body'];
