import React from 'react';
import { cn } from '@/lib/utils';

export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  speed?: 'normal' | 'fast' | 'slow';
  reverse?: boolean;
  bg?: 'yellow' | 'ink' | 'pink' | 'cyan' | 'green' | 'red' | 'paper';
  separator?: string;
  items?: string[];
  bordered?: boolean;
}

export const Marquee: React.FC<MarqueeProps> = ({
  speed = 'normal',
  reverse = false,
  bg = 'yellow',
  separator = '✦',
  items,
  children,
  bordered = true,
  className,
  ...props
}) => {
  const bgs = {
    yellow: 'bg-acid-yellow text-ink border-ink',
    ink: 'bg-ink text-acid-yellow border-paper',
    pink: 'bg-hot-pink text-ink border-ink',
    cyan: 'bg-neon-cyan text-ink border-ink',
    green: 'bg-toxic-green text-ink border-ink',
    red: 'bg-signal-red text-white border-ink',
    paper: 'bg-paper text-ink border-ink dark:bg-zinc-900 dark:text-paper',
  };

  const animClass = reverse
    ? 'animate-marquee-reverse'
    : speed === 'fast'
    ? 'animate-marquee-fast'
    : 'animate-marquee';

  const content = items ? (
    <div className="flex items-center gap-6 font-mono text-xs font-black uppercase tracking-widest px-4">
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <span>{item}</span>
          <span className="text-current opacity-70">{separator}</span>
        </React.Fragment>
      ))}
    </div>
  ) : (
    <div className="flex items-center gap-6 font-mono text-xs font-black uppercase tracking-widest px-4">
      {children}
    </div>
  );

  return (
    <div
      className={cn(
        'overflow-hidden flex whitespace-nowrap py-1.5 select-none relative',
        bordered ? 'border-y-3' : '',
        bgs[bg],
        className
      )}
      {...props}
    >
      <div className={cn('flex shrink-0', animClass)}>{content}</div>
      <div className={cn('flex shrink-0', animClass)} aria-hidden="true">
        {content}
      </div>
    </div>
  );
};
