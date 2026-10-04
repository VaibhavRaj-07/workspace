'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/types/api';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  glyph: string;
  headerBg: string;
  onAddTask?: (status: TaskStatus) => void;
  onSelectTask?: (task: Task) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  tasks,
  glyph,
  headerBg,
  onAddTask,
  onSelectTask,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { status: id },
  });

  return (
    <div
      ref={setNodeRef}
      data-column-id={id}
      className={cn(
        'flex flex-col border-4 border-ink bg-paper shadow-brutal min-w-[280px] sm:min-w-[300px] flex-1 transition-all',
        'dark:bg-zinc-950 dark:border-paper dark:shadow-brutal-dark',
        isOver ? 'ring-4 ring-acid-yellow bg-acid-yellow/10' : ''
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          'px-4 py-3 border-b-3 border-ink flex items-center justify-between select-none',
          headerBg
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-black">{glyph}</span>
          <h3 className="font-display text-sm tracking-wider uppercase">{title}</h3>
          <span className="text-[11px] font-mono font-black px-1.5 py-0.2 bg-ink text-paper border border-current dark:bg-paper dark:text-ink">
            {tasks.length}
          </span>
        </div>

        {onAddTask && (
          <button
            onClick={() => onAddTask(id)}
            className="p-1 border-2 border-current hover:bg-white hover:text-ink transition-colors font-black text-xs"
            title={`Add task to ${title}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Task List Container */}
      <div className="p-3 flex-1 flex flex-col gap-3 min-h-[450px] overflow-y-auto bg-stripes-subtle">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onSelectTask && onSelectTask(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-ink/30 p-6 text-center text-zinc-400 font-mono text-xs">
            <span>NO TASKS IN {title}</span>
          </div>
        )}
      </div>
    </div>
  );
};
