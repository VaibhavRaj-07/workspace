'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useSocket } from '@/lib/socket/socket-provider';
import { useAuthStore } from '@/stores/auth-store';
import { BrutalTabs, TabItem } from '@/components/ui/BrutalTabs';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { AvatarStack } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { ListView } from '@/components/project/ListView';
import { ProgressView } from '@/components/project/ProgressView';
import { ActivityView } from '@/components/project/ActivityView';
import { MembersView } from '@/components/project/MembersView';
import { CreateTaskModal } from '@/components/task/CreateTaskModal';
import { TaskDrawer } from '@/components/task/TaskDrawer';
import { ProjectModal } from '@/components/project/ProjectModal';
import { Task, TaskStatus, Project } from '@/types/api';
import { formatDate } from '@/lib/utils';
import {
  FolderKanban,
  Kanban,
  List,
  BarChart3,
  History,
  Users,
  Plus,
  Settings,
  Clock,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { setActiveProject, onlineUsers, lastSeqMap, isResynced } = useSocket();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'board' | 'list' | 'progress' | 'activity' | 'members'>('board');
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskDefaultStatus, setCreateTaskDefaultStatus] = useState<TaskStatus>('todo');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);

  // Set active project for Socket.IO room join & events
  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
    }
    return () => {
      setActiveProject(null);
    };
  }, [projectId, setActiveProject]);

  // Fetch Project Details
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => api.projects.getById(projectId),
    enabled: !!projectId,
  });

  // Fetch Tasks for this Project
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    queryFn: () => api.tasks.listByProject(projectId),
    enabled: !!projectId,
  });

  if (projectLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-4">
        <h2 className="font-display text-3xl uppercase">WORKSPACE NOT FOUND</h2>
        <p className="font-mono text-sm text-zinc-500">
          The requested project ID does not exist or access has been restricted.
        </p>
        <BrutalButton variant="primary" onClick={() => router.push('/')}>
          RETURN TO DASHBOARD →
        </BrutalButton>
      </div>
    );
  }

  const currentSeq = lastSeqMap[projectId] || 0;

  const tabs: TabItem[] = [
    { id: 'board', label: 'KANBAN BOARD', icon: <Kanban className="h-3.5 w-3.5" />, badge: tasks.length },
    { id: 'list', label: 'LIST VIEW', icon: <List className="h-3.5 w-3.5" /> },
    { id: 'progress', label: 'PROGRESS & RISK AI', icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: 'activity', label: 'ACTIVITY STREAM', icon: <History className="h-3.5 w-3.5" /> },
    { id: 'members', label: 'MEMBERS', icon: <Users className="h-3.5 w-3.5" />, badge: project.members?.length || 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between font-mono text-xs">
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center gap-1 font-bold hover:underline text-ink dark:text-paper"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>PROJECTS REGISTRY</span>
        </button>

        <div className="flex items-center gap-2">
          {isResynced && (
            <StickerBadge variant="green" size="sm" rotate="2" className="animate-stamp">
              ✦ RESYNCED
            </StickerBadge>
          )}
          <span className="font-mono text-xs font-bold text-ink dark:text-paper">MONOTONIC SEQ:</span>
          <span className="font-black bg-acid-yellow text-ink px-1.5 py-0.2 border border-ink">
            #{currentSeq}
          </span>
        </div>
      </div>

      {/* Giant Project Header */}
      <div className="border-4 border-ink bg-paper p-6 sm:p-8 shadow-brutal-lg dark:bg-zinc-900 dark:border-paper flex flex-col md:flex-row md:items-start justify-between gap-6 relative overflow-hidden bg-grid-pattern">
        <div className="space-y-3 z-10 flex-1">
          <div className="flex flex-wrap items-center gap-2">
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

            {project.deadline && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 border-2 border-ink dark:border-paper bg-white dark:bg-zinc-800 text-ink dark:text-paper flex items-center gap-1">
                <Clock className="h-3 w-3 text-ink dark:text-paper" />
                DEADLINE: {formatDate(project.deadline)}
              </span>
            )}

            <span className="text-xs font-mono font-bold text-ink dark:text-paper">
              OCC VER: #{project.version}
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl uppercase tracking-tighter text-ink dark:text-paper leading-none">
            {project.name}
          </h1>

          {project.description && (
            <p className="font-mono text-xs sm:text-sm text-ink dark:text-paper max-w-3xl leading-relaxed font-bold">
              {project.description}
            </p>
          )}
        </div>

        {/* Right Header Side: Presence Avatar Stack & Actions */}
        <div className="flex flex-col items-end gap-4 z-10 shrink-0">
          <div className="flex flex-col items-end gap-1">
            <span className="micro-label text-ink dark:text-paper font-bold">
              ACTIVE COLLABORATORS IN ROOM ({onlineUsers.length}):
            </span>
            <AvatarStack users={onlineUsers.map(u => ({ id: u.userId, name: u.name, avatarUrl: u.avatarUrl, isOnline: true }))} size="md" max={4} />
          </div>

          <div className="flex items-center gap-2">
            <BrutalButton
              variant="secondary"
              size="sm"
              onClick={() => setIsEditProjectOpen(true)}
            >
              <Settings className="h-3.5 w-3.5 mr-1" /> EDIT PROJECT
            </BrutalButton>

            <BrutalButton
              variant="primary"
              size="sm"
              onClick={() => {
                setCreateTaskDefaultStatus('todo');
                setIsCreateTaskOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> CREATE TASK
            </BrutalButton>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <BrutalTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* Tab Contents */}
      <div className="min-h-[500px]">
        {activeTab === 'board' && (
          <KanbanBoard
            projectId={projectId}
            tasks={tasks}
            onAddTask={(status) => {
              setCreateTaskDefaultStatus(status);
              setIsCreateTaskOpen(true);
            }}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
          />
        )}

        {activeTab === 'list' && (
          <ListView
            tasks={tasks}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressView
            projectId={projectId}
            project={project}
            onSelectTask={(taskId) => setSelectedTaskId(taskId)}
          />
        )}

        {activeTab === 'activity' && <ActivityView projectId={projectId} />}

        {activeTab === 'members' && <MembersView project={project} />}
      </div>

      {/* Modals & Drawers */}
      <CreateTaskModal
        projectId={projectId}
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        members={project.members || []}
        defaultStatus={createTaskDefaultStatus}
        onTaskCreated={(newId) => setSelectedTaskId(newId)}
        onOpenExistingTask={(dupId) => setSelectedTaskId(dupId)}
      />

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          open={!!selectedTaskId}
          onOpenChange={(open) => {
            if (!open) setSelectedTaskId(null);
          }}
        />
      )}

      <ProjectModal
        open={isEditProjectOpen}
        onOpenChange={setIsEditProjectOpen}
        projectToEdit={project}
      />
    </div>
  );
}
