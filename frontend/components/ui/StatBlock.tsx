import React from 'react';
import { cn } from '@/lib/utils';

export interface StatBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  subValue?: string;
  badge?: string;
  badgeColor?: 'yellow' | 'pink' | 'blue' | 'red' | 'green' | 'orange' | 'cyan';
  variant?: 'solid' | 'outlined' | 'inverted';
  bgPattern?: boolean;
}

export const StatBlock: React.FC<StatBlockProps> = ({
  label,
  value,
  subValue,
  badge,
  badgeColor = 'yellow',
  variant = 'solid',
  bgPattern = false,
  className,
  ...props
}) => {
  const badgeColors = {
    yellow: 'bg-acid-yellow text-ink border-ink',
    pink: 'bg-hot-pink text-ink border-ink',
    blue: 'bg-electric-blue text-white border-ink',
    red: 'bg-signal-red text-white border-ink',
    green: 'bg-toxic-green text-ink border-ink',
    orange: 'bg-hazard-orange text-ink border-ink',
    cyan: 'bg-neon-cyan text-ink border-ink',
  };

  return (
    <div
      className={cn(
        'border-3 border-ink p-4 flex flex-col justify-between shadow-brutal relative overflow-hidden transition-all',
        'dark:border-paper dark:shadow-brutal-dark',
        variant === 'inverted'
          ? 'bg-ink text-paper dark:bg-paper dark:text-ink'
          : 'bg-paper text-ink dark:bg-zinc-900 dark:text-paper',
        bgPattern ? 'bg-grid-pattern' : '',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="micro-label font-bold tracking-widest">{label}</span>
        {badge && (
          <span
            className={cn(
              'text-[10px] font-mono font-black uppercase px-2 py-0.5 border-2',
              badgeColors[badgeColor]
            )}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="my-1">
        <span
          className={cn(
            'text-5xl lg:text-6xl font-black font-display tracking-tight leading-none',
            variant === 'outlined' ? 'text-stroke-ink' : ''
          )}
        >
          {value}
        </span>
      </div>

      {subValue && (
        <div className="mt-2 text-xs font-mono font-bold opacity-80 uppercase tracking-wide">
          {subValue}
        </div>
      )}
    </div>
  );
};
