import { z } from 'zod';

export const createCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
  body: z.object({
    body: z.string().min(1, 'Comment body cannot be empty'),
  }),
});

export const updateCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid comment ID'),
  }),
  body: z.object({
    body: z.string().min(1, 'Comment body cannot be empty'),
    version: z.number().int().positive().optional(),
  }),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>['body'];
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>['body'];
