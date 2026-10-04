import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ink' | 'pink' | 'cyan' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  shadow?: 'sm' | 'md' | 'lg' | 'none';
  fullWidth?: boolean;
}

export const BrutalButton = forwardRef<HTMLButtonElement, BrutalButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      shadow = 'md',
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all duration-100 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-acid-yellow disabled:cursor-not-allowed disabled:opacity-50 select-none';

    const variants = {
      primary:
        'bg-acid-yellow text-ink border-3 border-ink hover:bg-yellow-300 dark:border-acid-yellow',
      secondary:
        'bg-paper text-ink border-3 border-ink hover:bg-white dark:bg-zinc-800 dark:text-paper dark:border-paper',
      danger:
        'bg-signal-red text-white border-3 border-ink hover:bg-red-600 dark:border-signal-red',
      success:
        'bg-toxic-green text-ink border-3 border-ink hover:bg-green-400 dark:border-toxic-green',
      ink: 'bg-ink text-paper border-3 border-ink hover:bg-zinc-800 dark:bg-paper dark:text-ink dark:border-paper',
      pink: 'bg-hot-pink text-ink border-3 border-ink hover:bg-pink-400 dark:border-hot-pink',
      cyan: 'bg-neon-cyan text-ink border-3 border-ink hover:bg-cyan-300 dark:border-neon-cyan',
      ghost:
        'bg-transparent text-ink border-3 border-transparent hover:border-ink hover:bg-paper dark:text-paper dark:hover:border-paper',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8 font-mono',
      md: 'text-sm px-4 py-2.5 gap-2 h-11',
      lg: 'text-base px-6 py-3.5 gap-2.5 h-14',
      icon: 'h-11 w-11 p-0',
    };

    const shadows = {
      none: '',
      sm: 'shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none dark:shadow-brutal-dark-sm',
      md: 'shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none dark:shadow-brutal-dark',
      lg: 'shadow-brutal-lg hover:-translate-x-1 hover:-translate-y-1 active:translate-x-2 active:translate-y-2 active:shadow-none dark:shadow-brutal-dark-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          disabled ? '' : shadows[shadow],
          fullWidth ? 'w-full' : '',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

BrutalButton.displayName = 'BrutalButton';
