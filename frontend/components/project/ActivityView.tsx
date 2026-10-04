'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { ActivityLog } from '@/types/api';
import { Avatar } from '@/components/ui/Avatar';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { formatRelativeTime } from '@/lib/utils';
import { History, GitMerge, CheckSquare, UserPlus, ShieldAlert, Sparkles } from 'lucide-react';

export const ActivityView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [page, setPage] = useState(1);

  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['activity', projectId, page],
    queryFn: () => api.dashboard.getProjectActivity(projectId, { page, limit: 25 }),
  });

  const getActionBadge = (action: string) => {
    if (action.includes('AUTO_MERGED')) {
      return (
        <StickerBadge variant="violet" size="sm">
          AUTO-MERGED
        </StickerBadge>
      );
    }
    if (action.includes('CONFLICT_RESOLVED')) {
      return (
        <StickerBadge variant="green" size="sm">
          CONFLICT RESOLVED
        </StickerBadge>
      );
    }
    if (action.includes('CREATED')) {
      return (
        <StickerBadge variant="cyan" size="sm">
          CREATED
        </StickerBadge>
      );
    }
    if (action.includes('DELETED')) {
      return (
        <StickerBadge variant="red" size="sm">
          DELETED
        </StickerBadge>
      );
    }
    return (
      <StickerBadge variant="yellow" size="sm">
        {action.replace(/_/g, ' ')}
      </StickerBadge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b-3 border-ink pb-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-ink dark:text-paper" />
          <h3 className="font-display text-xl uppercase tracking-tight">
            ACTIVITY STREAM // AUDIT LOG
          </h3>
        </div>
        <span className="font-mono text-xs text-ink dark:text-paper font-bold">
          MONOTONIC SEQ LOGGED
        </span>
      </div>

      {isLoading ? (
        <div className="p-8 text-center font-mono text-ink dark:text-paper font-bold">LOADING STREAM...</div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-ink dark:border-paper font-mono text-xs text-ink dark:text-paper font-bold">
          NO ACTIVITY RECORDED YET IN THIS WORKSPACE.
        </div>
      ) : (
        <div className="relative pl-6 border-l-4 border-ink space-y-6 dark:border-paper">
          {logs.map((log) => (
            <div key={log.id} className="relative group">
              {/* Square Timeline Node */}
              <span className="absolute -left-[31px] top-1 h-4 w-4 bg-acid-yellow border-3 border-ink shadow-brutal-sm group-hover:scale-125 transition-transform" />

              <div className="p-4 border-3 border-ink bg-white shadow-brutal-sm space-y-2 dark:bg-zinc-900 dark:border-paper">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar user={log.actor} size="xs" />
                    <span className="font-mono font-black text-xs uppercase">
                      {log.actor?.name || 'Collaborator'}
                    </span>
                    {getActionBadge(log.action)}
                  </div>
                  <span className="font-mono text-[10px] text-zinc-700 dark:text-zinc-100 font-bold">
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </div>

                <div className="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-bold">
                  {log.task ? (
                    <span>
                      Target Task: <strong className="text-ink dark:text-paper">{log.task.title}</strong>
                    </span>
                  ) : (
                    <span>Action: {log.action}</span>
                  )}
                </div>

                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-950 border border-ink/20 font-mono text-[10px] text-zinc-900 dark:text-zinc-100 font-bold overflow-x-auto">
                    {JSON.stringify(log.metadata)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
