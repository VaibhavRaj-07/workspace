'use client';

import React, { useState } from 'react';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalCard } from '@/components/ui/BrutalCard';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { BrutalInput } from '@/components/ui/BrutalInput';
import { BrutalTextarea } from '@/components/ui/BrutalTextarea';
import { BrutalSelect } from '@/components/ui/BrutalSelect';
import { Marquee } from '@/components/ui/Marquee';
import { StatBlock } from '@/components/ui/StatBlock';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Avatar, AvatarStack } from '@/components/ui/Avatar';
import { WarningTape } from '@/components/ui/WarningTape';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { BrutalTabs } from '@/components/ui/BrutalTabs';
import { BrutalModal } from '@/components/ui/BrutalModal';
import { BrutalDrawer } from '@/components/ui/BrutalDrawer';
import { toast } from '@/stores/toast-store';
import { Moon, Sun, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StyleguidePage() {
  const [isDark, setIsDark] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const toggleDark = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const sampleUsers = [
    { id: '1', name: 'Alex Rivers', isOnline: true },
    { id: '2', name: 'Sarah Chen', isOnline: true, isEditing: true },
    { id: '3', name: 'Rahul Patel', isOnline: false },
    { id: '4', name: 'Elena Rostova', isOnline: true },
    { id: '5', name: 'Kenji Sato', isOnline: false },
    { id: '6', name: 'Maya Lin', isOnline: true },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-zinc-950 dark:text-paper pb-24">
      {/* Header Bar */}
      <header className="border-b-4 border-ink bg-acid-yellow px-6 py-4 flex items-center justify-between shadow-brutal dark:border-paper">
        <div className="flex items-center gap-4">
          <Link href="/">
            <BrutalButton variant="ink" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> RETURN HOME
            </BrutalButton>
          </Link>
          <h1 className="font-display text-2xl tracking-tighter uppercase text-ink">
            NEO-BRUTALIST SYSTEM SPEC // 01
          </h1>
        </div>

        <BrutalButton
          variant="secondary"
          size="sm"
          onClick={toggleDark}
          className="font-mono"
        >
          {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
          {isDark ? 'DAY SHIFT' : 'NIGHT SHIFT'}
        </BrutalButton>
      </header>

      {/* Marquee Header */}
      <Marquee
        speed="normal"
        bg="ink"
        items={[
          'RAW EDGES',
          '3PX SOLID INK BORDERS',
          'HARD OFFSET SHADOWS',
          'OCC CONFLICT SHIELDS',
          'CLASHING MAXIMALISM',
          'SUB-200MS TACTILE MOTION',
        ]}
      />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* Color Palette Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">01 //</span>
            <h2 className="font-display text-2xl uppercase">SATURATED COLOR PALETTE</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-3">
            {[
              { name: 'PAPER', hex: '#F4F0E6', bg: 'bg-paper text-ink', border: 'border-ink' },
              { name: 'INK', hex: '#0A0A0A', bg: 'bg-ink text-paper', border: 'border-ink' },
              { name: 'ACID YELLOW', hex: '#FFE600', bg: 'bg-acid-yellow text-ink', border: 'border-ink' },
              { name: 'HOT PINK', hex: '#FF3EA5', bg: 'bg-hot-pink text-ink', border: 'border-ink' },
              { name: 'ELECTRIC BLUE', hex: '#1D4ED8', bg: 'bg-[#1D4ED8] text-white', border: 'border-ink' },
              { name: 'SIGNAL RED', hex: '#DC2626', bg: 'bg-signal-red text-white font-black', border: 'border-ink' },
              { name: 'TOXIC GREEN', hex: '#19E36B', bg: 'bg-toxic-green text-ink', border: 'border-ink' },
              { name: 'ORANGE', hex: '#FF8A00', bg: 'bg-[#FF8A00] text-ink font-bold', border: 'border-ink' },
              { name: 'VIOLET', hex: '#7C3AED', bg: 'bg-[#7C3AED] text-white', border: 'border-ink' },
              { name: 'CYAN', hex: '#00E5FF', bg: 'bg-neon-cyan text-ink', border: 'border-ink' },
            ].map((col) => (
              <div
                key={col.name}
                className={`p-3 border-3 ${col.border} shadow-brutal-sm flex flex-col justify-between h-24 ${col.bg}`}
              >
                <span className="micro-label font-bold leading-tight">{col.name}</span>
                <span className="font-mono text-[10px] font-black">{col.hex}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Buttons Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">02 //</span>
            <h2 className="font-display text-2xl uppercase">BRUTAL BUTTONS</h2>
          </div>
          <div className="flex flex-wrap gap-4 items-center p-6 bg-zinc-100 border-3 border-ink dark:bg-zinc-900 dark:border-paper shadow-brutal">
            <BrutalButton variant="primary">PRIMARY YELLOW</BrutalButton>
            <BrutalButton variant="secondary">SECONDARY PAPER</BrutalButton>
            <BrutalButton variant="danger">DANGER RED</BrutalButton>
            <BrutalButton variant="success">SUCCESS GREEN</BrutalButton>
            <BrutalButton variant="pink">HOT PINK</BrutalButton>
            <BrutalButton variant="cyan">CYAN</BrutalButton>
            <BrutalButton variant="ink">INK SOLID</BrutalButton>
            <BrutalButton variant="ghost">GHOST</BrutalButton>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <BrutalButton size="sm">SMALL BTN</BrutalButton>
            <BrutalButton size="md">MEDIUM BTN</BrutalButton>
            <BrutalButton size="lg">LARGE ACTION BTN</BrutalButton>
            <BrutalButton disabled>DISABLED STATE</BrutalButton>
          </div>
        </section>

        {/* Stickers & Badges */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">03 //</span>
            <h2 className="font-display text-2xl uppercase">STICKER BADGES (ROTATED)</h2>
          </div>
          <div className="flex flex-wrap gap-4 items-center p-6 bg-grid-pattern border-3 border-ink dark:border-paper shadow-brutal">
            <StickerBadge variant="yellow" rotate="-3">★ LEAD ARCHITECT</StickerBadge>
            <StickerBadge variant="pink" rotate="2">● 07 OVERDUE</StickerBadge>
            <StickerBadge variant="blue" rotate="-1">SEQ: 4821</StickerBadge>
            <StickerBadge variant="green" rotate="3">OCC AUTO-MERGED</StickerBadge>
            <StickerBadge variant="red" rotate="-2">⚠ CRITICAL RISK 94%</StickerBadge>
            <StickerBadge variant="orange" rotate="1">HIGH PRIORITY</StickerBadge>
            <StickerBadge variant="cyan" rotate="-3">✨ AI ASSIGNEE 92%</StickerBadge>
            <StickerBadge variant="violet" rotate="2">IN REVIEW</StickerBadge>
          </div>
        </section>

        {/* Stat Blocks Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">04 //</span>
            <h2 className="font-display text-2xl uppercase">STAT BLOCKS & OVERSIZED NUMERALS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatBlock
              label="ACTIVE TASKS"
              value="24"
              subValue="+3 ADDED TODAY"
              badge="LIVE"
              badgeColor="green"
            />
            <StatBlock
              label="OVERDUE HAZARD"
              value="07"
              subValue="REQUIRES IMMEDIATE TRIAGE"
              badge="CRITICAL"
              badgeColor="red"
              variant="outlined"
            />
            <StatBlock
              label="OCC RESOLVED"
              value="100%"
              subValue="ZERO UPDATE LOSS"
              badge="HEALTHY"
              badgeColor="yellow"
            />
            <StatBlock
              label="COLLABORATORS"
              value="03"
              subValue="ONLINE IN ROOM"
              badge="ACTIVE"
              badgeColor="cyan"
              variant="inverted"
            />
          </div>
        </section>

        {/* Segmented Progress Bars */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">05 //</span>
            <h2 className="font-display text-2xl uppercase">SEGMENTED CHUNKY PROGRESS BARS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border-3 border-ink dark:border-paper shadow-brutal">
            <ProgressBar value={75} color="green" size="lg" segments={12} />
            <ProgressBar value={40} color="yellow" size="lg" segments={10} />
            <ProgressBar value={90} color="pink" size="md" segments={15} />
            <ProgressBar value={15} color="red" size="md" segments={8} />
          </div>
        </section>

        {/* Cards & Background Patterns */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">06 //</span>
            <h2 className="font-display text-2xl uppercase">CARDS & PURE CSS PATTERNS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BrutalCard
              headerTitle="GRID PATTERN CARD"
              headerGlyph="arrow"
              headerBg="yellow"
              pattern="grid"
              hoverElevate
            >
              <p className="text-sm font-mono mb-4">
                Cards feature 3px solid ink borders, sharp 0px radius corners, and micro-labels.
              </p>
              <BrutalButton size="sm" variant="ink">EXPLORE →</BrutalButton>
            </BrutalCard>

            <BrutalCard
              headerTitle="DOTS PATTERN CARD"
              headerGlyph="star"
              headerBg="pink"
              pattern="dots"
              hoverElevate
            >
              <p className="text-sm font-mono mb-4">
                Halftone dot backgrounds generated in pure CSS with no external image assets.
              </p>
              <BrutalButton size="sm" variant="pink">INSPECT ✱</BrutalButton>
            </BrutalCard>

            <BrutalCard
              headerTitle="STRIPES PATTERN CARD"
              headerGlyph="triangle"
              headerBg="blue"
              pattern="stripes"
              hoverElevate
            >
              <p className="text-sm font-mono mb-4">
                Subtle diagonal background lines reinforce architectural control room density.
              </p>
              <BrutalButton size="sm" variant="cyan">LAUNCH ▲</BrutalButton>
            </BrutalCard>
          </div>
        </section>

        {/* Warning Tapes */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">07 //</span>
            <h2 className="font-display text-2xl uppercase">HAZARD WARNING TAPES</h2>
          </div>
          <div className="space-y-3">
            <WarningTape text="OCC COLLISION DETECTED // 3-WAY SYNTHESIS REQUIRED" variant="warning" size="md" />
            <WarningTape text="CRITICAL DEADLINE EXCEEDED // IMMEDIATE ESCALATION" variant="danger" size="lg" />
          </div>
        </section>

        {/* Avatars & Presence */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">08 //</span>
            <h2 className="font-display text-2xl uppercase">AVATARS & PRESENCE STACK</h2>
          </div>
          <div className="flex flex-wrap items-center gap-8 p-6 border-3 border-ink dark:border-paper shadow-brutal">
            <Avatar user={sampleUsers[0]} size="lg" isOnline />
            <Avatar user={sampleUsers[1]} size="lg" isOnline isEditing />
            <Avatar user={sampleUsers[2]} size="lg" isOnline={false} />
            <div className="flex flex-col gap-2">
              <span className="micro-label">COLLABORATOR STACK:</span>
              <AvatarStack users={sampleUsers} size="md" max={4} />
            </div>
          </div>
        </section>

        {/* Form Controls */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">09 //</span>
            <h2 className="font-display text-2xl uppercase">FORM CONTROLS & INPUTS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-3 border-ink dark:border-paper shadow-brutal">
            <BrutalInput
              label="PROJECT IDENTIFIER"
              badge="REQUIRED"
              placeholder="e.g. ALG-WEB-01"
              helperText="Unique system codename"
            />
            <BrutalSelect
              label="TASK PRIORITY"
              badge="OCC"
              defaultValue="urgent"
              options={[
                { value: 'low', label: 'LOW PRIORITY' },
                { value: 'medium', label: 'MEDIUM PRIORITY' },
                { value: 'high', label: 'HIGH PRIORITY' },
                { value: 'urgent', label: 'URGENT PRIORITY' },
              ]}
            />
            <BrutalInput
              label="INVALID INPUT TEST"
              defaultValue="bad_email_format"
              error="Valid RFC-5322 email required"
            />
            <div className="md:col-span-3">
              <BrutalTextarea
                label="TECHNICAL SPECIFICATION"
                placeholder="Write detailed task parameters..."
                rows={3}
              />
            </div>
          </div>
        </section>

        {/* Tabs, Modals & Drawers Trigger */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">10 //</span>
            <h2 className="font-display text-2xl uppercase">TABS, TOASTS, MODALS & DRAWERS</h2>
          </div>
          <BrutalTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'overview', label: 'OVERVIEW', badge: '14' },
              { id: 'board', label: 'KANBAN BOARD', badge: '4' },
              { id: 'activity', label: 'ACTIVITY STREAM' },
              { id: 'members', label: 'MEMBERS', badge: '3' },
            ]}
          />

          <div className="flex flex-wrap gap-4 pt-4">
            <BrutalButton onClick={() => setModalOpen(true)} variant="primary">
              LAUNCH COLLISION MODAL
            </BrutalButton>
            <BrutalButton onClick={() => setDrawerOpen(true)} variant="pink">
              OPEN TASK DRAWER
            </BrutalButton>
            <BrutalButton onClick={() => toast.success('TASK SAVED', 'Version 3 committed cleanly.')} variant="success">
              TRIGGER SUCCESS TOAST
            </BrutalButton>
            <BrutalButton onClick={() => toast.error('VERSION CONFLICT 409', 'Another peer updated this task.')} variant="danger">
              TRIGGER CONFLICT TOAST
            </BrutalButton>
            <BrutalButton onClick={() => toast.merged('AUTO-MERGED', 'Clean 3-way merge with Sarah.')} variant="ink">
              TRIGGER AUTO-MERGE TOAST
            </BrutalButton>
          </div>
        </section>

        {/* Empty States & Skeletons */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">11 //</span>
            <h2 className="font-display text-2xl uppercase">EMPTY STATES & SKELETONS</h2>
          </div>
          <EmptyState
            glyph="∅"
            title="NO CONFLICTS DETECTED"
            description="Workspace state is synchronized across all active peers with zero divergent revisions."
            actionLabel="CREATE TASK"
            onAction={() => toast.info('CREATING NEW TASK')}
          />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </section>

        {/* Cursors Showcase Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black">09 //</span>
            <h2 className="font-display text-2xl uppercase">PURE-CSS BRUTALIST CURSORS</h2>
          </div>
          <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
            Hardware-accelerated inline SVG data URI cursors with zero JavaScript lag. Automatically switches stroke styling between Day Shift and Night Shift.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div className="p-4 border-3 border-ink bg-white dark:bg-zinc-900 shadow-brutal-sm text-center flex flex-col items-center justify-center h-28 select-none">
              <span className="font-mono text-xs font-black text-ink dark:text-paper">DEFAULT</span>
              <span className="text-[10px] text-zinc-900 dark:text-zinc-100 font-mono font-bold mt-1">Arrow (32x32)</span>
            </div>

            <div className="p-4 border-3 border-ink bg-hot-pink/20 dark:bg-hot-pink/10 shadow-brutal-sm text-center flex flex-col items-center justify-center h-28 clickable select-none">
              <span className="font-mono text-xs font-black text-pink-900 dark:text-pink-300">POINTER</span>
              <span className="text-[10px] text-zinc-900 dark:text-zinc-100 font-mono font-bold mt-1">Target Square</span>
            </div>

            <div className="p-4 border-3 border-ink bg-acid-yellow/20 dark:bg-acid-yellow/10 shadow-brutal-sm text-center flex flex-col items-center justify-center h-28 cursor-grab select-none">
              <span className="font-mono text-xs font-black text-ink dark:text-acid-yellow">GRAB</span>
              <span className="text-[10px] text-zinc-900 dark:text-zinc-100 font-mono font-bold mt-1">Kanban Drag</span>
            </div>

            <div className="p-4 border-3 border-ink bg-acid-yellow/40 dark:bg-acid-yellow/20 shadow-brutal-sm text-center flex flex-col items-center justify-center h-28 cursor-grabbing select-none">
              <span className="font-mono text-xs font-black text-ink dark:text-acid-yellow">GRABBING</span>
              <span className="text-[10px] text-zinc-900 dark:text-zinc-100 font-mono font-bold mt-1">Active Drag</span>
            </div>

            <div className="p-4 border-3 border-ink bg-signal-red/20 dark:bg-signal-red/10 shadow-brutal-sm text-center flex flex-col items-center justify-center h-28 disabled-cursor select-none">
              <span className="font-mono text-xs font-black text-red-900 dark:text-red-400">DISABLED</span>
              <span className="text-[10px] text-zinc-900 dark:text-zinc-100 font-mono font-bold mt-1">Not Allowed</span>
            </div>

            <div className="p-4 border-3 border-ink bg-electric-blue/20 dark:bg-electric-blue/10 shadow-brutal-sm text-center flex flex-col items-center justify-center h-28 loading-cursor select-none">
              <span className="font-mono text-xs font-black text-blue-900 dark:text-blue-300">WAIT / BUSY</span>
              <span className="text-[10px] text-zinc-900 dark:text-zinc-100 font-mono font-bold mt-1">Hourglass</span>
            </div>
          </div>
        </section>
      </main>

      {/* Demo Modal */}
      <BrutalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="COLLISION DETECTED // TASK OCC REVISION"
        hazardHeader
        hazardText="CAUTION // CONCURRENT EDIT CONFLICT"
        footer={
          <>
            <BrutalButton variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              CANCEL
            </BrutalButton>
            <BrutalButton variant="primary" size="sm" onClick={() => setModalOpen(false)}>
              APPLY RESOLUTION
            </BrutalButton>
          </>
        }
      >
        <div className="space-y-4 font-mono text-sm">
          <p className="font-bold">
            Another team member committed changes while you were editing this task.
          </p>
          <div className="p-3 bg-zinc-100 border-2 border-ink dark:bg-zinc-800">
            <span className="micro-label text-zinc-500">CONFLICTING FIELD:</span>
            <div className="font-bold mt-1">title</div>
            <div className="mt-2 text-xs">
              <span className="bg-yellow-200 text-ink px-1">YOURS:</span> Fix WebSocket reconnection exponential backoff
            </div>
            <div className="mt-1 text-xs">
              <span className="bg-pink-200 text-ink px-1">THEIRS:</span> Fix WebSocket reconnection jitter algorithm
            </div>
          </div>
        </div>
      </BrutalModal>

      {/* Demo Drawer */}
      <BrutalDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="TASK #TK-402: SOCKET REPLAY ENGINE"
        subtitle="PROJECT: NEXTGEN CLOUD WORKSPACE"
      >
        <div className="space-y-4 font-mono text-sm">
          <div className="flex items-center justify-between">
            <StickerBadge variant="yellow">IN PROGRESS</StickerBadge>
            <span className="text-xs text-zinc-500">OCC VERSION: 3</span>
          </div>
          <BrutalInput label="TASK TITLE" defaultValue="Socket Replay Engine" />
          <BrutalTextarea
            label="DESCRIPTION"
            defaultValue="Implement monotonic seq tracking on project:join event callback."
          />
          <div className="flex justify-end gap-2 pt-4">
            <BrutalButton variant="secondary" size="sm" onClick={() => setDrawerOpen(false)}>
              CLOSE
            </BrutalButton>
            <BrutalButton variant="primary" size="sm" onClick={() => {
              setDrawerOpen(false);
              toast.success('TASK UPDATED');
            }}>
              SAVE CHANGES
            </BrutalButton>
          </div>
        </div>
      </BrutalDrawer>
    </div>
  );
}
