'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiClient, tokenStorage } from '@/lib/api/client';
import { useAuthStore, DEMO_USERS } from '@/stores/auth-store';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalInput } from '@/components/ui/BrutalInput';
import { BrutalTextarea } from '@/components/ui/BrutalTextarea';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { WarningTape } from '@/components/ui/WarningTape';
import { CollisionModal } from '@/components/task/CollisionModal';
import { toast } from '@/stores/toast-store';
import { Task, Project } from '@/types/api';
import { Zap, Play, CheckCircle, ShieldAlert, Sparkles, User, RefreshCw } from 'lucide-react';

export default function DemoConflictPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // Simulation inputs
  const [sarahEdit, setSarahEdit] = useState('Sarah: Redesigned WebSocket Heartbeat with 5s backoff');
  const [alexEdit, setAlexEdit] = useState('Alex: Refactored WebSocket Reconnect with Exponential Jitter');

  // Conflict modal state
  const [collisionOpen, setCollisionOpen] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [stepLogs, setStepLogs] = useState<string[]>([]);

  // Fetch Projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  });

  // Set default project
  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Fetch Tasks for selected project
  const { data: tasks = [], refetch: refetchTasks } = useQuery<Task[]>({
    queryKey: ['tasks', selectedProjectId],
    queryFn: () => (selectedProjectId ? api.tasks.listByProject(selectedProjectId) : []),
    enabled: !!selectedProjectId,
  });

  // Set default task
  React.useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  const currentTask = tasks.find((t) => t.id === selectedTaskId);

  const runSimulation = async () => {
    if (!currentTask) {
      toast.error('SELECT A TASK FIRST');
      return;
    }

    setIsSimulating(true);
    setStepLogs([]);

    const log = (msg: string) => setStepLogs((prev) => [...prev, msg]);

    try {
      log(`[STEP 1] Captured initial task base state: "${currentTask.title}" (Version #${currentTask.version})`);

      // 1. Authenticate in background as Sarah
      log(`[STEP 2] Simulating collaborator (Sarah Chen) login via /auth/login...`);
      const sarahLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: DEMO_USERS.sarah.email,
          password: DEMO_USERS.sarah.password,
        }),
      });
      const sarahLoginJson = await sarahLoginRes.json();
      const sarahToken = sarahLoginJson.data?.tokens?.accessToken || sarahLoginJson.data?.accessToken;

      // 2. Sarah commits an update on the same task
      log(`[STEP 3] Sarah commits changes to title: "${sarahEdit}" (OCC version #${currentTask.version})...`);
      const sarahUpdateRes = await fetch(`http://localhost:5000/api/v1/tasks/${currentTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sarahToken}`,
          'If-Match': String(currentTask.version),
        },
        body: JSON.stringify({
          title: sarahEdit,
          version: currentTask.version,
        }),
      });

      if (!sarahUpdateRes.ok) {
        throw new Error('Sarah concurrent update failed');
      }

      const sarahJson = await sarahUpdateRes.json();
      const updatedBySarah = sarahJson.data;
      log(`[STEP 4] Server accepted Sarah's update! Server task revision is now #${updatedBySarah.version}.`);

      // 3. Current user (Alex) attempts to commit conflicting title with outdated version
      log(`[STEP 5] Alex (your client) now submits conflicting title "${alexEdit}" with old version #${currentTask.version}...`);
      
      const alexRes = await fetch(`http://localhost:5000/api/v1/tasks/${currentTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenStorage.getAccessToken() || ''}`,
          'If-Match': String(currentTask.version),
        },
        body: JSON.stringify({
          title: alexEdit,
          version: currentTask.version,
        }),
      });

      log(`[STEP 6] Server response code: HTTP ${alexRes.status} (${alexRes.statusText})`);

      if (alexRes.status === 409) {
        const errorJson = await alexRes.json();
        log(`[STEP 7] 409 VERSION_CONFLICT intercepted cleanly! Triggering Collision Resolver Modal.`);

        setConflictData({
          task: errorJson.error?.details?.currentTask || updatedBySarah,
          yourChanges: {
            title: alexEdit,
          },
          conflictingFields: ['title'],
          baseVersion: currentTask.version,
        });

        setCollisionOpen(true);
        toast.error('409 VERSION CONFLICT', 'Collision detected! Launching 3-way resolver modal.');
      } else {
        const resData = await alexRes.json();
        log(`Unexpected outcome: ${JSON.stringify(resData)}`);
      }
    } catch (err: any) {
      log(`[ERROR] Simulation halted: ${err.message}`);
      toast.error('SIMULATION ERROR', err.message);
    } finally {
      setIsSimulating(false);
      refetchTasks();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="border-4 border-ink bg-paper p-6 shadow-brutal-lg dark:bg-zinc-900 dark:border-paper flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stripes-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 bg-signal-red rounded-full border border-ink" />
            <span className="micro-label">INTERACTIVE CONCURRENCY LAB</span>
            <StickerBadge variant="red" size="sm" rotate="-1">
              409 COLLISION SIMULATOR
            </StickerBadge>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl uppercase tracking-tight text-ink dark:text-paper">
            OCC CONFLICT DEMO
          </h1>
          <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Simulate two users concurrently editing the exact same field in real-time. Experience the 409 collision interception, side-by-side diffing, and AI 3-way merge synthesis.
          </p>
        </div>

        <BrutalButton
          variant="primary"
          size="lg"
          disabled={isSimulating || !currentTask}
          onClick={runSimulation}
          className="shrink-0"
        >
          <Play className="h-5 w-5 mr-1" />
          {isSimulating ? 'SIMULATING...' : 'EXECUTE CONFLICT →'}
        </BrutalButton>
      </div>

      <WarningTape
        text="LIVE CONCURRENCY LAB // DIVERGENT BRANCH GENERATOR // ZERO DATA LOSS TEST"
        size="md"
        variant="warning"
      />

      {/* Target Task Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-3 border-ink bg-white shadow-brutal dark:bg-zinc-950 dark:border-paper">
        <div>
          <label className="micro-label">SELECT TARGET WORKSPACE:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setSelectedTaskId('');
            }}
            className="w-full mt-1 bg-paper border-2 border-ink font-mono text-xs font-bold p-2 uppercase dark:bg-zinc-900 dark:border-paper"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="micro-label">SELECT TARGET TASK:</label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full mt-1 bg-paper border-2 border-ink font-mono text-xs font-bold p-2 uppercase dark:bg-zinc-900 dark:border-paper"
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} (VER #{t.version})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Side-by-Side Simulation Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User 1: Sarah Chen */}
        <BrutalCard
          headerTitle="USER 1: SARAH CHEN (PEER CLIENT)"
          headerGlyph="star"
          headerBg="pink"
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink dark:text-paper">STATUS: REMOTE PEER</span>
              <span className="text-[10px] bg-hot-pink text-ink px-1 font-bold">WINS FIRST</span>
            </div>
            <BrutalInput
              label="SARAH'S MODIFIED VALUE:"
              value={sarahEdit}
              onChange={(e) => setSarahEdit(e.target.value)}
            />
            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 font-bold">
              Sarah will commit this title to the database first, updating the task version from #{currentTask?.version} to #{Number(currentTask?.version || 1) + 1}.
            </p>
          </div>
        </BrutalCard>

        {/* User 2: Current User (Alex) */}
        <BrutalCard
          headerTitle="USER 2: ALEX RIVERS (YOUR ACTIVE CLIENT)"
          headerGlyph="arrow"
          headerBg="blue"
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink dark:text-paper">STATUS: LOCAL BROWSER</span>
              <span className="text-[10px] bg-electric-blue text-white px-1 font-bold">OCC 409 TRIGGER</span>
            </div>
            <BrutalInput
              label="ALEX'S MODIFIED VALUE:"
              value={alexEdit}
              onChange={(e) => setAlexEdit(e.target.value)}
            />
            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 font-bold">
              Your client attempts to save this title using outdated base version #{currentTask?.version}. The server will reject with HTTP 409.
            </p>
          </div>
        </BrutalCard>
      </div>

      {/* Execution Step Logs */}
      {stepLogs.length > 0 && (
        <BrutalCard headerTitle="OCC CONCURRENCY EXECUTION LOG" headerBg="ink">
          <div className="p-3 bg-zinc-950 text-toxic-green font-mono text-xs space-y-1.5 overflow-x-auto border-2 border-ink">
            {stepLogs.map((l, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-toxic-green font-bold">{idx + 1}.</span>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </BrutalCard>
      )}

      {/* Collision Modal */}
      {collisionOpen && conflictData && (
        <CollisionModal
          open={collisionOpen}
          onOpenChange={setCollisionOpen}
          task={conflictData.task}
          yourChanges={conflictData.yourChanges}
          conflictingFields={conflictData.conflictingFields}
          baseVersion={conflictData.baseVersion}
          onResolved={(resolved) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
            toast.success('CONFLICT SUCCESSFULLY RESOLVED', `Task title is now: "${resolved.title}"`);
          }}
        />
      )}
    </div>
  );
}
