import { z } from 'zod';
import { TaskPriority } from '@prisma/client';

export const aiMergeSuggestionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    conflicts: z.record(
      z.string(),
      z.object({
        baseValue: z.string().optional().nullable(),
        myValue: z.string().optional().nullable(),
        theirValue: z.string().optional().nullable(),
      })
    ),
    baseVersion: z.number().int().positive().optional(),
  }),
});

export const checkDuplicatesSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    title: z.string().min(1, 'Task title is required'),
    description: z.string().optional().nullable(),
    threshold: z.number().min(0).max(1).optional(),
  }),
});

export const suggestAssigneeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  query: z.object({
    title: z.string().min(1, 'Task title is required'),
    description: z.string().optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
  }),
});

export const taskRiskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
});

export const projectRiskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
});
