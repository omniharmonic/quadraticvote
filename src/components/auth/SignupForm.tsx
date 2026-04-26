'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell, FieldRow } from './AuthShell';
import { Stamp } from '@/components/schematic';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const { user, error } = await signUp(email, password);
      if (error) return setError(error.message);
      if (user) {
        setSuccess(true);
        setTimeout(() => router.push('/auth/login'), 3500);
      }
    } catch {
      setError('An unexpected error occurred. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell
        eyebrow="On the way"
        title="Check your inbox."
        lede="We sent a confirmation link to your email. Click it to verify the account, then come back to sign in."
      >
        <div className="schematic schematic-tick p-6">
          <Stamp tone="sage" rotate={-2}>
            Pending verification
          </Stamp>
          <p className="mt-4 font-serif text-[15px] text-ink-2">
            Sent to <span className="text-ink font-medium">{email}</span>.
          </p>
          <p className="mt-2 font-serif text-[14.5px] text-ink-3">
            Redirecting to sign in shortly…
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Open an account"
      title="Pull up a chair."
      lede="A free account lets you draft events, invite voters, and keep a record. We hold onto your email and nothing else."
      footnote={
        <p>
          Already have one?{' '}
          <Link
            href="/auth/login"
            className="text-blueprint underline underline-offset-4 hover:text-ink"
          >
            Sign in →
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

        <FieldRow
          label="Password"
          htmlFor="password"
          hint={<span>Min. 6 characters</span>}
        >
          <input
            id="password"
            name="password"
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
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            className="field w-full"
            placeholder="• • • • • • • •"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? 'Creating…' : 'Open account'}
        </button>

        <p className="font-serif text-[13.5px] text-ink-3">
          By creating an account you agree to our terms of service and
          privacy policy. We don&apos;t sell anything; you&apos;re not the product.
        </p>
      </form>
    </AuthShell>
  );
}
