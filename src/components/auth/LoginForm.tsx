'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell, FieldRow } from './AuthShell';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        return;
      }
      if (user) {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect') ?? params.get('returnUrl');
        router.push(redirect || '/admin');
      }
    } catch {
      setError('An unexpected error occurred. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your studio."
      lede="Pick up the pen where you left it. Manage the events you draft and review the ones the community sent in."
      footnote={
        <p>
          New here?{' '}
          <Link
            href="/auth/signup"
            className="text-blueprint underline underline-offset-4 hover:text-ink"
          >
            Open an account →
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
          hint={
            <Link
              href="/auth/forgot-password"
              className="text-ink-3 hover:text-ink underline underline-offset-4"
            >
              Forgot it?
            </Link>
          }
        >
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field w-full"
            placeholder="• • • • • • • •"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
