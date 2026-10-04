'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BrutalModal } from '@/components/ui/BrutalModal';
import { BrutalInput } from '@/components/ui/BrutalInput';
import { BrutalTextarea } from '@/components/ui/BrutalTextarea';
import { BrutalSelect } from '@/components/ui/BrutalSelect';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { api } from '@/lib/api/client';
import { TaskStatus, TaskPriority, AssigneeCandidate, SimilarTaskMatch } from '@/types/api';
import { toast } from '@/stores/toast-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, AlertTriangle, ArrowRight, Eye, Check } from 'lucide-react';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

export interface CreateTaskModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members?: any[];
  defaultStatus?: TaskStatus;
  onTaskCreated?: (taskId: string) => void;
  onOpenExistingTask?: (taskId: string) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  projectId,
  open,
  onOpenChange,
  members = [],
  defaultStatus = 'todo',
  onTaskCreated,
  onOpenExistingTask,
}) => {
  const queryClient = useQueryClient();

  // Smart Assignee & Duplicate warning states
  const [smartCandidates, setSmartCandidates] = useState<AssigneeCandidate[]>([]);
  const [duplicateMatches, setDuplicateMatches] = useState<SimilarTaskMatch[]>([]);
  const [dismissDuplicate, setDismissDuplicate] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: defaultStatus,
      priority: 'medium',
      assigneeId: '',
      dueDate: '',
    },
  });

  const watchedTitle = watch('title');
  const watchedDescription = watch('description');
  const watchedPriority = watch('priority');

  // Debounced duplicate & smart assignee checks
  useEffect(() => {
    if (!watchedTitle || watchedTitle.trim().length < 4) {
      setSmartCandidates([]);
      setDuplicateMatches([]);
      return;
    }

    setDismissDuplicate(false);

    const timer = setTimeout(async () => {
      // 1. Check Duplicates (ML 384-dim embeddings cosine similarity)
      try {
        const dupRes = await api.ai.checkDuplicates(projectId, {
          title: watchedTitle,
          description: watchedDescription || undefined,
          threshold: 0.70,
        });
        if (Array.isArray(dupRes)) {
          setDuplicateMatches(dupRes);
        }
      } catch {
        setDuplicateMatches([]);
      }

      // 2. Suggest Smart Assignee
      try {
        const assRes = await api.ai.suggestAssignee(projectId, {
          title: watchedTitle,
          description: watchedDescription || undefined,
          priority: watchedPriority as TaskPriority,
        });
        if (Array.isArray(assRes)) {
          setSmartCandidates(assRes);
        }
      } catch {
        setSmartCandidates([]);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [watchedTitle, watchedDescription, watchedPriority, projectId]);

  const mutation = useMutation({
    mutationFn: (values: CreateTaskFormValues) =>
      api.tasks.create(projectId, {
        title: values.title,
        description: values.description || undefined,
        status: values.status as TaskStatus,
        priority: values.priority as TaskPriority,
        assigneeId: values.assigneeId || null,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      }),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      toast.success('TASK CREATED', `Task "${newTask.title}" added to board.`);
      reset();
      onOpenChange(false);
      if (onTaskCreated) onTaskCreated(newTask.id);
    },
    onError: (err: any) => {
      toast.error('CREATION FAILED', err.message || 'Could not create task');
    },
  });

  const onSubmit = (data: CreateTaskFormValues) => {
    mutation.mutate(data);
  };

  return (
    <BrutalModal
      open={open}
      onOpenChange={onOpenChange}
      title="DEPLOY NEW TASK TO WORKSPACE"
      glyph="+"
      maxWidth="xl"
      footer={
        <>
          <BrutalButton variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            CANCEL
          </BrutalButton>
          <BrutalButton
            variant="primary"
            size="md"
            disabled={mutation.isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {mutation.isPending ? 'DEPLOYING...' : 'CREATE TASK →'}
          </BrutalButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* DUPLICATE WARNING ALERT BANNER */}
        {duplicateMatches.length > 0 && !dismissDuplicate && (
          <div className="p-3 border-3 border-ink bg-hazard-orange/20 dark:bg-hazard-orange/10 font-mono text-xs space-y-2 animate-stamp">
            <div className="flex items-center justify-between font-black text-ink dark:text-paper">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-hazard-orange" />
                <span>⚠ SIMILAR TASK DETECTED ({duplicateMatches.length} MATCHES)</span>
              </div>
              <button
                type="button"
                onClick={() => setDismissDuplicate(true)}
                className="text-[10px] uppercase underline text-zinc-500 hover:text-ink"
              >
                DISMISS
              </button>
            </div>

            <div className="space-y-1.5">
              {duplicateMatches.slice(0, 2).map((dup) => (
                <div
                  key={dup.id}
                  className="p-2 bg-white dark:bg-zinc-900 border-2 border-ink flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold truncate">{dup.title}</span>
                    <span className="text-[10px] text-zinc-500">
                      STATUS: {dup.status.toUpperCase()} {'//'} SIMILARITY: {dup.similarityPercentage}%
                    </span>
                  </div>

                  {onOpenExistingTask && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenExistingTask(dup.id);
                      }}
                      className="px-2 py-1 bg-acid-yellow text-ink border border-ink text-[10px] font-black uppercase shrink-0"
                    >
                      OPEN TASK ↗
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <BrutalInput
          label="TASK TITLE"
          placeholder="e.g. Implement Monotonic Sequence Tracking"
          error={errors.title?.message}
          {...register('title')}
        />

        <BrutalTextarea
          label="DESCRIPTION / SCOPE"
          placeholder="Detailed parameters and implementation notes..."
          rows={3}
          {...register('description')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BrutalSelect
            label="STATUS"
            defaultValue={defaultStatus}
            {...register('status')}
            options={[
              { value: 'todo', label: 'TODO' },
              { value: 'in_progress', label: 'IN PROGRESS' },
              { value: 'in_review', label: 'IN REVIEW' },
              { value: 'done', label: 'DONE' },
            ]}
          />

          <BrutalSelect
            label="PRIORITY"
            defaultValue="medium"
            {...register('priority')}
            options={[
              { value: 'low', label: 'LOW' },
              { value: 'medium', label: 'MEDIUM' },
              { value: 'high', label: 'HIGH' },
              { value: 'urgent', label: 'URGENT' },
            ]}
          />
        </div>

        {/* Assignee & Smart Suggestion Chips */}
        <div className="space-y-2">
          <BrutalSelect label="ASSIGNEE" {...register('assigneeId')}>
            <option value="">UNASSIGNED</option>
            {members.map((m: any) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name} ({m.role.toUpperCase()})
              </option>
            ))}
          </BrutalSelect>

          {smartCandidates.length > 0 && (
            <div className="p-2 border-2 border-ink bg-acid-yellow/20 dark:bg-zinc-800 space-y-1 font-mono text-xs">
              <span className="font-bold text-[11px] text-zinc-600 dark:text-zinc-400">
                ✨ SMART ASSIGNEE RECOMMENDATIONS:
              </span>
              <div className="flex flex-wrap gap-2">
                {smartCandidates.slice(0, 3).map((cand) => (
                  <button
                    key={cand.userId}
                    type="button"
                    onClick={() => {
                      setValue('assigneeId', cand.userId);
                      toast.info('ASSIGNEE SELECTED', `Assigned to ${cand.name}`);
                    }}
                    className="px-2 py-1 bg-white hover:bg-acid-yellow text-ink border-2 border-ink text-[10px] font-black uppercase flex items-center gap-1 shadow-brutal-sm"
                  >
                    <span>{cand.name.split(' ')[0]}</span>
                    <span className="bg-ink text-acid-yellow px-1">{cand.fitPercentage}% FIT</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <BrutalInput label="TARGET DUE DATE" type="date" {...register('dueDate')} />
      </form>
    </BrutalModal>
  );
};
