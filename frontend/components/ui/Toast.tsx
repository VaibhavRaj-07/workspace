'use client';

import React from 'react';
import { useToastStore, ToastItem } from '@/stores/toast-store';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({
  toast,
  onDismiss,
}) => {
  const types = {
    success: {
      bg: 'bg-toxic-green text-ink border-ink',
      icon: <CheckCircle className="h-5 w-5 shrink-0" />,
      badge: 'SUCCESS',
    },
    error: {
      bg: 'bg-signal-red text-white border-ink',
      icon: <AlertOctagon className="h-5 w-5 shrink-0" />,
      badge: 'ERROR',
    },
    warning: {
      bg: 'bg-acid-yellow text-ink border-ink',
      icon: <AlertTriangle className="h-5 w-5 shrink-0" />,
      badge: 'ALERT',
    },
    info: {
      bg: 'bg-neon-cyan text-ink border-ink',
      icon: <Info className="h-5 w-5 shrink-0" />,
      badge: 'INFO',
    },
    merged: {
      bg: 'bg-hyper-violet text-white border-ink',
      icon: <GitMerge className="h-5 w-5 shrink-0" />,
      badge: 'AUTO-MERGED',
    },
  };

  const currentType = types[toast.type || 'info'];

  return (
    <div
      className={cn(
        'pointer-events-auto border-3 p-3.5 shadow-brutal flex items-start justify-between gap-3 animate-stamp',
        currentType.bg
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">{currentType.icon}</div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black uppercase px-1 border border-current">
              {currentType.badge}
            </span>
            <span className="font-bold text-sm leading-snug">{toast.title}</span>
          </div>
          {toast.message && (
            <span className="text-xs font-mono mt-1 opacity-90">{toast.message}</span>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-xs font-mono font-black uppercase underline hover:opacity-80 text-left"
            >
              → {toast.action.label}
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="text-current opacity-70 hover:opacity-100 p-0.5"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
