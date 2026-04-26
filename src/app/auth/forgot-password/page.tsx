'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell, FieldRow } from '@/components/auth/AuthShell';
import { Stamp } from '@/components/schematic';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) return setError(error.message);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthShell
        eyebrow="Sent"
        title="Check your inbox."
        lede={`If an account exists for that email, a reset link is on its way.`}
        footnote={
          <p>
            <Link
              href="/auth/login"
              className="text-blueprint underline underline-offset-4 hover:text-ink"
            >
              ← Back to sign in
            </Link>
          </p>
        }
      >
        <div className="schematic schematic-tick p-6">
          <Stamp tone="sage" rotate={-2}>
            Reset · Pending
          </Stamp>
          <p className="mt-4 font-serif text-[15px] text-ink-2">
            Look for an email at <span className="text-ink font-medium">{email}</span>.
            Spam folder counts.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Reset"
      title="Forgot your key?"
      lede="Tell us the email on the account. We'll send a one-time link to set a new password."
      footnote={
        <p>
          <Link
            href="/auth/login"
            className="text-blueprint underline underline-offset-4 hover:text-ink"
          >
            ← Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FieldRow label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field w-full"
            placeholder="you@yourdomain"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
}
