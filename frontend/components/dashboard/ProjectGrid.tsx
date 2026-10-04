'use client';

import React from 'react';
import Link from 'next/link';
import { Project } from '@/types/api';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { formatDate } from '@/lib/utils';
import { FolderKanban, Users, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export const ProjectGrid: React.FC<{
  projects: Project[];
  onCreateProject?: () => void;
}> = ({ projects, onCreateProject }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-ink dark:text-paper" />
          <h3 className="font-display text-2xl uppercase tracking-tight">
            ACTIVE WORKSPACES ({projects.length})
          </h3>
        </div>
        {onCreateProject && (
          <BrutalButton variant="primary" size="sm" onClick={onCreateProject}>
            + NEW PROJECT
          </BrutalButton>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const totalTasks = project._count?.tasks || 0;
          const totalMembers = project._count?.members || 0;

          // Calculate deadline status
          const now = new Date();
          const deadline = project.deadline ? new Date(project.deadline) : null;
          const isOverdue = deadline ? deadline.getTime() < now.getTime() && project.status !== 'completed' : false;
          const daysLeft = deadline
            ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <Link key={project.id} href={`/projects/${project.id}`} className="group">
              <BrutalCard
                headerTitle={project.name}
                headerGlyph="arrow"
                headerBg={project.status === 'completed' ? 'green' : 'yellow'}
                hoverElevate
                className="h-full flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Status & Deadline Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <StickerBadge
                      variant={
                        project.status === 'completed'
                          ? 'green'
                          : project.status === 'archived'
                          ? 'paper'
                          : 'yellow'
                      }
                      rotate="-1"
                    >
                      {project.status.toUpperCase()}
                    </StickerBadge>

                    {daysLeft !== null && (
                      <StickerBadge
                        variant={isOverdue ? 'red' : daysLeft <= 3 ? 'orange' : 'cyan'}
                        rotate="1"
                      >
                        {isOverdue ? '⚠ OVERDUE' : `${daysLeft}D REMAINING`}
                      </StickerBadge>
                    )}
                  </div>

                  <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 min-h-[32px]">
                    {project.description || 'No description provided.'}
                  </p>

                  {/* Progress Bar (Sample estimated 60% if count > 0) */}
                  <div className="space-y-1">
                    <ProgressBar
                      value={project.status === 'completed' ? 100 : totalTasks > 0 ? 50 : 0}
                      color={project.status === 'completed' ? 'green' : 'yellow'}
                      segments={8}
                      size="sm"
                    />
                  </div>
                </div>

                {/* Footer specs */}
                <div className="pt-4 mt-4 border-t-2 border-ink/10 flex items-center justify-between font-mono text-xs font-bold">
                  <div className="flex items-center gap-3 text-zinc-500">
                    <span className="flex items-center gap-1">
                      <span>✓</span> {totalTasks} TASKS
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {totalMembers}
                    </span>
                  </div>
                  <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1 text-ink dark:text-paper font-black">
                    ENTER ROOM <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </BrutalCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
