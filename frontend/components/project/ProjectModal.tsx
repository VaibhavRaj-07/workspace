'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BrutalModal } from '@/components/ui/BrutalModal';
import { BrutalInput } from '@/components/ui/BrutalInput';
import { BrutalTextarea } from '@/components/ui/BrutalTextarea';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { api } from '@/lib/api/client';
import { Project } from '@/types/api';
import { toast } from '@/stores/toast-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const projectSchema = z.object({
  name: z.string().min(2, 'Project name is required (min 2 chars)'),
  description: z.string().optional(),
  deadline: z.string().optional(),
  autoCompleteWhenAllDone: z.boolean().default(true),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export interface ProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectToEdit?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  open,
  onOpenChange,
  projectToEdit,
}) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    values: {
      name: projectToEdit?.name || '',
      description: projectToEdit?.description || '',
      deadline: projectToEdit?.deadline
        ? new Date(projectToEdit.deadline).toISOString().split('T')[0]
        : '',
      autoCompleteWhenAllDone: projectToEdit?.autoCompleteWhenAllDone ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ProjectFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined,
        autoCompleteWhenAllDone: values.autoCompleteWhenAllDone,
      };

      if (projectToEdit) {
        return api.projects.update(projectToEdit.id, payload, projectToEdit.version);
      }
      return api.projects.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (projectToEdit) {
        queryClient.invalidateQueries({ queryKey: ['project', projectToEdit.id] });
        toast.success('PROJECT UPDATED', 'Workspace metadata refreshed.');
      } else {
        toast.success('PROJECT CREATED', 'New workspace deployed successfully.');
      }
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(
        projectToEdit ? 'UPDATE FAILED' : 'CREATION FAILED',
        err.message || 'Failed to save project'
      );
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    mutation.mutate(data);
  };

  return (
    <BrutalModal
      open={open}
      onOpenChange={onOpenChange}
      title={projectToEdit ? 'EDIT WORKSPACE PARAMETERS' : 'INITIALIZE NEW WORKSPACE'}
      glyph="▲"
      footer={
        <>
          <BrutalButton variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            CANCEL
          </BrutalButton>
          <BrutalButton
            variant="primary"
            size="sm"
            disabled={mutation.isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {mutation.isPending
              ? 'COMMITTING...'
              : projectToEdit
              ? 'SAVE CHANGES'
              : 'INITIALIZE PROJECT →'}
          </BrutalButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <BrutalInput
          label="WORKSPACE CODENAME / TITLE"
          placeholder="e.g. Distributed Task Orchestrator"
          error={errors.name?.message}
          {...register('name')}
        />

        <BrutalTextarea
          label="MISSION SCOPE / DESCRIPTION"
          placeholder="Describe core project goals and deliverables..."
          rows={3}
          {...register('description')}
        />

        <BrutalInput
          label="TARGET DEADLINE (OPTIONAL)"
          type="date"
          {...register('deadline')}
        />

        <div className="flex items-center gap-3 p-3 border-2 border-ink bg-zinc-100 dark:bg-zinc-800 dark:border-paper">
          <input
            type="checkbox"
            id="autoComplete"
            className="h-4 w-4 border-2 border-ink accent-acid-yellow cursor-pointer"
            {...register('autoCompleteWhenAllDone')}
          />
          <label htmlFor="autoComplete" className="font-mono text-xs font-bold cursor-pointer">
            AUTO-COMPLETE PROJECT WHEN ALL TASKS REACH DONE
          </label>
        </div>
      </form>
    </BrutalModal>
  );
};
