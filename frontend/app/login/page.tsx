'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore, DEMO_USERS } from '@/stores/auth-store';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalInput } from '@/components/ui/BrutalInput';
import { Marquee } from '@/components/ui/Marquee';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { toast } from '@/stores/toast-store';
import { ArrowRight, Lock, Mail, ShieldAlert, Sparkles, User, Zap } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsDemoUser, isLoading, error } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'alex@workspace.dev',
      password: 'Password123!',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success('AUTHENTICATION SUCCESS', 'Welcome back to Workspace Control.');
      router.push('/');
    } catch (err: any) {
      toast.error('AUTHENTICATION FAILED', err.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (key: keyof typeof DEMO_USERS) => {
    setSubmitting(true);
    try {
      const u = await loginAsDemoUser(key);
      toast.success('DEMO LOGIN GRANTED', `Logged in as ${u.name}`);
      router.push('/');
    } catch (err: any) {
      toast.error('DEMO LOGIN FAILED', err.message || 'Could not log in as demo user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-paper text-ink dark:bg-zinc-950 dark:text-paper">
      {/* Left Column: Loud Hero Control Room Display */}
      <div className="lg:col-span-7 bg-acid-yellow border-b-4 lg:border-b-0 lg:border-r-5 border-ink p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden bg-grid-pattern">
        {/* Top bar */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-ink text-acid-yellow flex items-center justify-center font-display font-black text-xl shadow-brutal-sm">
              ⚡
            </div>
            <span className="font-mono font-bold text-xs tracking-widest uppercase text-ink">
              CONTROL ROOM PROTOCOL // V1.0
            </span>
          </div>
          <StickerBadge variant="ink" rotate="-2">
            OCC ARMORED
          </StickerBadge>
        </div>

        {/* Center Hero Typography */}
        <div className="my-12 z-10 space-y-4">
          <div className="inline-block bg-ink text-acid-yellow font-mono text-xs font-black px-3 py-1 uppercase shadow-brutal-sm">
            REAL-TIME COLLABORATIVE ENVIRONMENT
          </div>
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-tighter uppercase leading-[0.9] text-ink">
            COLLABORATE <br />
            WITHOUT <br />
            <span className="underline decoration-ink decoration-4">COLLISION.</span>
          </h1>
          <p className="font-mono text-sm sm:text-base font-bold text-ink max-w-xl leading-relaxed">
            Optimistic Concurrency Control (OCC) with automatic non-destructive field merges, AI-assisted 3-way conflict synthesis, and deadline risk analytics.
          </p>
        </div>

        {/* Bottom Feature Tags */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 z-10">
          <div className="p-3 border-3 border-ink bg-white dark:bg-zinc-900 shadow-brutal-sm text-ink dark:text-paper">
            <span className="micro-label text-zinc-700 dark:text-zinc-300">CONCURRENCY</span>
            <div className="font-black text-xs uppercase mt-0.5">OCC 409 SHIELD</div>
          </div>
          <div className="p-3 border-3 border-ink bg-white dark:bg-zinc-900 shadow-brutal-sm text-ink dark:text-paper">
            <span className="micro-label text-zinc-700 dark:text-zinc-300">INTELLIGENCE</span>
            <div className="font-black text-xs uppercase mt-0.5">AI 3-WAY MERGE</div>
          </div>
          <div className="p-3 border-3 border-ink bg-white dark:bg-zinc-900 shadow-brutal-sm text-ink dark:text-paper">
            <span className="micro-label text-zinc-700 dark:text-zinc-300">PREDICTION</span>
            <div className="font-black text-xs uppercase mt-0.5">DEADLINE RISK AI</div>
          </div>
        </div>
      </div>

      {/* Right Column: Brutal Login Form */}
      <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between bg-paper dark:bg-zinc-950">
        <div className="max-w-md w-full mx-auto space-y-8 my-auto">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-3 w-3 bg-toxic-green rounded-full border border-ink inline-block" />
              <span className="micro-label">AUTHENTICATION GATEWAY</span>
            </div>
            <h2 className="font-display text-4xl uppercase tracking-tight text-ink dark:text-paper">
              ENTER WORKSPACE
            </h2>
            <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Provide your access credentials or use one-click demo profiles.
            </p>
          </div>

          {/* Quick Demo Login Cards */}
          <div className="space-y-2">
            <span className="micro-label text-zinc-700 dark:text-zinc-300">ONE-CLICK DEMO ACCESS:</span>
            <div className="grid grid-cols-3 gap-2">
              {(['alex', 'sarah', 'rahul'] as const).map((key) => {
                const u = DEMO_USERS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickLogin(key)}
                    className="p-2.5 border-3 border-ink bg-white hover:bg-acid-yellow text-ink text-left transition-all shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 group dark:bg-zinc-900 dark:text-paper dark:border-paper dark:hover:bg-acid-yellow dark:hover:text-ink"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs uppercase">
                        {key.toUpperCase()}
                      </span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 group-hover:text-ink truncate">
                      {u.role}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t-3 border-ink/20 dark:border-paper/20"></div>
            <span className="flex-shrink mx-4 font-mono text-xs font-bold text-zinc-500 uppercase">
              OR LOG IN MANUALLY
            </span>
            <div className="flex-grow border-t-3 border-ink/20 dark:border-paper/20"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <BrutalInput
              label="EMAIL ADDRESS"
              type="email"
              placeholder="alex@workspace.dev"
              error={errors.email?.message}
              {...register('email')}
            />

            <BrutalInput
              label="PASSWORD"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <BrutalButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={submitting}
            >
              {submitting ? 'AUTHENTICATING...' : 'ACCESS CONTROL ROOM →'}
            </BrutalButton>
          </form>

          <div className="text-center pt-2">
            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
              Need a new account?{' '}
              <Link
                href="/register"
                className="font-bold underline text-ink dark:text-paper hover:text-hot-pink"
              >
                Create team member credentials
              </Link>
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-8 font-mono text-[10px] text-zinc-400 uppercase">
          PS ID: ALG-WEB-01 // REALTIME OCC WORKSPACE
        </div>
      </div>
    </div>
  );
}
