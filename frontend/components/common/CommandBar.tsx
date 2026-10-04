'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { Search, FolderKanban, CheckSquare, Plus, Sun, Moon, Sparkles, LogOut, Code, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

export const CommandBar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { user, logout, loginAsDemoUser } = useAuthStore();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled: open && !!user,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (action: () => void) => {
    action();
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/70 bg-dots-pattern backdrop-blur-xs z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl bg-paper border-4 border-ink shadow-brutal-xl dark:bg-zinc-900 dark:border-paper dark:shadow-brutal-dark-xl flex flex-col p-0 overflow-hidden">
          {/* Header search bar */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b-3 border-ink bg-white dark:bg-zinc-950 dark:border-paper">
            <Search className="h-5 w-5 text-ink dark:text-paper" />
            <input
              type="text"
              placeholder="Search projects, actions, or jump anywhere... (Ctrl+K)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent font-mono text-sm text-ink outline-none placeholder:text-zinc-400 dark:text-paper"
              autoFocus
            />
            <span className="text-[10px] font-mono font-bold bg-acid-yellow text-ink px-2 py-0.5 border-2 border-ink uppercase">
              ESC TO CLOSE
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 font-mono text-xs">
            {/* Quick Actions */}
            <div className="space-y-1">
              <span className="micro-label text-zinc-500 pl-2">SYSTEM ACTIONS</span>
              <button
                onClick={() => handleSelect(() => router.push('/'))}
                className="w-full text-left px-3 py-2 border-2 border-transparent hover:border-ink hover:bg-acid-yellow hover:text-ink font-bold flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  <span>JUMP TO DASHBOARD</span>
                </div>
                <span className="text-[10px] opacity-70">G + D</span>
              </button>

              <button
                onClick={() => handleSelect(() => router.push('/styleguide'))}
                className="w-full text-left px-3 py-2 border-2 border-transparent hover:border-ink hover:bg-hot-pink hover:text-ink font-bold flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span>VIEW DESIGN SYSTEM / STYLEGUIDE</span>
                </div>
                <span className="text-[10px] opacity-70">G + S</span>
              </button>

              <button
                onClick={() =>
                  handleSelect(() => {
                    document.documentElement.classList.toggle('dark');
                  })
                }
                className="w-full text-left px-3 py-2 border-2 border-transparent hover:border-ink hover:bg-neon-cyan hover:text-ink font-bold flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  <span>TOGGLE NIGHT SHIFT / DAY SHIFT</span>
                </div>
                <span className="text-[10px] opacity-70">T</span>
              </button>
            </div>

            {/* Projects list */}
            {filteredProjects.length > 0 && (
              <div className="space-y-1">
                <span className="micro-label text-zinc-500 pl-2">PROJECTS ({filteredProjects.length})</span>
                {filteredProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => handleSelect(() => router.push(`/projects/${proj.id}`))}
                    className="w-full text-left px-3 py-2 border-2 border-transparent hover:border-ink hover:bg-toxic-green hover:text-ink font-bold flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4" />
                      <span className="uppercase">{proj.name}</span>
                    </div>
                    <span className="text-[10px] opacity-70">OPEN ↗</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Demo Switcher */}
            <div className="space-y-1 border-t-2 border-ink/20 pt-2">
              <span className="micro-label text-zinc-500 pl-2">LOGIN AS DEMO USER</span>
              <div className="grid grid-cols-3 gap-2 px-2">
                <button
                  onClick={() => handleSelect(() => loginAsDemoUser('alex'))}
                  className="p-2 border-2 border-ink bg-acid-yellow text-ink font-bold text-center hover:bg-yellow-300 uppercase text-[10px]"
                >
                  Alex Rivers
                </button>
                <button
                  onClick={() => handleSelect(() => loginAsDemoUser('sarah'))}
                  className="p-2 border-2 border-ink bg-hot-pink text-ink font-bold text-center hover:bg-pink-300 uppercase text-[10px]"
                >
                  Sarah Chen
                </button>
                <button
                  onClick={() => handleSelect(() => loginAsDemoUser('rahul'))}
                  className="p-2 border-2 border-ink bg-electric-blue text-white font-bold text-center hover:bg-blue-600 uppercase text-[10px]"
                >
                  Rahul Patel
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
