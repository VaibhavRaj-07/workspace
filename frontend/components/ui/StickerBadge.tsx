import React from 'react';
import { cn } from '@/lib/utils';

export interface StickerBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'yellow'
    | 'pink'
    | 'blue'
    | 'red'
    | 'green'
    | 'orange'
    | 'violet'
    | 'cyan'
    | 'paper'
    | 'ink';
  rotate?: '-3' | '-2' | '-1' | '0' | '1' | '2' | '3';
  size?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

export const StickerBadge: React.FC<StickerBadgeProps> = ({
  children,
  variant = 'yellow',
  rotate = '0',
  size = 'md',
  shadow = true,
  className,
  ...props
}) => {
  const variants = {
    yellow: 'bg-acid-yellow text-ink border-ink dark:border-ink font-black',
    pink: 'bg-hot-pink text-ink border-ink dark:border-ink font-black',
    blue: 'bg-[#1D4ED8] text-white border-ink dark:border-paper font-bold',
    red: 'bg-[#DC2626] text-white border-ink dark:border-paper font-bold',
    green: 'bg-toxic-green text-ink border-ink dark:border-ink font-black',
    orange: 'bg-hazard-orange text-ink border-ink dark:border-ink font-black',
    violet: 'bg-[#7C3AED] text-white border-ink dark:border-paper font-bold',
    cyan: 'bg-neon-cyan text-ink border-ink dark:border-ink font-black',
    paper: 'bg-paper text-ink border-ink dark:bg-zinc-800 dark:text-paper dark:border-paper font-bold',
    ink: 'bg-ink text-paper border-ink dark:bg-paper dark:text-ink font-bold',
  };

  const rotations = {
    '-3': '-rotate-3',
    '-2': '-rotate-2',
    '-1': '-rotate-1',
    '0': 'rotate-0',
    '1': 'rotate-1',
    '2': 'rotate-2',
    '3': 'rotate-3',
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 border-2 font-mono font-bold tracking-wider',
    md: 'text-xs px-2.5 py-1 border-3 font-mono font-bold tracking-wider',
    lg: 'text-sm px-3.5 py-1.5 border-3 font-mono font-bold tracking-wider',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center uppercase select-none transition-transform duration-100',
        variants[variant],
        rotations[rotate],
        sizes[size],
        shadow ? 'shadow-brutal-sm' : '',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
