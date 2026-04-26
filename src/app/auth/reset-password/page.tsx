'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AuthShell, FieldRow } from '@/components/auth/AuthShell';
import { Stamp } from '@/components/schematic';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => router.push('/auth/login'), 2500);
  };

  if (done) {
    return (
      <AuthShell eyebrow="Done" title="Password updated.">
        <div className="schematic schematic-tick p-6">
          <Stamp tone="sage" rotate={-2}>
            Filed · Sealed
          </Stamp>
          <p className="mt-4 font-serif text-[15px] text-ink-2">
            Redirecting you to sign in.
          </p>
        </div>
      </AuthShell>
    );
  }

  if (!ready) {
    return (
      <AuthShell eyebrow="Reset" title="Verifying your reset link…" lede="Hang on a moment while we check the seal on this envelope.">
        <p className="font-serif text-[14.5px] text-ink-3">
          Taking too long? The link may have expired.{' '}
          <Link
            href="/auth/forgot-password"
            className="text-blueprint underline underline-offset-4 hover:text-ink"
          >
            Request a new one →
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Reset"
      title="Choose a new password."
      lede="Pick something only you know. We'll seal the envelope and you can sign in again."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FieldRow label="New password" htmlFor="new" hint={<span>Min. 6 chars</span>}>
          <input
            id="new"
            type="password"
            autoComplete="new-password"
            required
            className="field w-full"
            placeholder="• • • • • • • •"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FieldRow>

        <FieldRow label="Confirm" htmlFor="confirm">
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            className="field w-full"
            placeholder="• • • • • • • •"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </FieldRow>

        {error && (
          <div
            role="alert"
            className="border border-wine/30 bg-wine/8 px-3 py-2 text-[14px] text-wine font-serif"
          >
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-ink w-full">
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  );
}
