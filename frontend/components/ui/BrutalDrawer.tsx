import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WarningTape } from './WarningTape';

export interface BrutalDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  hazardHeader?: boolean;
  hazardText?: string;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl' | '2xl';
}

export const BrutalDrawer: React.FC<BrutalDrawerProps> = ({
  open,
  onOpenChange,
  title,
  subtitle,
  headerRight,
  hazardHeader = false,
  hazardText,
  children,
  width = 'xl',
}) => {
  const widths = {
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/60 bg-dots-pattern backdrop-blur-xs z-50 animate-in fade-in duration-150" />
        <Dialog.Content
          className={cn(
            'fixed right-0 top-0 bottom-0 z-50 w-full p-0',
            'bg-paper border-l-5 border-ink shadow-brutal-xl focus:outline-none',
            'dark:bg-zinc-900 dark:border-paper dark:shadow-brutal-dark-xl',
            'flex flex-col h-full animate-in slide-in-from-right duration-200',
            widths[width]
          )}
        >
          {hazardHeader && <WarningTape text={hazardText} size="sm" />}
          <div className="flex items-center justify-between px-5 py-3.5 bg-ink text-paper border-b-3 border-ink select-none dark:bg-zinc-950 dark:text-acid-yellow">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">→</span>
                <Dialog.Title className="font-display text-lg uppercase tracking-wider line-clamp-1">
                  {title}
                </Dialog.Title>
              </div>
              {subtitle && (
                <span className="text-[11px] font-mono text-zinc-200 dark:text-acid-yellow font-bold pl-4">
                  {subtitle}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {headerRight}
              <Dialog.Close asChild>
                <button
                  className="h-8 w-8 bg-signal-red text-white flex items-center justify-center font-black border-2 border-white hover:bg-red-600 focus:outline-none"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
