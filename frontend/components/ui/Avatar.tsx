import React from 'react';
import { cn, getUserColor, getUserInitials, isDarkColor } from '@/lib/utils';
import { User } from '@/types/api';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  user?: Partial<User> | null;
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  isEditing?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  user,
  name,
  avatarUrl,
  size = 'md',
  isOnline,
  isEditing,
  className,
  ...props
}) => {
  const resolvedName = name || user?.name || 'User';
  const resolvedUrl = avatarUrl || user?.avatarUrl;
  const initials = getUserInitials(resolvedName);
  const bgColor = user?.id ? getUserColor(user.id) : getUserColor(resolvedName);

  const sizes = {
    xs: 'h-6 w-6 text-[10px] border-2',
    sm: 'h-8 w-8 text-xs border-2',
    md: 'h-10 w-10 text-sm border-3',
    lg: 'h-12 w-12 text-base border-3',
    xl: 'h-16 w-16 text-xl border-4',
  };

  const dotSizes = {
    xs: 'h-2 w-2 border-1',
    sm: 'h-2.5 w-2.5 border-1.5',
    md: 'h-3.5 w-3.5 border-2',
    lg: 'h-4 w-4 border-2',
    xl: 'h-5 w-5 border-2',
  };

  const isDark = isDarkColor(bgColor);

  return (
    <div className="relative inline-flex select-none" {...props}>
      <div
        className={cn(
          'flex items-center justify-center font-mono font-black border-ink overflow-hidden shadow-brutal-sm transition-transform',
          isDark ? 'text-white' : 'text-ink',
          'dark:border-paper',
          sizes[size],
          isEditing ? 'ring-3 ring-hot-pink animate-pulse' : '',
          className
        )}
        style={{ backgroundColor: bgColor }}
        title={resolvedName}
      >
        {resolvedUrl ? (
          <img
            src={resolvedUrl}
            alt={resolvedName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute -bottom-1 -right-1 rounded-full border-ink',
            dotSizes[size],
            isOnline ? 'bg-toxic-green' : 'bg-zinc-400'
          )}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}

      {isEditing && (
        <span className="absolute -top-1 -right-1 bg-hot-pink text-ink text-[8px] font-mono font-black px-1 border border-ink shadow-brutal-sm uppercase">
          EDIT
        </span>
      )}
    </div>
  );
};

export interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  users: Array<{
    id: string;
    name: string;
    avatarUrl?: string | null;
    isOnline?: boolean;
    isEditing?: boolean;
  }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  users,
  max = 5,
  size = 'md',
  className,
  ...props
}) => {
  const visible = users.slice(0, max);
  const extra = users.length - max;

  return (
    <div className={cn('flex items-center -space-x-3 select-none', className)} {...props}>
      {visible.map((u, i) => (
        <div key={u.id || i} className="relative transition-transform hover:z-20 hover:scale-110">
          <Avatar
            user={u}
            name={u.name}
            avatarUrl={u.avatarUrl}
            isOnline={u.isOnline}
            isEditing={u.isEditing}
            size={size}
          />
        </div>
      ))}
      {extra > 0 && (
        <div
          className={cn(
            'flex items-center justify-center font-mono font-black bg-ink text-paper border-3 border-paper shadow-brutal-sm text-xs z-10',
            size === 'sm' ? 'h-8 w-8 text-[10px]' : 'h-10 w-10 text-xs'
          )}
        >
          +{extra}
        </div>
      )}
    </div>
  );
};
