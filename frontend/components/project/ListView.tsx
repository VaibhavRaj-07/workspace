'use client';

import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority } from '@/types/api';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/utils';
import { Clock, ArrowUpDown, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ListViewProps {
  tasks: Task[];
  onSelectTask?: (task: Task) => void;
}

export const ListView: React.FC<ListViewProps> = ({ tasks, onSelectTask }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'status' | 'priority' | 'dueDate' | 'version'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredTasks = tasks
    .filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let valA: any = a[sortBy] || '';
      let valB: any = b[sortBy] || '';

      if (sortBy === 'dueDate') {
        valA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        valB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const priorityVariants: Record<TaskPriority, any> = {
    low: 'cyan',
    medium: 'yellow',
    high: 'orange',
    urgent: 'red',
  };

  const statusVariants: Record<TaskStatus, any> = {
    todo: 'paper',
    in_progress: 'blue',
    in_review: 'violet',
    done: 'green',
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 border-3 border-ink bg-white shadow-brutal-sm dark:bg-zinc-950 dark:border-paper">
        <div className="sm:col-span-6 flex items-center gap-2">
          <Search className="h-4 w-4 text-zinc-400 shrink-0 ml-2" />
          <input
            type="text"
            placeholder="Filter tasks by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent font-mono text-xs text-ink outline-none dark:text-paper"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-paper border-2 border-ink font-mono text-xs font-bold px-2 py-1 uppercase dark:bg-zinc-900 dark:border-paper"
          >
            <option value="">ALL STATUSES</option>
            <option value="todo">TODO</option>
            <option value="in_progress">IN PROGRESS</option>
            <option value="in_review">IN REVIEW</option>
            <option value="done">DONE</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-paper border-2 border-ink font-mono text-xs font-bold px-2 py-1 uppercase dark:bg-zinc-900 dark:border-paper"
          >
            <option value="">ALL PRIORITIES</option>
            <option value="low">LOW</option>
            <option value="medium">MEDIUM</option>
            <option value="high">HIGH</option>
            <option value="urgent">URGENT</option>
          </select>
        </div>
      </div>

      {/* Dense Table */}
      <div className="border-4 border-ink shadow-brutal bg-white overflow-x-auto dark:bg-zinc-950 dark:border-paper">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-ink text-paper border-b-3 border-ink select-none dark:bg-zinc-900 dark:text-acid-yellow">
              <th className="p-3 cursor-pointer hover:text-acid-yellow" onClick={() => toggleSort('title')}>
                <div className="flex items-center gap-1">
                  <span>TASK TITLE</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:text-acid-yellow" onClick={() => toggleSort('status')}>
                <div className="flex items-center gap-1">
                  <span>STATUS</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:text-acid-yellow" onClick={() => toggleSort('priority')}>
                <div className="flex items-center gap-1">
                  <span>PRIORITY</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-3">ASSIGNEE</th>
              <th className="p-3 cursor-pointer hover:text-acid-yellow" onClick={() => toggleSort('dueDate')}>
                <div className="flex items-center gap-1">
                  <span>DUE DATE</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:text-acid-yellow" onClick={() => toggleSort('version')}>
                <div className="flex items-center gap-1">
                  <span>OCC VER</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y-2 divide-ink/10">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500 font-bold">
                  NO TASKS MATCH FILTER PARAMETERS.
                </td>
              </tr>
            ) : (
              filteredTasks.map((t, idx) => (
                <tr
                  key={t.id}
                  onClick={() => onSelectTask && onSelectTask(t)}
                  className={cn(
                    'hover:bg-acid-yellow/20 cursor-pointer transition-colors',
                    idx % 2 === 1 ? 'bg-zinc-50 dark:bg-zinc-900/50' : ''
                  )}
                >
                  <td className="p-3 font-bold max-w-xs truncate">{t.title}</td>
                  <td className="p-3">
                    <StickerBadge size="sm" variant={statusVariants[t.status]}>
                      {t.status.replace('_', ' ')}
                    </StickerBadge>
                  </td>
                  <td className="p-3">
                    <StickerBadge size="sm" variant={priorityVariants[t.priority]}>
                      {t.priority}
                    </StickerBadge>
                  </td>
                  <td className="p-3">
                    {t.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar user={t.assignee} size="xs" />
                        <span className="truncate max-w-[100px]">{t.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-400">UNASSIGNED</span>
                    )}
                  </td>
                  <td className="p-3">
                    {t.dueDate ? (
                      <span className="flex items-center gap-1 font-bold">
                        <Clock className="h-3 w-3 text-zinc-400" />
                        {formatDate(t.dueDate)}
                      </span>
                    ) : (
                      <span className="text-zinc-400">NONE</span>
                    )}
                  </td>
                  <td className="p-3 font-black">#{t.version}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
