import React from 'react';
import { cn } from '@/lib/utils';

export interface WarningTapeProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  variant?: 'warning' | 'danger';
  repeatCount?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const WarningTape: React.FC<WarningTapeProps> = ({
  text = 'CAUTION // CONFLICT DETECTED // OVERRIDE HAZARD',
  variant = 'warning',
  repeatCount = 4,
  size = 'md',
  className,
  ...props
}) => {
  const heights = {
    sm: 'h-6 text-[10px]',
    md: 'h-8 text-xs',
    lg: 'h-10 text-sm',
  };

  const tapeClass = variant === 'danger' ? 'bg-danger-tape' : 'bg-warning-tape';

  const fullText = Array(repeatCount).fill(`⚠ ${text} ⚠`).join('   ');

  return (
    <div
      className={cn(
        'w-full border-y-3 border-ink flex items-center justify-center overflow-hidden font-mono font-black tracking-widest text-ink select-none relative shadow-brutal-sm',
        tapeClass,
        heights[size],
        className
      )}
      {...props}
    >
      <div className="bg-ink text-acid-yellow px-4 py-0.5 border-2 border-acid-yellow transform skew-x-[-12deg] shadow-brutal-sm">
        <span className="inline-block transform skew-x-[12deg] uppercase font-bold">{text}</span>
      </div>
    </div>
  );
};
