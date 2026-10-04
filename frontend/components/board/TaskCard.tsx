'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as Popover from '@radix-ui/react-popover';
import { Task, TaskPriority, TaskRiskData } from '@/types/api';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { Avatar } from '@/components/ui/Avatar';
import { useSocket } from '@/lib/socket/socket-provider';
import { formatDate } from '@/lib/utils';
import { Clock, Sparkles, MessageSquare, Paperclip, AlertTriangle, GripVertical } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';

export interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, isDragging: propIsDragging }) => {
  const { peerEditingMap, highlightedTaskId, lastUpdatedActorName } = useSocket();
  const [riskPopoverOpen, setRiskPopoverOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dndIsDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDragging = propIsDragging || dndIsDragging;

  // Real-time peer editing lock
  const peerEditing = peerEditingMap[task.id];
  const isPeerEditing = !!peerEditing;

  // Real-time flash highlight when updated by others
  const isHighlighted = highlightedTaskId === task.id;

  // Lazy Fetch AI Deadline Risk for this task
  const { data: riskData } = useQuery<TaskRiskData>({
    queryKey: ['task-risk', task.id],
    queryFn: () => api.ai.getTaskRisk(task.id),
    staleTime: 1000 * 60 * 5, // 5 min
    retry: false,
  });

  const now = new Date();
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate ? dueDate.getTime() < now.getTime() && task.status !== 'done' : false;

  const priorityVariants: Record<TaskPriority, any> = {
    low: 'cyan',
    medium: 'yellow',
    high: 'orange',
    urgent: 'red',
  };

  return (
    <div
      ref={setNodeRef}
      data-task-id={task.id}
      onClick={onClick}
      style={style}
      className={cn(
        'group relative border-3 border-ink bg-white p-3.5 shadow-brutal-sm transition-all select-none cursor-pointer',
        'dark:bg-zinc-900 dark:border-paper dark:shadow-brutal-dark-sm',
        isDragging ? 'opacity-40 scale-105 shadow-brutal-lg z-50 rotate-2' : 'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal',
        isHighlighted ? 'bg-acid-yellow animate-flash' : '',
        isPeerEditing ? 'border-hot-pink ring-2 ring-hot-pink' : ''
      )}
    >
      {/* Real-time Peer Update Badge */}
      {isHighlighted && lastUpdatedActorName && (
        <div className="absolute -top-3 right-2 bg-acid-yellow text-ink border-2 border-ink px-1.5 py-0.2 font-mono text-[9px] font-black uppercase shadow-brutal-sm animate-bounce">
          UPDATED BY {lastUpdatedActorName.toUpperCase()}
        </div>
      )}

      {/* Top Header / Badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 text-zinc-400 hover:text-ink dark:hover:text-paper"
            title="Drag task"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <StickerBadge size="sm" variant={priorityVariants[task.priority]}>
            {task.priority}
          </StickerBadge>
        </div>

        {/* AI Deadline Risk Badge with Popover */}
        {riskData && riskData.available !== false && (
          <Popover.Root open={riskPopoverOpen} onOpenChange={setRiskPopoverOpen}>
            <Popover.Trigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.2 border-2 border-ink font-mono text-[9px] font-black uppercase shadow-brutal-sm cursor-pointer',
                  riskData.riskLevel === 'critical'
                    ? 'bg-signal-red text-white'
                    : riskData.riskLevel === 'high'
                    ? 'bg-hazard-orange text-ink'
                    : riskData.riskLevel === 'medium'
                    ? 'bg-acid-yellow text-ink'
                    : 'bg-toxic-green text-ink'
                )}
              >
                <Sparkles className="h-2.5 w-2.5" />
                <span>RISK {riskData.riskScore}%</span>
              </button>
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Content
                side="top"
                align="end"
                className="z-50 w-72 p-3 bg-paper border-3 border-ink shadow-brutal-lg font-mono text-xs space-y-2 dark:bg-zinc-950 dark:border-paper"
              >
                <div className="flex items-center justify-between border-b-2 border-ink pb-1 font-bold">
                  <span>✨ AI RISK ANALYSIS</span>
                  <span className="uppercase">{riskData.riskLevel} RISK</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="text-zinc-500">Contributing lifecycle factors:</div>
                  {riskData.topFactors?.slice(0, 3).map((factor, idx) => (
                    <div key={idx} className="p-1 bg-white border border-ink/40 dark:bg-zinc-900">
                      ↳ <span className="font-bold">{factor.reason || factor.feature}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[9px] text-zinc-400 border-t border-ink/20 pt-1">
                  Confidence: {Math.round(riskData.confidence * 100)}% // XGBoost Model
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>

      {/* Task Content */}
      <div onClick={onClick} className="cursor-pointer space-y-1.5">
        <h4 className="font-mono font-bold text-xs text-ink dark:text-paper group-hover:text-electric-blue transition-colors line-clamp-2">
          {task.title}
        </h4>
        {task.description && (
          <p className="font-mono text-[11px] text-zinc-500 line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      {/* Peer Editing Notice */}
      {isPeerEditing && (
        <div className="mt-2 p-1 bg-hot-pink text-ink text-[10px] font-mono font-black uppercase flex items-center gap-1 border border-ink">
          <span>✎</span> {peerEditing.userName} is editing...
        </div>
      )}

      {/* Bottom Footer: Assignee & Due Date */}
      <div className="mt-3 pt-2.5 border-t-2 border-ink/10 flex items-center justify-between gap-2 font-mono text-[10px]">
        {/* Assignee */}
        <div className="flex items-center gap-1.5 min-w-0">
          {task.assignee ? (
            <div className="flex items-center gap-1">
              <Avatar user={task.assignee} size="xs" />
              <span className="font-bold truncate max-w-[80px]">
                {task.assignee.name.split(' ')[0]}
              </span>
            </div>
          ) : (
            <span className="text-zinc-400 font-bold uppercase">UNASSIGNED</span>
          )}
        </div>

        {/* Due Date & Counters */}
        <div className="flex items-center gap-2 shrink-0">
          {task.dueDate && (
            <span
              className={cn(
                'px-1.5 py-0.2 border border-ink font-bold flex items-center gap-1',
                isOverdue ? 'bg-signal-red text-white' : 'bg-paper text-ink dark:bg-zinc-800 dark:text-paper'
              )}
            >
              <Clock className="h-2.5 w-2.5" />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
