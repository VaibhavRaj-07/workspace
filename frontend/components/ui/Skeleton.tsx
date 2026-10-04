import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  striped?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  striped = true,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-zinc-200 border-2 border-ink animate-pulse dark:bg-zinc-800 dark:border-zinc-700',
        striped ? 'bg-stripes-subtle' : '',
        className
      )}
      {...props}
    />
  );
};
