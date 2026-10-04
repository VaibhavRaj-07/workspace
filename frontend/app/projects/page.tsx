'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { ProjectGrid } from '@/components/dashboard/ProjectGrid';
import { ProjectModal } from '@/components/project/ProjectModal';
import { BrutalInput } from '@/components/ui/BrutalInput';
import { BrutalSelect } from '@/components/ui/BrutalSelect';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { FolderKanban, Plus, Search, Filter } from 'lucide-react';

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', statusFilter, search],
    queryFn: () =>
      api.projects.list({
        status: statusFilter || undefined,
        search: search || undefined,
      }),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Header */}
      <div className="border-4 border-ink bg-paper p-6 shadow-brutal dark:bg-zinc-900 dark:border-paper flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="micro-label text-zinc-700 dark:text-zinc-300 font-bold">WORKSPACE REGISTRY</span>
            <StickerBadge variant="cyan" size="sm">
              {projects.length} TOTAL
            </StickerBadge>
          </div>
          <h1 className="font-display text-4xl uppercase tracking-tight text-ink dark:text-paper">
            ALL PROJECTS
          </h1>
        </div>

        <BrutalButton variant="primary" size="md" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> CREATE NEW PROJECT
        </BrutalButton>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 border-3 border-ink bg-white shadow-brutal-sm dark:bg-zinc-950 dark:border-paper">
        <div className="sm:col-span-8 flex items-center gap-2">
          <Search className="h-4 w-4 text-zinc-400 shrink-0 ml-2" />
          <input
            type="text"
            placeholder="Search projects by codename or scope..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent font-mono text-xs text-ink outline-none dark:text-paper"
          />
        </div>

        <div className="sm:col-span-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-paper border-2 border-ink font-mono text-xs font-bold px-2 py-1 uppercase dark:bg-zinc-800 dark:border-paper"
          >
            <option value="">ALL STATUSES</option>
            <option value="active">ACTIVE</option>
            <option value="completed">COMPLETED</option>
            <option value="archived">ARCHIVED</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <ProjectGrid projects={projects} onCreateProject={() => setIsCreateOpen(true)} />
      )}

      {/* Create Modal */}
      <ProjectModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
