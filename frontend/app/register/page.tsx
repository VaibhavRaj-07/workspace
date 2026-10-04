'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth-store';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalInput } from '@/components/ui/BrutalInput';
import { StickerBadge } from '@/components/ui/StickerBadge';
import { toast } from '@/stores/toast-store';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setSubmitting(true);
    try {
      await registerUser(
        data.name,
        data.email,
        data.password,
        data.avatarUrl || undefined
      );
      toast.success('REGISTRATION COMPLETED', 'Account created and authenticated.');
      router.push('/');
    } catch (err: any) {
      toast.error('REGISTRATION FAILED', err.message || 'Could not create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 bg-grid-pattern dark:bg-zinc-950 dark:text-paper">
      <div className="max-w-md w-full border-4 border-ink bg-white p-8 shadow-brutal-xl dark:bg-zinc-900 dark:border-paper dark:shadow-brutal-dark-xl space-y-6">
        <div className="flex items-center justify-between border-b-3 border-ink pb-4 dark:border-paper">
          <div>
            <span className="micro-label text-zinc-500">NEW COLLABORATOR</span>
            <h1 className="font-display text-3xl uppercase tracking-tight text-ink dark:text-paper">
              REGISTER
            </h1>
          </div>
          <StickerBadge variant="pink" rotate="2">
            JOIN ROOM
          </StickerBadge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <BrutalInput
            label="FULL NAME"
            placeholder="Elena Rostova"
            error={errors.name?.message}
            {...register('name')}
          />

          <BrutalInput
            label="EMAIL ADDRESS"
            type="email"
            placeholder="elena@workspace.dev"
            error={errors.email?.message}
            {...register('email')}
          />

          <BrutalInput
            label="PASSWORD"
            type="password"
            placeholder="••••••••"
            helperText="Minimum 6 characters"
            error={errors.password?.message}
            {...register('password')}
          />

          <BrutalInput
            label="AVATAR URL (OPTIONAL)"
            type="url"
            placeholder="https://..."
            error={errors.avatarUrl?.message}
            {...register('avatarUrl')}
          />

          <BrutalButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={submitting}
          >
            {submitting ? 'INITIALIZING...' : 'CREATE CREDENTIALS →'}
          </BrutalButton>
        </form>

        <div className="text-center pt-2 border-t-2 border-ink/10">
          <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
            Already registered?{' '}
            <Link
              href="/login"
              className="font-bold underline text-ink dark:text-paper hover:text-acid-yellow"
            >
              Log in to control room
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
