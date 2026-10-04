import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WarningTape } from './WarningTape';

export interface BrutalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  glyph?: string;
  hazardHeader?: boolean;
  hazardText?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const BrutalModal: React.FC<BrutalModalProps> = ({
  open,
  onOpenChange,
  title,
  glyph = '■',
  hazardHeader = false,
  hazardText,
  maxWidth = 'lg',
  children,
  footer,
}) => {
  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/70 bg-dots-pattern backdrop-blur-xs z-50 animate-in fade-in duration-150" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full p-0',
            'bg-paper border-4 border-ink shadow-brutal-xl focus:outline-none',
            'dark:bg-zinc-900 dark:border-paper dark:shadow-brutal-dark-xl',
            'max-h-[90vh] flex flex-col',
            widths[maxWidth]
          )}
        >
          {hazardHeader && <WarningTape text={hazardText} size="sm" />}
          <div className="flex items-center justify-between px-4 py-3 bg-ink text-paper border-b-3 border-ink select-none dark:bg-zinc-950 dark:text-acid-yellow">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{glyph}</span>
              <Dialog.Title className="font-display text-base uppercase tracking-wider">
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                className="h-7 w-7 bg-signal-red text-white flex items-center justify-center font-black border-2 border-white hover:bg-red-600 focus:outline-none"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-6 overflow-y-auto flex-1">{children}</div>

          {footer && (
            <div className="p-4 bg-zinc-100 border-t-3 border-ink flex items-center justify-end gap-3 dark:bg-zinc-950 dark:border-paper">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
