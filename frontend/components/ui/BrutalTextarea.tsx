import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BrutalTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  badge?: string;
}

export const BrutalTextarea = forwardRef<HTMLTextAreaElement, BrutalTextareaProps>(
  ({ label, error, helperText, badge, className, id, rows = 4, ...props }, ref) => {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={textareaId}
              className="micro-label font-bold text-ink dark:text-paper"
            >
              {label}
            </label>
            {badge && (
              <span className="text-[10px] font-mono font-bold bg-acid-yellow px-1.5 py-0.5 border-2 border-ink text-ink uppercase">
                {badge}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'p-3 bg-white text-ink border-3 border-ink font-mono text-sm shadow-brutal-sm transition-all resize-y',
            'placeholder:text-zinc-400 placeholder:font-sans placeholder:text-sm',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-acid-yellow',
            'disabled:bg-zinc-200 disabled:cursor-not-allowed',
            'dark:bg-zinc-950 dark:text-paper dark:border-paper dark:shadow-brutal-dark-sm',
            error ? 'border-signal-red ring-2 ring-signal-red dark:border-signal-red' : '',
            className
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs font-mono font-bold text-signal-red dark:text-red-400 flex items-center gap-1">
            <span>⚠</span> {error}
          </span>
        ) : helperText ? (
          <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

BrutalTextarea.displayName = 'BrutalTextarea';
