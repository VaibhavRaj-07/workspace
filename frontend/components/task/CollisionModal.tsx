'use client';

import React, { useState } from 'react';
import { BrutalModal } from '@/components/ui/BrutalModal';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { WarningTape } from '@/components/ui/WarningTape';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api/client';
import { Task, AIMergeResponse, AIMergeFieldSuggestion } from '@/types/api';
import { toast } from '@/stores/toast-store';
import { Sparkles, Check, ArrowRight, ShieldAlert, GitMerge, FileText, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CollisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  yourChanges: Partial<Task>;
  conflictingFields?: string[];
  baseVersion: number;
  onResolved: (resolvedTask: Task) => void;
}

// Simple word-level diff highlight helper
function renderDiff(textA: string = '', textB: string = '') {
  const wordsA = String(textA).split(/\s+/);
  const wordsB = String(textB).split(/\s+/);

  return (
    <div className="font-mono text-xs leading-relaxed">
      {wordsB.map((word, idx) => {
        const isNew = !wordsA.includes(word);
        return (
          <span
            key={idx}
            className={isNew ? 'bg-toxic-green text-ink font-bold px-1 py-0.5 mx-0.5' : 'mr-1'}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

export const CollisionModal: React.FC<CollisionModalProps> = ({
  open,
  onOpenChange,
  task,
  yourChanges,
  conflictingFields = ['title', 'description'],
  baseVersion,
  onResolved,
}) => {
  // Manual data state for per-field resolutions
  const [manualData, setManualData] = useState<Record<string, any>>({
    title: yourChanges.title !== undefined ? yourChanges.title : task.title,
    description: yourChanges.description !== undefined ? yourChanges.description : task.description,
    status: yourChanges.status !== undefined ? yourChanges.status : task.status,
    priority: yourChanges.priority !== undefined ? yourChanges.priority : task.priority,
    assigneeId: yourChanges.assigneeId !== undefined ? yourChanges.assigneeId : task.assigneeId,
  });

  const [fieldDecisions, setFieldDecisions] = useState<Record<string, 'mine' | 'theirs' | 'manual' | 'ai'>>({});
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AIMergeFieldSuggestion>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request AI Merge Suggestion
  const handleRequestAIMerge = async () => {
    setIsAiLoading(true);
    try {
      const conflictsPayload: Record<string, { baseValue: any; myValue: any; theirValue: any }> = {};

      conflictingFields.forEach((f) => {
        conflictsPayload[f] = {
          baseValue: (task as any)[f] || '',
          myValue: (yourChanges as any)[f] || (task as any)[f] || '',
          theirValue: (task as any)[f] || '',
        };
      });

      const res = await api.ai.getMergeSuggestion(task.id, {
        conflicts: conflictsPayload,
        baseVersion,
      });

      if (res && res.suggestions) {
        setAiSuggestions(res.suggestions);
        toast.success('AI MERGE READY ✨', 'Synthesized 3-way conflict suggestions generated.');
      } else {
        toast.info('AI MERGE UNAVAILABLE', 'Using local union fallback.');
      }
    } catch (err: any) {
      toast.warning('AI SERVICE OFFLINE', 'Falling back to manual resolution mode.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyAISuggestion = (field: string) => {
    if (aiSuggestions[field]) {
      setManualData((prev) => ({
        ...prev,
        [field]: aiSuggestions[field].mergedValue,
      }));
      setFieldDecisions((prev) => ({
        ...prev,
        [field]: 'ai',
      }));
      toast.info('AI VALUE APPLIED', `Merged value loaded into field "${field}".`);
    }
  };

  const handleKeepMine = (field: string) => {
    setManualData((prev) => ({
      ...prev,
      [field]: (yourChanges as any)[field],
    }));
    setFieldDecisions((prev) => ({
      ...prev,
      [field]: 'mine',
    }));
  };

  const handleKeepTheirs = (field: string) => {
    setManualData((prev) => ({
      ...prev,
      [field]: (task as any)[field],
    }));
    setFieldDecisions((prev) => ({
      ...prev,
      [field]: 'theirs',
    }));
  };

  const handleKeepAllMine = () => {
    const updated: any = {};
    Object.keys(yourChanges).forEach((f) => {
      updated[f] = (yourChanges as any)[f];
    });
    setManualData((prev) => ({ ...prev, ...updated }));
    const dec: any = {};
    conflictingFields.forEach((f) => (dec[f] = 'mine'));
    setFieldDecisions(dec);
  };

  const handleKeepAllTheirs = () => {
    const updated: any = {};
    conflictingFields.forEach((f) => {
      updated[f] = (task as any)[f];
    });
    setManualData((prev) => ({ ...prev, ...updated }));
    const dec: any = {};
    conflictingFields.forEach((f) => (dec[f] = 'theirs'));
    setFieldDecisions(dec);
  };

  const handleFinalSubmit = async (strategy: 'manual' | 'keep_mine' | 'keep_theirs') => {
    setIsSubmitting(true);
    try {
      const resolved = await api.tasks.resolveConflict(task.id, {
        strategy,
        baseVersion,
        manualData: strategy === 'manual' ? manualData : undefined,
      });

      toast.success('CONFLICT RESOLVED', `Task revision #${resolved.version} committed.`);
      onResolved(resolved);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('RESOLUTION FAILED', err.message || 'Could not commit conflict resolution');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BrutalModal
      open={open}
      onOpenChange={onOpenChange}
      title="OCC COLLISION DETECTED // 3-WAY CONFLICT RESOLVER"
      glyph="⚠"
      hazardHeader
      hazardText="⚠ VERSION CONFLICT 409 // CONCURRENT REVISION HAZARD // RESOLVE OVERRIDE"
      maxWidth="4xl"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2">
            <BrutalButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              DISCARD EDITS
            </BrutalButton>
            <BrutalButton variant="secondary" size="sm" onClick={handleKeepAllTheirs}>
              ACCEPT ALL THEIRS
            </BrutalButton>
            <BrutalButton variant="pink" size="sm" onClick={handleKeepAllMine}>
              FORCE ALL MINE
            </BrutalButton>
          </div>

          <BrutalButton
            variant="primary"
            size="md"
            disabled={isSubmitting}
            onClick={() => handleFinalSubmit('manual')}
          >
            {isSubmitting ? 'COMMITTING RESOLUTION...' : 'COMMIT RESOLVED TASK →'}
          </BrutalButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Banner */}
        <div className="p-4 border-3 border-ink bg-acid-yellow/20 dark:bg-acid-yellow/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-signal-red shrink-0 mt-0.5" />
            <div>
              <h4 className="font-display text-sm uppercase tracking-wider text-ink dark:text-paper">
                CONCURRENT MODIFICATIONS DETECTED ON TASK #{task.id.slice(0, 8)}
              </h4>
              <p className="font-mono text-xs text-ink dark:text-paper font-bold mt-0.5">
                Server is at version #{task.version}; your edits were based on version #{baseVersion}. Choose how each field should be merged.
              </p>
            </div>
          </div>

          <BrutalButton
            variant="primary"
            size="sm"
            onClick={handleRequestAIMerge}
            disabled={isAiLoading}
            className="shrink-0"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {isAiLoading ? 'SYNTHESIZING...' : '✨ SUGGEST AI MERGE'}
          </BrutalButton>
        </div>

        {/* Conflicting Fields Grid */}
        <div className="space-y-6">
          {conflictingFields.map((field) => {
            const myVal = (yourChanges as any)[field] ?? (task as any)[field];
            const theirVal = (task as any)[field];
            const currentChosen = manualData[field];
            const decision = fieldDecisions[field] || 'custom';
            const aiSug = aiSuggestions[field];

            return (
              <div
                key={field}
                className="border-3 border-ink p-4 bg-white dark:bg-zinc-900 shadow-brutal-sm space-y-3"
              >
                {/* Field Header */}
                <div className="flex items-center justify-between border-b-2 border-ink pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm uppercase">
                      FIELD: {field.toUpperCase()}
                    </span>
                    <StickerBadge variant="red" size="sm" rotate="-1">
                      CONFLICT
                    </StickerBadge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleKeepMine(field)}
                      className={cn(
                        'px-2 py-1 font-mono text-[10px] font-bold uppercase border-2 border-ink transition-all',
                        decision === 'mine'
                          ? 'bg-electric-blue text-white shadow-brutal-sm'
                          : 'bg-paper text-ink hover:bg-zinc-100 dark:bg-zinc-800 dark:text-paper'
                      )}
                    >
                      KEEP MINE
                    </button>
                    <button
                      onClick={() => handleKeepTheirs(field)}
                      className={cn(
                        'px-2 py-1 font-mono text-[10px] font-bold uppercase border-2 border-ink transition-all',
                        decision === 'theirs'
                          ? 'bg-hot-pink text-ink shadow-brutal-sm'
                          : 'bg-paper text-ink hover:bg-zinc-100 dark:bg-zinc-800 dark:text-paper'
                      )}
                    >
                      KEEP THEIRS
                    </button>
                  </div>
                </div>

                {/* 3-Way Comparison Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                  {/* Base */}
                  <div className="p-3 border-2 border-ink bg-zinc-100 dark:bg-zinc-800/60 space-y-1">
                    <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-200">
                      <span>BASE VERSION (#{baseVersion}):</span>
                      <span className="text-[10px] bg-zinc-700 text-white px-1">ORIGIN</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-zinc-950 border border-ink/40 min-h-[40px] whitespace-pre-wrap">
                      {String((task as any)[field] ?? '(empty)')}
                    </div>
                  </div>

                  {/* Mine */}
                  <div className="p-3 border-2 border-ink bg-blue-50 dark:bg-blue-950/40 space-y-1">
                    <div className="flex items-center justify-between font-bold text-blue-900 dark:text-blue-300">
                      <span>YOUR VERSION (UNSAVED):</span>
                      <span className="text-[10px] bg-electric-blue text-white px-1">LOCAL</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-zinc-950 border border-ink/40 min-h-[40px] whitespace-pre-wrap">
                      {String(myVal || '(empty)')}
                    </div>
                  </div>

                  {/* Theirs */}
                  <div className="p-3 border-2 border-ink bg-pink-50 dark:bg-pink-950/40 space-y-1">
                    <div className="flex items-center justify-between font-bold text-pink-900 dark:text-pink-300">
                      <span>THEIR VERSION (SERVER #{task.version}):</span>
                      <span className="text-[10px] bg-hot-pink text-ink px-1 truncate max-w-[150px]">
                        BY {task.assignee?.name || 'COLLABORATOR'} {task.updatedAt ? `• ${new Date(task.updatedAt).toLocaleTimeString()}` : ''}
                      </span>
                    </div>
                    <div className="p-2 bg-white dark:bg-zinc-950 border border-ink/40 min-h-[40px] whitespace-pre-wrap">
                      {renderDiff(String(myVal || ''), String(theirVal || ''))}
                    </div>
                  </div>
                </div>

                {/* AI Suggestion Card if available */}
                {aiSug && (
                  <div className="p-3 border-3 border-ink bg-acid-yellow/25 dark:bg-acid-yellow/10 space-y-2 animate-stamp">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Sparkles className="h-4 w-4 text-ink" />
                        <span>✨ AI 3-WAY SYNTHESIS</span>
                        {aiSug.strategyUsed?.toLowerCase().includes('fallback') ||
                        aiSug.strategyUsed?.toLowerCase().includes('rule') ||
                        aiSug.strategyUsed?.toLowerCase().includes('local') ||
                        !aiSug.strategyUsed ? (
                          <span className="text-[10px] bg-ink text-acid-yellow px-1 font-mono">
                            GENERATED WITHOUT EXTERNAL AI
                          </span>
                        ) : (
                          <span className="text-[10px] bg-ink text-acid-yellow px-1 font-mono">
                            CLAUDE AI SYNTHESIZED ({Math.round(aiSug.confidence * 100)}%)
                          </span>
                        )}
                      </div>
                      <BrutalButton
                        variant="ink"
                        size="sm"
                        onClick={() => handleApplyAISuggestion(field)}
                      >
                        USE THIS MERGE →
                      </BrutalButton>
                    </div>
                    <div className="p-2 bg-white dark:bg-zinc-950 border-2 border-ink font-mono text-xs whitespace-pre-wrap font-bold">
                      {aiSug.mergedValue}
                    </div>
                    <div className="text-[11px] font-mono text-ink dark:text-paper font-bold">
                      Rationale: {aiSug.explanation}
                    </div>
                  </div>
                )}

                {/* Manual Edit Input Box */}
                <div className="space-y-1 pt-1">
                  <span className="micro-label text-zinc-700 dark:text-zinc-300 font-bold">
                    EDIT RESOLUTION VALUE FOR &quot;{field.toUpperCase()}&quot;:
                  </span>
                  <textarea
                    rows={2}
                    value={currentChosen || ''}
                    onChange={(e) => {
                      setManualData({ ...manualData, [field]: e.target.value });
                      setFieldDecisions({ ...fieldDecisions, [field]: 'manual' });
                    }}
                    className="w-full p-2.5 bg-white text-ink border-2 border-ink font-mono text-xs dark:bg-zinc-950 dark:text-paper dark:border-paper"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BrutalModal>
  );
};
