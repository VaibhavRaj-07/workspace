'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { OverviewStats } from '@/components/dashboard/OverviewStats';
import { ProjectGrid } from '@/components/dashboard/ProjectGrid';
import { StatusDistributionChart } from '@/components/dashboard/StatusDistributionChart';
import { AssignedTasksList } from '@/components/dashboard/AssignedTasksList';
import { AtRiskTasksCard } from '@/components/dashboard/AtRiskTasksCard';
import { ProjectModal } from '@/components/project/ProjectModal';
import { TaskDrawer } from '@/components/task/TaskDrawer';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Task } from '@/types/api';
import { useRouter } from 'next/navigation';
import { Sparkles, FolderPlus, ArrowUpRight, Zap, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Redirect to login if not authenticated once auth check is ready
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.dashboard.getOverview(),
    enabled: isAuthenticated,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled: isAuthenticated,
  });

  if (authLoading || (overviewLoading && !overview)) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const assignedTasks = overview?.assignedTasks || [];
  const atRiskTasks = (overview?.atRiskTasks || []).map((t) => ({
    task: { id: t.taskId },
    riskScore: t.riskScore,
    riskLevel: t.riskLevel,
    topFactors: t.topFactors,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Hero Greeting */}
      <div className="border-4 border-ink bg-paper p-6 sm:p-8 shadow-brutal-lg dark:bg-zinc-900 dark:border-paper flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden bg-stripes-subtle">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 bg-toxic-green rounded-full border border-ink" />
            <span className="micro-label text-ink dark:text-paper font-bold">SYSTEM STATUS: OPERATIONAL</span>
            <StickerBadge variant="yellow" size="sm" rotate="-1">
              CONCURRENCY ARMORED
            </StickerBadge>
          </div>
          <h1 className="font-display text-4xl sm:text-6xl uppercase tracking-tighter text-ink dark:text-paper leading-none">
            WELCOME, {user ? user.name.split(' ')[0] : 'OPERATOR'}.
          </h1>
          <p className="font-mono text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">
            Real-time multi-agent workspace with optimistic concurrency control and AI conflict reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 shrink-0">
          <BrutalButton
            variant="primary"
            size="md"
            onClick={() => setIsProjectModalOpen(true)}
          >
            <FolderPlus className="h-4 w-4 mr-1" /> CREATE WORKSPACE
          </BrutalButton>
          <BrutalButton
            variant="secondary"
            size="md"
            onClick={() => router.push('/demo-conflict')}
          >
            ⚡ DEMO CONFLICT
          </BrutalButton>
        </div>
      </div>

      {/* Metric Stat Blocks */}
      <OverviewStats overview={overview} isLoading={overviewLoading} />

      {/* Projects Grid */}
      <ProjectGrid
        projects={projects}
        onCreateProject={() => setIsProjectModalOpen(true)}
      />

      {/* Charts Section */}
      <StatusDistributionChart overview={overview} />

      {/* Split: Assigned Tasks & AI Risk Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <AssignedTasksList
            tasks={assignedTasks}
            onSelectTask={(task) => {
              setSelectedTask(task);
              setSelectedTaskId(task.id);
            }}
          />
        </div>
        <div className="lg:col-span-5">
          <AtRiskTasksCard
            atRiskTasks={atRiskTasks}
            onSelectTask={(taskId) => {
              setSelectedTaskId(taskId);
            }}
          />
        </div>
      </div>

      {/* Modals & Drawers */}
      <ProjectModal
        open={isProjectModalOpen}
        onOpenChange={setIsProjectModalOpen}
      />

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          open={!!selectedTaskId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTaskId(null);
              setSelectedTask(null);
            }
          }}
        />
      )}
    </div>
  );
}
