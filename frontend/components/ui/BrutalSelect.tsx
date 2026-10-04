import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface Option {
  value: string;
  label: string;
}

export interface BrutalSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: Option[];
  error?: string;
  helperText?: string;
  badge?: string;
}

export const BrutalSelect = forwardRef<HTMLSelectElement, BrutalSelectProps>(
  (
    { label, options, error, helperText, badge, className, id, children, ...props },
    ref
  ) => {
    const selectId =
      id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={selectId}
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
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'h-11 w-full appearance-none px-3.5 pr-10 bg-white text-ink border-3 border-ink font-mono text-sm shadow-brutal-sm cursor-pointer transition-all',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-acid-yellow',
              'disabled:bg-zinc-200 disabled:cursor-not-allowed',
              'dark:bg-zinc-950 dark:text-paper dark:border-paper dark:shadow-brutal-dark-sm',
              error ? 'border-signal-red ring-2 ring-signal-red dark:border-signal-red' : '',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 border-l-3 border-ink bg-acid-yellow font-black text-xs text-ink select-none">
            ▼
          </div>
        </div>
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

BrutalSelect.displayName = 'BrutalSelect';
