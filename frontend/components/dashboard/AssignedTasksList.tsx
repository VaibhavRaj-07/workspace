import React from 'react';
import { Task } from '@/types/api';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { formatDate } from '@/lib/utils';
import { CheckSquare, Clock, AlertTriangle } from 'lucide-react';

export const AssignedTasksList: React.FC<{
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
}> = ({ tasks, onSelectTask }) => {
  return (
    <BrutalCard
      headerTitle={`ASSIGNED TO ME (${tasks.length})`}
      headerGlyph="star"
      headerBg="ink"
      className="h-full"
    >
      {tasks.length === 0 ? (
        <div className="p-8 text-center font-mono text-zinc-500 font-bold">
          NO TASKS ASSIGNED TO CURRENT ACCOUNT.
        </div>
      ) : (
        <div className="divide-y-2 divide-ink/10 font-mono text-xs">
          {tasks.map((task) => {
            const isDone = task.status === 'done';
            const now = new Date();
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            const isOverdue = dueDate ? dueDate.getTime() < now.getTime() && !isDone : false;

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask && onSelectTask(task)}
                className="py-3 px-1 flex items-center justify-between gap-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`h-4 w-4 border-2 border-ink flex items-center justify-center shrink-0 ${
                      isDone ? 'bg-toxic-green' : 'bg-white'
                    }`}
                  >
                    {isDone && '✓'}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`font-bold truncate text-sm group-hover:text-electric-blue ${
                        isDone ? 'line-through text-zinc-400' : 'text-ink dark:text-paper'
                      }`}
                    >
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                      {task.project?.name && (
                        <span className="uppercase font-bold text-ink dark:text-paper">
                          [{task.project.name}]
                        </span>
                      )}
                      <span>VER: #{task.version}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StickerBadge
                    size="sm"
                    variant={
                      task.priority === 'urgent'
                        ? 'red'
                        : task.priority === 'high'
                        ? 'orange'
                        : task.priority === 'medium'
                        ? 'yellow'
                        : 'cyan'
                    }
                  >
                    {task.priority}
                  </StickerBadge>

                  {task.dueDate && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 border-2 border-ink font-bold flex items-center gap-1 ${
                        isOverdue
                          ? 'bg-signal-red text-white'
                          : 'bg-paper text-ink dark:bg-zinc-800 dark:text-paper'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BrutalCard>
  );
};
