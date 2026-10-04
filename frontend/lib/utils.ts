import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'No date';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export interface UserColorSpec {
  bg: string;
  textColor: string;
}

export function getUserColor(userId: string): string {
  const palette = [
    '#FFE600', // yellow (ink text)
    '#FF3EA5', // pink (ink text)
    '#1E3AE8', // deep blue (white text)
    '#19E36B', // green (ink text)
    '#FF8A00', // orange (ink text)
    '#7C3AED', // deep violet (white text)
    '#00E5FF', // cyan (ink text)
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

export function isDarkColor(hexColor: string): boolean {
  const darks = ['#1E3AE8', '#2B4BFF', '#7C3AED', '#8B5CF6', '#FF2E2E', '#C71B1B', '#0A0A0A'];
  return darks.includes(hexColor.toUpperCase()) || darks.includes(hexColor);
}

export function getUserInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
