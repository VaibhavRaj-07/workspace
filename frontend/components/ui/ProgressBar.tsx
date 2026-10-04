import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  segments?: number;
  color?: 'yellow' | 'green' | 'pink' | 'blue' | 'red' | 'orange' | 'cyan' | 'ink';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  segments = 10,
  color = 'green',
  showLabel = true,
  size = 'md',
  className,
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const filledSegments = Math.round((percentage / 100) * segments);

  const colors = {
    yellow: 'bg-acid-yellow',
    green: 'bg-toxic-green',
    pink: 'bg-hot-pink',
    blue: 'bg-electric-blue',
    red: 'bg-signal-red',
    orange: 'bg-hazard-orange',
    cyan: 'bg-neon-cyan',
    ink: 'bg-ink dark:bg-paper',
  };

  const heights = {
    sm: 'h-3',
    md: 'h-5',
    lg: 'h-7',
  };

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)} {...props}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs font-mono font-black uppercase text-ink dark:text-paper">
          <span>PROGRESS</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-paper border-3 border-ink p-1 flex gap-1 shadow-brutal-sm dark:bg-zinc-900 dark:border-paper dark:shadow-brutal-dark-sm',
          heights[size]
        )}
      >
        {Array.from({ length: segments }).map((_, index) => {
          const isFilled = index < filledSegments;
          return (
            <div
              key={index}
              className={cn(
                'flex-1 border-r border-ink/20 last:border-r-0 transition-colors duration-200',
                isFilled
                  ? colors[color]
                  : 'bg-zinc-200 dark:bg-zinc-800'
              )}
            />
          );
        })}
      </div>
    </div>
  );
};
