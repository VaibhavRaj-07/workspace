import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface BrutalTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const BrutalTabs: React.FC<BrutalTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b-3 border-ink pb-2 bg-paper dark:bg-zinc-950 dark:border-paper',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-4 py-2 font-mono text-xs font-black uppercase tracking-wider border-3 border-ink flex items-center gap-2 transition-all select-none',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-acid-yellow',
              isActive
                ? 'bg-acid-yellow text-ink shadow-brutal translate-y-0.5 dark:bg-acid-yellow dark:text-ink dark:shadow-brutal-dark'
                : 'bg-paper text-ink hover:bg-zinc-100 dark:bg-zinc-900 dark:text-paper dark:hover:bg-zinc-800'
            )}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 border-2 border-ink',
                  isActive
                    ? 'bg-ink text-acid-yellow'
                    : 'bg-acid-yellow text-ink'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
