import React from 'react';
import { cn } from '@/lib/utils';
import { BrutalButton } from './BrutalButton';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  glyph?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  glyph = '∅',
  title = 'NOTHING HERE. SUSPICIOUS.',
  description = 'No entities or tasks match your current filters. Start something new.',
  actionLabel,
  onAction,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'border-4 border-dashed border-ink p-8 flex flex-col items-center justify-center text-center bg-paper/50 bg-stripes-subtle my-4',
        'dark:border-paper dark:bg-zinc-900/50',
        className
      )}
      {...props}
    >
      <div className="text-6xl font-black font-display text-stroke-ink mb-2 select-none">
        {glyph}
      </div>
      <h3 className="text-xl font-display uppercase tracking-wide mb-1 text-ink dark:text-paper">
        {title}
      </h3>
      <p className="text-sm font-mono text-zinc-600 dark:text-zinc-400 max-w-md mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <BrutalButton variant="primary" size="sm" onClick={onAction}>
          + {actionLabel}
        </BrutalButton>
      )}
    </div>
  );
};
