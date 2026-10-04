'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Bell, CheckCheck, Inbox, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { formatRelativeTime } from '@/lib/utils';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { cn } from '@/lib/utils';
import { Notification } from '@/types/api';

export const NotificationDropdown: React.FC = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'PROJECT_INVITATION':
        return <UserCheck className="h-4 w-4 text-electric-blue" />;
      case 'TASK_ASSIGNED':
        return <Sparkles className="h-4 w-4 text-hot-pink" />;
      case 'DEADLINE_WARNING':
        return <ShieldAlert className="h-4 w-4 text-signal-red" />;
      default:
        return <Bell className="h-4 w-4 text-zinc-500" />;
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="relative h-11 w-11 border-3 border-ink bg-white text-ink flex items-center justify-center hover:bg-zinc-100 shadow-brutal-sm dark:bg-zinc-900 dark:text-paper dark:border-paper dark:shadow-brutal-dark-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-signal-red text-white text-[10px] font-mono font-black px-1.5 py-0.2 border-2 border-ink shadow-brutal-sm">
              {unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 sm:w-96 bg-paper border-4 border-ink shadow-brutal-xl dark:bg-zinc-900 dark:border-paper dark:shadow-brutal-dark-xl flex flex-col p-0 animate-in fade-in zoom-in-95"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-ink text-paper border-b-3 border-ink dark:bg-zinc-950 dark:text-acid-yellow">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">✦</span>
              <span className="font-display text-sm uppercase tracking-wider">
                NOTIFICATIONS ({unreadCount} UNREAD)
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-[10px] font-mono font-bold uppercase underline hover:text-acid-yellow"
              >
                MARK ALL READ
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y-2 divide-ink/10 font-mono text-xs">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
                <Inbox className="h-8 w-8 mb-2 opacity-50" />
                <span className="font-bold">ALL CAUGHT UP. NO ALERTS.</span>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => isUnread && markReadMutation.mutate(n.id)}
                    className={cn(
                      'p-3 flex items-start gap-3 transition-colors cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800',
                      isUnread ? 'bg-acid-yellow/15 font-bold' : 'opacity-70'
                    )}
                  >
                    <div className="mt-0.5">{getNotifIcon(n.type)}</div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black uppercase text-[11px]">
                          {n.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5">
                        {n.payload?.message ||
                          (n.payload?.taskTitle ? `Task: ${n.payload.taskTitle}` : '') ||
                          (n.payload?.projectName ? `Project: ${n.payload.projectName}` : '') ||
                          'System notification'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
