'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  closestCenter,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
  KeyboardSensor,
  PointerSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import confetti from 'canvas-confetti';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { Task, TaskStatus } from '@/types/api';
import { api } from '@/lib/api/client';
import { toast } from '@/stores/toast-store';
import { useQueryClient } from '@tanstack/react-query';
import { FEATURE_FLAGS } from '@/lib/config/features';

export interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  onAddTask?: (status: TaskStatus) => void;
  onSelectTask?: (task: Task) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  projectId,
  tasks,
  onAddTask,
  onSelectTask,
}) => {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const collisionDetectionStrategy: CollisionDetection = (args) => {
    // 1. First find any containers directly under the pointer (excluding active element)
    const pointerCollisions = pointerWithin(args).filter((c) => c.id !== args.active.id);

    if (pointerCollisions.length > 0) {
      // If there's a collision with a card, prioritize the card
      const taskCollision = pointerCollisions.find((c) => tasks.some((t) => t.id === c.id));
      if (taskCollision) {
        return [taskCollision];
      }
      // If there's a collision with a column, return the column
      const columnCollision = pointerCollisions.find((c) => columns.some((col) => col.id === c.id));
      if (columnCollision) {
        return [columnCollision];
      }
      return pointerCollisions;
    }

    // 2. If pointer is not directly over a card/column, find the closest column
    const columnDroppables = args.droppableContainers.filter((c) =>
      columns.some((col) => col.id === c.id)
    );
    const closestCols = closestCenter({
      ...args,
      droppableContainers: columnDroppables,
    });

    if (closestCols.length > 0) {
      const targetColId = closestCols[0].id as TaskStatus;
      const targetColTasks = tasks.filter((t) => t.status === targetColId && t.id !== args.active.id);
      if (targetColTasks.length === 0) {
        return closestCols;
      }
      const taskDroppables = args.droppableContainers.filter((c) =>
        targetColTasks.some((t) => t.id === c.id)
      );
      const closestTask = closestCenter({
        ...args,
        droppableContainers: taskDroppables,
      });
      return closestTask.length > 0 ? closestTask : closestCols;
    }

    return closestCorners(args).filter((c) => c.id !== args.active.id);
  };

  const columns: Array<{
    id: TaskStatus;
    title: string;
    glyph: string;
    headerBg: string;
  }> = [
    {
      id: 'todo',
      title: 'TODO QUEUE',
      glyph: '■',
      headerBg: 'bg-paper text-ink dark:bg-zinc-800 dark:text-paper',
    },
    {
      id: 'in_progress',
      title: 'IN PROGRESS',
      glyph: '▶',
      headerBg: 'bg-electric-blue text-white',
    },
    {
      id: 'in_review',
      title: 'IN REVIEW',
      glyph: '✦',
      headerBg: 'bg-hyper-violet text-white',
    },
    {
      id: 'done',
      title: 'COMPLETED',
      glyph: '✓',
      headerBg: 'bg-toxic-green text-ink',
    },
  ];

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('[DND-DEBUG] DragEnd activeId:', active?.id, 'overId:', over?.id);
    setActiveTask(null);

    if (!over) {
      console.log('[DND-DEBUG] DragEnd: over is null');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const currentTask = tasks.find((t) => t.id === activeId);
    if (!currentTask) {
      console.log('[DND-DEBUG] DragEnd: currentTask not found for activeId:', activeId);
      return;
    }

    // Check if dropped directly onto a column or over another task
    let targetStatus: TaskStatus = currentTask.status;
    const targetColumn = columns.find((c) => c.id === overId);

    if (targetColumn) {
      targetStatus = targetColumn.id;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus === currentTask.status && activeId === overId) {
      return;
    }

    // Calculate position
    const targetColTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== activeId)
      .sort((a, b) => a.position - b.position);

    let newPosition = 65536.0;
    if (targetColTasks.length > 0) {
      const overIndex = targetColTasks.findIndex((t) => t.id === overId);
      if (overIndex === -1) {
        // Appended to end of column
        newPosition = targetColTasks[targetColTasks.length - 1].position + 65536.0;
      } else if (overIndex === 0) {
        newPosition = targetColTasks[0].position / 2.0;
      } else {
        newPosition =
          (targetColTasks[overIndex - 1].position + targetColTasks[overIndex].position) / 2.0;
      }
    }

    // Optimistic cache update
    const previousTasks = tasks;
    queryClient.setQueryData<Task[]>(['tasks', projectId], (old) => {
      if (!old) return [];
      return old.map((t) =>
        t.id === activeId ? { ...t, status: targetStatus, position: newPosition } : t
      );
    });

    // Celebrate when moving to DONE (gated behind feature flag)
    if (FEATURE_FLAGS.EXTRAS && targetStatus === 'done' && currentTask.status !== 'done') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#FFE600', '#19E36B', '#FF3EA5', '#2B4BFF'],
        });
      } catch {}
    }

    // API Call
    try {
      const movedTask = await api.tasks.move(activeId, {
        status: targetStatus,
        position: newPosition,
        version: currentTask.version,
      });
      if (movedTask) {
        queryClient.setQueryData<Task[]>(['tasks', projectId], (old) => {
          if (!old) return [];
          return old.map((t) => (t.id === activeId ? movedTask : t));
        });
      }
    } catch (err: any) {
      // Rollback on failure
      queryClient.setQueryData(['tasks', projectId], previousTasks);
      toast.error('MOVE FAILED', err.message || 'OCC conflict during move');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-6">
        {columns.map((col) => {
          const colTasks = tasks
            .filter((t) => t.status === col.id)
            .sort((a, b) => a.position - b.position);

          return (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              glyph={col.glyph}
              headerBg={col.headerBg}
              tasks={colTasks}
              onAddTask={onAddTask}
              onSelectTask={onSelectTask}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="pointer-events-none">
            <TaskCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
