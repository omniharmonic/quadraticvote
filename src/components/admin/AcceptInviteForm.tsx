'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  GraphPaper,
  SectionLabel,
  SchematicCard,
  Stamp,
} from '@/components/schematic';
import Navigation from '@/components/layout/navigation';

interface AcceptInviteFormProps {
  inviteCode?: string;
}

export function AcceptInviteForm({ inviteCode: initialCode }: AcceptInviteFormProps) {
  const { user, session } = useAuth();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState(initialCode || '');
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setError('You must be signed in to accept an invitation.');
    if (!inviteCode.trim()) return setError('Please enter the invitation code.');

    setIsAccepting(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to accept invitation');
      setSuccess('Invitation accepted. Redirecting to your studio…');
      setTimeout(() => router.push('/admin'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navigation />
      <section className="relative overflow-hidden border-b border-ink/15">
        <GraphPaper aria-hidden className="absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-2xl px-5 md:px-8 py-12">
          <SectionLabel>Admin invitation</SectionLabel>
          <h1 className="mt-3 font-display text-4xl text-ink leading-tight tracking-[-0.018em] text-balance">
            Take a seat at the table.
          </h1>
          <p className="mt-3 max-w-lg font-serif text-[16px] text-ink-2 leading-snug">
            Drop in the code an organizer sent you. You&apos;ll join their event as a
            co-organizer.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-md px-5 md:px-8 py-12">
        {!user ? (
          <SchematicCard className="p-6">
            <Stamp tone="terracotta" rotate={-3}>
              Sign in required
            </Stamp>
            <p className="mt-4 font-serif text-[15px] text-ink-2 leading-snug">
              You need to be signed in to accept an admin invitation. Sign in
              first, then come back here.
            </p>
            <a href="/auth/login?redirect=/admin/invite" className="btn-ink mt-5 inline-flex">
              Sign in →
            </a>
          </SchematicCard>
        ) : (
          <SchematicCard accent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="inviteCode"
                  className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3"
                >
                  Invitation code
                </label>
                <input
                  type="text"
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="field w-full font-mono tracking-widest text-center"
                  placeholder="••••-••••-••••"
                  required
                />
              </div>

              {error && (
                <div className="border border-wine/30 bg-wine/8 px-3 py-2 text-[14px] text-wine font-serif">
                  {error}
                </div>
              )}

              {success && (
                <div className="border border-sage/30 bg-sage/8 px-3 py-2 text-[14px] text-sage font-serif">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isAccepting || !inviteCode.trim() || !!success}
                className="btn-ink w-full"
              >
                {isAccepting ? 'Accepting…' : 'Accept invitation'}
              </button>

              <p className="font-serif text-[13.5px] text-ink-3 leading-snug">
                Accepting grants you administrative access to manage the
                event.
              </p>
            </form>
          </SchematicCard>
        )}
      </main>
    </div>
  );
}
