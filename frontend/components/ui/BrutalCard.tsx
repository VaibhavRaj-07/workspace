import React from 'react';
import { cn } from '@/lib/utils';

export interface BrutalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  headerTitle?: string;
  headerGlyph?: 'arrow' | 'star' | 'square' | 'triangle' | 'cross' | string;
  headerRight?: React.ReactNode;
  headerBg?: 'ink' | 'yellow' | 'pink' | 'blue' | 'red' | 'green';
  pattern?: 'grid' | 'dots' | 'stripes' | 'checker' | 'none';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverElevate?: boolean;
}

export const BrutalCard: React.FC<BrutalCardProps> = ({
  headerTitle,
  headerGlyph = 'arrow',
  headerRight,
  headerBg = 'ink',
  pattern = 'none',
  shadow = 'md',
  hoverElevate = false,
  className,
  children,
  ...props
}) => {
  const glyphMap: Record<string, string> = {
    arrow: '→',
    star: '✱',
    square: '■',
    triangle: '▲',
    cross: '✕',
  };

  const headerBgs = {
    ink: 'bg-ink text-paper dark:bg-zinc-900 dark:text-acid-yellow',
    yellow: 'bg-acid-yellow text-ink',
    pink: 'bg-hot-pink text-ink',
    blue: 'bg-[#1D4ED8] text-white',
    red: 'bg-signal-red text-white font-bold',
    green: 'bg-toxic-green text-ink',
  };

  const patterns = {
    none: '',
    grid: 'bg-grid-pattern',
    dots: 'bg-dots-pattern',
    stripes: 'bg-stripes-subtle',
    checker: 'bg-checker-pattern',
  };

  const shadows = {
    none: '',
    sm: 'shadow-brutal-sm dark:shadow-brutal-dark-sm',
    md: 'shadow-brutal dark:shadow-brutal-dark',
    lg: 'shadow-brutal-lg dark:shadow-brutal-dark-lg',
    xl: 'shadow-brutal-xl dark:shadow-brutal-dark-xl',
  };

  const glyphText = glyphMap[headerGlyph] || headerGlyph;

  return (
    <div
      className={cn(
        'bg-paper border-3 border-ink flex flex-col relative transition-all duration-150',
        'dark:bg-zinc-900 dark:border-paper',
        shadows[shadow],
        hoverElevate ? 'hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg' : '',
        patterns[pattern],
        className
      )}
      {...props}
    >
      {headerTitle && (
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 border-b-3 border-ink select-none',
            headerBgs[headerBg]
          )}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-black">{glyphText}</span>
            <span className="micro-label tracking-widest font-black text-inherit">{headerTitle}</span>
          </div>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </div>
      )}
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
};
