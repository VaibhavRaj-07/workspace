'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { Sparkles, Activity, ShieldCheck, Cpu } from 'lucide-react';
import Link from 'next/link';

export const GlobalFooter: React.FC = () => {
  const [status, setStatus] = useState<{
    mergeProvider: 'claude' | 'rule_based';
    mlService: 'up' | 'down';
    breaker: 'closed' | 'open' | 'half_open';
  } | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.ai.getStatus();
        if (res) setStatus(res);
      } catch {
        setStatus({ mergeProvider: 'rule_based', mlService: 'down', breaker: 'open' });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="w-full border-t-4 border-ink bg-white dark:bg-zinc-950 py-4 px-4 sm:px-8 mt-auto font-mono text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <span className="font-display text-sm tracking-wider font-black uppercase text-ink bg-acid-yellow px-2 py-0.5 border-2 border-ink shadow-brutal-xs">
            ALG-WEB-01
          </span>
          <span className="text-zinc-600 dark:text-zinc-400 font-bold hidden sm:inline">
            NEO-BRUTALIST COLLABORATIVE ENGINE
          </span>
        </div>

        {/* Live AI / ML Stickers */}
        <div className="flex flex-wrap items-center gap-2" id="footer-ai-stickers">
          {status?.mergeProvider === 'claude' ? (
            <StickerBadge variant="green" size="sm" rotate="1">
              <Sparkles className="h-3 w-3 inline mr-1" />
              AI: CLAUDE 3.5 SONNET
            </StickerBadge>
          ) : (
            <StickerBadge variant="yellow" size="sm" rotate="-1">
              <Sparkles className="h-3 w-3 inline mr-1" />
              AI: RULE-BASED MERGE (ACTIVE)
            </StickerBadge>
          )}

          {status?.mlService === 'up' ? (
            <StickerBadge variant="cyan" size="sm" rotate="0">
              <Cpu className="h-3 w-3 inline mr-1" />
              ML: HYBRID SEMANTIC (UP)
            </StickerBadge>
          ) : (
            <StickerBadge variant="pink" size="sm" rotate="1">
              <Cpu className="h-3 w-3 inline mr-1" />
              ML: HEURISTIC FALLBACK
            </StickerBadge>
          )}

          <span className="text-[10px] text-zinc-500 font-black tracking-widest uppercase border border-ink/40 dark:border-paper/40 px-1.5 py-0.5 bg-paper dark:bg-zinc-900">
            CIRCUIT: {status?.breaker?.toUpperCase() || 'CLOSED'}
          </span>
        </div>

        {/* Quick Diagnostic Links */}
        <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400 font-bold">
          <Link href="/demo-conflict" className="hover:text-ink dark:hover:text-paper underline">
            CONFLICT LAB
          </Link>
          <Link href="/styleguide" className="hover:text-ink dark:hover:text-paper underline">
            STYLEGUIDE
          </Link>
          <span className="text-[10px] text-zinc-400">Ctrl+Shift+D (Doctor)</span>
        </div>
      </div>
    </footer>
  );
};
