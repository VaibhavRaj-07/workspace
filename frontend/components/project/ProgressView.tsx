'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { StatBlock } from '@/components/ui/StatBlock';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectProgress, ProjectRiskData, Project } from '@/types/api';
import { Sparkles, ShieldAlert, Clock, CheckCircle, TrendingUp } from 'lucide-react';

export interface ProgressViewProps {
  projectId: string;
  project?: Project;
  onSelectTask?: (taskId: string) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  projectId,
  project,
  onSelectTask,
}) => {
  // Fetch Project Progress Metrics
  const { data: progress } = useQuery<ProjectProgress>({
    queryKey: ['project-progress', projectId],
    queryFn: () => api.dashboard.getProjectProgress(projectId),
  });

  // Fetch Project Risk Predictions
  const { data: risk } = useQuery<ProjectRiskData>({
    queryKey: ['project-risk', projectId],
    queryFn: () => api.ai.getProjectRisk(projectId),
  });

  const completionRate = Math.round((progress?.completionRate || 0) * 100);
  const totalTasks = progress?.totalTasks || 0;
  const doneTasks = progress?.doneTasks || 0;
  const overdueCount = progress?.overdueCount || 0;
  const daysLeft = progress?.daysToDeadline;

  return (
    <div className="space-y-8">
      {/* High-Level Metric Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBlock
          label="PROJECT COMPLETION"
          value={`${completionRate}%`}
          subValue={`${doneTasks} OF ${totalTasks} TASKS VERIFIED`}
          badge={completionRate === 100 ? 'COMPLETED' : 'IN PROGRESS'}
          badgeColor={completionRate === 100 ? 'green' : 'yellow'}
          bgPattern
        />

        <StatBlock
          label="OVERDUE TASKS"
          value={overdueCount < 10 ? `0${overdueCount}` : overdueCount}
          subValue={overdueCount > 0 ? 'CRITICAL DELIVERY BOTTLENECK' : 'ZERO OVERDUE ITEMS'}
          badge={overdueCount > 0 ? 'CRITICAL' : 'CLEAN'}
          badgeColor={overdueCount > 0 ? 'red' : 'green'}
          variant={overdueCount > 0 ? 'outlined' : 'solid'}
        />

        <StatBlock
          label="DEADLINE COUNTDOWN"
          value={daysLeft !== null && daysLeft !== undefined ? `${daysLeft}D` : '∞'}
          subValue={
            daysLeft !== null && daysLeft !== undefined
              ? daysLeft < 0
                ? 'DEADLINE BREACHED'
                : 'DAYS TO TARGET LAUNCH'
              : 'NO FIXED DEADLINE'
          }
          badge={daysLeft !== null && daysLeft !== undefined && daysLeft < 3 ? 'URGENT' : 'ON TRACK'}
          badgeColor={daysLeft !== null && daysLeft !== undefined && daysLeft < 3 ? 'orange' : 'cyan'}
        />

        <StatBlock
          label="OVERALL RISK SCORE"
          value={risk && risk.overallRiskScore !== undefined ? `${risk.overallRiskScore}%` : 'N/A'}
          subValue={risk ? `${(risk.overallRiskLevel || 'evaluating').toUpperCase()} RISK TIER` : 'CALCULATING...'}
          badge="AI RISK MODEL"
          badgeColor={
            risk?.overallRiskLevel === 'critical'
              ? 'red'
              : risk?.overallRiskLevel === 'high'
              ? 'orange'
              : 'green'
          }
          variant="inverted"
        />
      </div>

      {/* Main Chunky Progress Bar */}
      <BrutalCard headerTitle="OVERALL WORKSPACE MILESTONE PROGRESS" headerBg="yellow">
        <div className="space-y-3 p-2">
          <ProgressBar value={completionRate} segments={20} size="lg" color="green" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 font-mono text-xs font-bold text-zinc-600 dark:text-zinc-400">
            <div>TODO: {progress?.todoTasks || 0}</div>
            <div>IN PROG: {progress?.inProgressTasks || 0}</div>
            <div>IN REVIEW: {progress?.inReviewTasks || 0}</div>
            <div>COMPLETED: {progress?.doneTasks || 0}</div>
          </div>
        </div>
      </BrutalCard>

      {/* AI Delivery Risk Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="ai-risk-gauge">
        {/* Risk Gauge & Top At-Risk Tasks */}
        <div className="lg:col-span-7">
          <BrutalCard
            headerTitle="AI DELIVERY RISK ANALYSIS"
            headerGlyph="triangle"
            headerBg="red"
            className="h-full"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span>ML RISK MODEL (WITH RULE-BASED FALLBACK) ✨</span>
                </span>
                <StickerBadge
                  variant={
                    risk?.overallRiskLevel === 'critical'
                      ? 'red'
                      : risk?.overallRiskLevel === 'high'
                      ? 'orange'
                      : 'yellow'
                  }
                  size="sm"
                >
                  {risk?.overallRiskLevel?.toUpperCase() || 'EVALUATING'}
                </StickerBadge>
              </div>

              {/* Chunky Risk Meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-xs font-bold">
                  <span>AGGREGATE RISK PROJECTION</span>
                  <span>{risk?.overallRiskScore || 0}%</span>
                </div>
                <ProgressBar
                  value={risk?.overallRiskScore || 0}
                  segments={10}
                  size="md"
                  color={
                    (risk?.overallRiskScore || 0) > 70
                      ? 'red'
                      : (risk?.overallRiskScore || 0) > 40
                      ? 'orange'
                      : 'green'
                  }
                />
              </div>

              {/* Top At-Risk Ranked Tasks */}
              <div className="space-y-2 pt-2 font-mono text-xs">
                <span className="micro-label text-zinc-600 dark:text-zinc-400 font-bold">TOP AT-RISK WORK ITEMS:</span>
                {(!risk?.topAtRiskTasks || risk.topAtRiskTasks.length === 0) ? (
                  <div className="p-4 text-center border-2 border-dashed border-ink/30 text-zinc-600 dark:text-zinc-400">
                    ✓ NO HIGH-RISK TASKS CURRENTLY FLAGGED.
                  </div>
                ) : (
                  risk.topAtRiskTasks.map((item, idx) => {
                    const taskId = item.taskId || item.task?.id || `task-${idx}`;
                    const taskTitle = item.taskTitle || item.task?.title || (item as any).title || 'Untitled Task';
                    return (
                      <div
                        key={taskId}
                        onClick={() => onSelectTask && onSelectTask(taskId)}
                        className="p-3 border-2 border-ink bg-white hover:bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between gap-3 shadow-brutal-sm cursor-pointer transition-all group"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold truncate group-hover:text-signal-red">
                            {taskTitle}
                          </span>
                          {item.topFactors && item.topFactors[0] && (
                            <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                              ↳ {item.topFactors[0].reason || item.topFactors[0].feature}
                            </span>
                          )}
                        </div>

                        <StickerBadge
                          variant={item.riskLevel === 'critical' ? 'red' : 'orange'}
                          size="sm"
                          rotate="-1"
                        >
                          {item.riskScore}%
                        </StickerBadge>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </BrutalCard>
        </div>

        {/* Assignee Breakdown */}
        <div className="lg:col-span-5">
          <BrutalCard
            headerTitle="WORKLOAD BY COLLABORATOR"
            headerGlyph="star"
            headerBg="ink"
            className="h-full"
          >
            <div className="space-y-3 font-mono text-xs">
              {(!progress?.tasksByAssignee || progress.tasksByAssignee.length === 0) ? (
                <div className="p-4 text-center text-zinc-600 dark:text-zinc-400">NO ASSIGNEE METRICS</div>
              ) : (
                progress.tasksByAssignee.map((a, idx) => (
                  <div
                    key={a.userId || idx}
                    className="p-3 border-2 border-ink bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shadow-brutal-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar user={{ name: a.userName, avatarUrl: a.avatarUrl }} size="sm" />
                      <div className="flex flex-col">
                        <span className="font-bold uppercase">{a.userName}</span>
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                          {a.completedCount} / {a.taskCount} TASKS DONE
                        </span>
                      </div>
                    </div>

                    <span className="font-black text-sm px-2 py-0.5 border-2 border-ink bg-acid-yellow text-ink">
                      {a.taskCount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </BrutalCard>
        </div>
      </div>
    </div>
  );
};
