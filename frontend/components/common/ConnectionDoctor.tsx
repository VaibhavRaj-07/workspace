'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/lib/socket/socket-provider';
import { useAuthStore, DEMO_USERS } from '@/stores/auth-store';
import { api } from '@/lib/api/client';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { WarningTape } from '@/components/ui/WarningTape';
import {
  Activity,
  Wifi,
  WifiOff,
  Server,
  Sparkles,
  User as UserIcon,
  X,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/stores/toast-store';

export const ConnectionDoctor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected, activeProjectId, onlineUsers, lastSeqMap, peerEditingMap } = useSocket();
  const { user, loginAsDemoUser } = useAuthStore();

  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'degraded' | 'offline'>('checking');
  const [healthData, setHealthData] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'healthy' | 'fallback' | 'checking'>('checking');
  const [aiStatusData, setAiStatusData] = useState<{ mergeProvider: string; mlService: string; breaker: string } | null>(null);

  const checkHealth = async () => {
    setHealthStatus('checking');
    try {
      const res = await api.health();
      if (res && res.status) {
        setHealthStatus(res.status === 'healthy' ? 'healthy' : 'degraded');
        setHealthData(res);
      } else {
        setHealthStatus('offline');
      }
    } catch {
      setHealthStatus('offline');
    }

    // Check AI & ML status from backend /ai/status
    try {
      const aiStatusRes = await api.ai.getStatus();
      if (aiStatusRes) {
        setAiStatusData(aiStatusRes);
        setAiStatus(aiStatusRes.mlService === 'up' ? 'healthy' : 'fallback');
      } else {
        setAiStatus('fallback');
      }
    } catch {
      setAiStatus('fallback');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Floating trigger button in bottom-left */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 border-3 border-ink shadow-brutal-sm font-mono text-xs font-black uppercase transition-all select-none',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-acid-yellow',
            isConnected
              ? 'bg-acid-yellow text-ink hover:bg-yellow-300'
              : 'bg-red-700 text-white hover:bg-red-800 animate-pulse'
          )}
          title="Toggle Connection Doctor (Ctrl+Shift+D)"
        >
          <Activity className="h-3.5 w-3.5" />
          <span>DEV DOCTOR</span>
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              isConnected ? 'bg-toxic-green' : 'bg-white'
            )}
          />
        </button>
      </div>

      {/* Doctor Panel Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-14 left-4 z-50 w-96 max-w-[calc(100vw-32px)] bg-paper border-4 border-ink shadow-brutal-xl animate-stamp dark:bg-zinc-900 dark:border-paper dark:shadow-brutal-dark-xl">
          <div className="bg-ink text-acid-yellow px-4 py-2.5 flex items-center justify-between border-b-3 border-ink select-none">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-acid-yellow" />
              <span className="font-display text-sm tracking-wider uppercase">
                CONNECTION DOCTOR // DEV PANEL
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-acid-yellow p-0.5 font-mono"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* REST API */}
              <div className="p-2.5 border-2 border-ink bg-white dark:bg-zinc-950 dark:border-zinc-700 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="font-bold">REST API (:5000)</span>
                  <Server className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      healthStatus === 'healthy'
                        ? 'bg-toxic-green'
                        : healthStatus === 'degraded'
                        ? 'bg-acid-yellow'
                        : 'bg-signal-red'
                    )}
                  />
                  <span className="font-black uppercase">{healthStatus}</span>
                </div>
              </div>

              {/* Socket.IO */}
              <div className="p-2.5 border-2 border-ink bg-white dark:bg-zinc-950 dark:border-zinc-700 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="font-bold">REALTIME WS</span>
                  {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      isConnected ? 'bg-toxic-green' : 'bg-signal-red'
                    )}
                  />
                  <span className="font-black uppercase">
                    {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
              </div>

              {/* AI Service */}
              <div className="p-2.5 border-2 border-ink bg-white dark:bg-zinc-950 dark:border-zinc-700 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="font-bold">AI / ML STATUS</span>
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 space-y-0.5 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        aiStatusData?.mergeProvider === 'claude' ? 'bg-toxic-green' : 'bg-acid-yellow'
                      )}
                    />
                    <span className="font-black uppercase">
                      MERGE: {aiStatusData?.mergeProvider === 'claude' ? 'CLAUDE' : 'RULE-BASED'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    <span>ML: {aiStatusData?.mlService?.toUpperCase() || 'FALLBACK'}</span>
                    <span>•</span>
                    <span>BREAKER: {aiStatusData?.breaker?.toUpperCase() || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Active User */}
              <div className="p-2.5 border-2 border-ink bg-white dark:bg-zinc-950 dark:border-zinc-700 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="font-bold">USER CONTEXT</span>
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 font-black truncate">
                  {user ? user.name.split(' ')[0] : 'ANONYMOUS'}
                </div>
              </div>
            </div>

            {/* Sequence & Room Diagnostics */}
            <div className="p-2.5 border-2 border-ink bg-zinc-100 dark:bg-zinc-950 dark:border-zinc-700 space-y-1.5">
              <div className="font-bold text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                <span>ROOM & SEQUENCE DIAGNOSTICS</span>
                <button
                  onClick={checkHealth}
                  className="hover:text-ink dark:hover:text-paper"
                  title="Refresh status"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
              <div className="text-[11px] space-y-1">
                <div>Active Project: <span className="font-bold">{activeProjectId || 'None (Global scope)'}</span></div>
                <div>Last Seq: <span className="font-bold">{activeProjectId ? (lastSeqMap[activeProjectId] || 0) : 'N/A'}</span></div>
                <div>Online in Room: <span className="font-bold">{onlineUsers.length}</span></div>
                <div>Active Peer Locks: <span className="font-bold">{Object.keys(peerEditingMap).length}</span></div>
              </div>
            </div>

            {/* Quick User Switcher */}
            <div className="space-y-1.5">
              <span className="font-bold text-zinc-600 dark:text-zinc-400">QUICK IDENTITY SWITCH:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['alex', 'sarah', 'rahul'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      loginAsDemoUser(key).then(() => {
                        toast.success(`SWITCHED USER`, `Active as ${DEMO_USERS[key].name}`);
                      });
                    }}
                    className={cn(
                      'p-1.5 border-2 border-ink font-bold text-[10px] uppercase text-center transition-all',
                      user?.email === DEMO_USERS[key].email
                        ? 'bg-acid-yellow text-ink'
                        : 'bg-white text-ink hover:bg-zinc-100 dark:bg-zinc-800 dark:text-paper'
                    )}
                  >
                    {key.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t-2 border-ink/20 flex items-center justify-between text-[10px] text-zinc-500">
              <span>Shortcut: Ctrl+Shift+D</span>
              <a href="/styleguide" className="underline font-bold text-ink dark:text-paper">
                Styleguide →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
