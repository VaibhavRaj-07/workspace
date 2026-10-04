import React from 'react';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { WarningTape } from '@/components/ui/WarningTape';
import { Sparkles, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';
import { TaskRiskData, Task } from '@/types/api';

export const AtRiskTasksCard: React.FC<{
  atRiskTasks?: Array<{ task: Partial<Task>; riskScore: number; riskLevel: string; topFactors?: any[] }>;
  onSelectTask?: (taskId: string) => void;
}> = ({ atRiskTasks = [], onSelectTask }) => {
  return (
    <BrutalCard
      headerTitle="AI DEADLINE RISK INTELLIGENCE"
      headerGlyph="triangle"
      headerBg="ink"
      className="h-full flex flex-col justify-between"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#C41C1C] dark:text-[#FF4D4D]">
            <Sparkles className="h-4 w-4" />
            <span>XGBOOST ML PREDICTOR ✨</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            11-FACTOR LIFECYCLE MODEL
          </span>
        </div>

        {atRiskTasks.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-ink/30 font-mono text-xs text-zinc-500">
            ✓ ALL ACTIVE TASKS WITHIN NOMINAL DELIVERY HORIZONS.
          </div>
        ) : (
          <div className="space-y-2.5">
            {atRiskTasks.slice(0, 3).map((item, idx) => {
              const isCritical = item.riskLevel === 'critical' || item.riskScore > 75;
              return (
                <div
                  key={item.task?.id || idx}
                  onClick={() => item.task?.id && onSelectTask && onSelectTask(item.task.id)}
                  className="p-3 border-3 border-ink bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:border-paper shadow-brutal-sm cursor-pointer transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs truncate uppercase font-mono group-hover:text-signal-red">
                      {item.task?.title || 'System Task'}
                    </span>
                    <StickerBadge
                      variant={isCritical ? 'red' : 'orange'}
                      size="sm"
                      rotate={isCritical ? '-2' : '1'}
                    >
                      {item.riskScore}% RISK
                    </StickerBadge>
                  </div>

                  {item.topFactors && item.topFactors.length > 0 && (
                    <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                      ↳ <span className="font-bold">{item.topFactors[0].reason || item.topFactors[0].feature}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t-2 border-ink/10 flex items-center justify-between font-mono text-[10px] text-zinc-500">
        <span>✨ ADVISORY PROJECTIONS</span>
        <span>SYNTHETIC + RECURSIVE METRICS</span>
      </div>
    </BrutalCard>
  );
};
