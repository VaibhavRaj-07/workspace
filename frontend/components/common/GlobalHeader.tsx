'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useSocket } from '@/lib/socket/socket-provider';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { Avatar } from '@/components/ui/Avatar';
import { Marquee } from '@/components/ui/Marquee';
import { NotificationDropdown } from './NotificationDropdown';
import {
  Search,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Sparkles,
  Zap,
  Code,
  ShieldAlert,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const GlobalHeader: React.FC = () => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isConnected, onlineUsers, activeProjectId, lastSeqMap } = useSocket();
  const [isDark, setIsDark] = useState(false);
  const [isDevMenuOpen, setIsDevMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const devMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  // Close dev dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (devMenuRef.current && !devMenuRef.current.contains(e.target as Node)) {
        setIsDevMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Do not render header on login/register pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const currentSeq = activeProjectId ? lastSeqMap[activeProjectId] || 0 : 0;
  const displayOnlineCount = isConnected ? Math.max(1, onlineUsers.length) : 0;

  return (
    <header className="sticky top-0 z-40 bg-paper border-b-4 border-ink shadow-brutal dark:bg-zinc-950 dark:border-paper dark:shadow-brutal-dark">
      {/* Top Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo Wordmark */}
        <div className="flex items-center gap-3 lg:gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 select-none group shrink-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 bg-acid-yellow border-3 border-ink flex items-center justify-center font-display font-black text-lg sm:text-xl shadow-brutal-sm group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform dark:border-paper shrink-0">
              ⚡
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
              <span
                className="font-display uppercase tracking-tight leading-none text-ink dark:text-paper"
                style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.45rem)' }}
              >
                WORKSPACE
              </span>
              <span className="hidden xl:inline-block font-mono text-[9px] font-black uppercase px-1.5 py-0.5 border-2 border-ink bg-acid-yellow text-ink shadow-[2px_2px_0px_#000] dark:border-paper">
                ALG-WEB-01
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 font-mono text-xs font-black uppercase shrink-0">
            <Link
              href="/"
              className={cn(
                'px-2.5 py-1.5 border-3 whitespace-nowrap transition-all',
                pathname === '/'
                  ? 'bg-acid-yellow text-ink border-ink shadow-brutal-sm'
                  : 'border-transparent hover:border-ink dark:text-paper'
              )}
            >
              DASHBOARD
            </Link>
            <Link
              href="/projects"
              className={cn(
                'px-2.5 py-1.5 border-3 whitespace-nowrap transition-all',
                pathname.startsWith('/projects')
                  ? 'bg-acid-yellow text-ink border-ink shadow-brutal-sm'
                  : 'border-transparent hover:border-ink dark:text-paper'
              )}
            >
              PROJECTS
            </Link>

            {/* Dev Tools Dropdown */}
            <div className="relative" ref={devMenuRef}>
              <button
                onClick={() => setIsDevMenuOpen((prev) => !prev)}
                className={cn(
                  'px-2.5 py-1.5 border-3 flex items-center gap-1 whitespace-nowrap transition-all',
                  pathname === '/demo-conflict' || pathname === '/styleguide'
                    ? 'bg-signal-red text-white border-ink shadow-brutal-sm'
                    : 'border-transparent hover:border-ink text-ink dark:text-paper font-bold'
                )}
              >
                <span>DEV LABS</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {isDevMenuOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-paper dark:bg-zinc-900 border-3 border-ink dark:border-paper shadow-brutal z-50 p-1.5 space-y-1">
                  <Link
                    href="/demo-conflict"
                    onClick={() => setIsDevMenuOpen(false)}
                    className={cn(
                      'block px-3 py-2 border-2 text-xs font-mono font-bold uppercase transition-all',
                      pathname === '/demo-conflict'
                        ? 'bg-signal-red text-white border-ink'
                        : 'border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800 text-ink dark:text-paper'
                    )}
                  >
                    ⚡ DEMO CONFLICT
                  </Link>
                  <Link
                    href="/styleguide"
                    onClick={() => setIsDevMenuOpen(false)}
                    className={cn(
                      'block px-3 py-2 border-2 text-xs font-mono font-bold uppercase transition-all',
                      pathname === '/styleguide'
                        ? 'bg-acid-yellow text-ink border-ink'
                        : 'border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800 text-ink dark:text-paper'
                    )}
                  >
                    🎨 STYLEGUIDE & CURSORS
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right Side Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Search trigger */}
          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
            }}
            className="hidden sm:flex items-center gap-2 h-10 px-2.5 sm:px-3 border-3 border-ink bg-white text-ink font-mono text-xs font-bold shadow-brutal-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:text-paper dark:border-paper dark:shadow-brutal-dark-sm shrink-0"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">SEARCH...</span>
            <kbd className="bg-acid-yellow px-1 py-0.5 border border-ink text-[9px] text-ink">
              Ctrl+K
            </kbd>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleDark}
            className="h-10 w-10 border-3 border-ink bg-white text-ink flex items-center justify-center hover:bg-zinc-100 shadow-brutal-sm dark:bg-zinc-900 dark:text-paper dark:border-paper dark:shadow-brutal-dark-sm active:translate-x-0.5 active:translate-y-0.5 shrink-0"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="h-4 w-4 text-acid-yellow" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notifications */}
          {isAuthenticated && <NotificationDropdown />}

          {/* User Account / Avatar */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l-2 border-ink/20 shrink-0">
              <Avatar user={user} size="sm" isOnline />
              <div className="hidden xl:flex flex-col">
                <span className="font-mono text-xs font-bold leading-tight uppercase truncate max-w-[100px]">
                  {user.name}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 leading-none">
                  {user.email.split('@')[0]}
                </span>
              </div>
              <button
                onClick={logout}
                className="h-9 w-9 border-3 border-ink bg-paper hover:bg-signal-red hover:text-white flex items-center justify-center shadow-brutal-sm transition-colors dark:border-paper dark:bg-zinc-800 shrink-0"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Link href="/login">
              <BrutalButton variant="primary" size="sm">
                LOGIN →
              </BrutalButton>
            </Link>
          )}

          {/* Mobile Nav Menu Toggle */}
          <button
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            className="md:hidden h-10 w-10 border-3 border-ink bg-acid-yellow text-ink flex items-center justify-center shadow-brutal-sm dark:border-paper shrink-0"
          >
            {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {isMobileNavOpen && (
        <div className="md:hidden border-t-3 border-ink bg-paper dark:bg-zinc-950 p-4 space-y-2 font-mono text-xs font-bold uppercase">
          <Link
            href="/"
            onClick={() => setIsMobileNavOpen(false)}
            className={cn(
              'block p-2.5 border-2',
              pathname === '/' ? 'bg-acid-yellow text-ink border-ink' : 'border-ink text-ink dark:text-paper'
            )}
          >
            DASHBOARD
          </Link>
          <Link
            href="/projects"
            onClick={() => setIsMobileNavOpen(false)}
            className={cn(
              'block p-2.5 border-2',
              pathname.startsWith('/projects') ? 'bg-acid-yellow text-ink border-ink' : 'border-ink text-ink dark:text-paper'
            )}
          >
            PROJECTS
          </Link>
          <Link
            href="/demo-conflict"
            onClick={() => setIsMobileNavOpen(false)}
            className={cn(
              'block p-2.5 border-2 text-signal-red',
              pathname === '/demo-conflict' ? 'bg-signal-red text-white border-ink' : 'border-ink'
            )}
          >
            ⚡ DEMO CONFLICT
          </Link>
          <Link
            href="/styleguide"
            onClick={() => setIsMobileNavOpen(false)}
            className={cn(
              'block p-2.5 border-2',
              pathname === '/styleguide' ? 'bg-acid-yellow text-ink border-ink' : 'border-ink text-ink dark:text-paper'
            )}
          >
            🎨 STYLEGUIDE & CURSORS
          </Link>
        </div>
      )}

      {/* Live Status Marquee Strip */}
      <Marquee
        bg={!isAuthenticated ? 'paper' : isConnected ? 'yellow' : 'red'}
        speed="normal"
        separator="●"
        items={
          !isAuthenticated
            ? [
                `WORKSPACE COLLABORATION ENGINE`,
                `SIGN IN TO GO LIVE`,
                `OCC VERSIONING & 409 CONFLICT RESILIENCE`,
                `AI-ASSISTED 3-WAY MERGE`,
                `PS: ALG-WEB-01`,
              ]
            : isConnected
            ? [
                `LIVE STREAM CONNECTED`,
                `${displayOnlineCount} ONLINE IN WORKSPACE`,
                `CURRENT SEQ #${currentSeq}`,
                `OCC VERSIONING ARMORED`,
                `AI INTELLIGENCE READY`,
                `AUTO-RETRY WITH IDEMPOTENCY KEY`,
              ]
            : [
                `⚠ RECONNECTING TO WORKSPACE`,
                `ATTEMPTING AUTOMATIC RECONNECTION`,
                `OFFLINE OCC SAFETY BUFFER ACTIVE`,
                `ACTIONS QUEUED LOCALLY`,
              ]
        }
      />
    </header>
  );
};
