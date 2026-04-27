'use client';

import { useEffect, useState, Suspense } from 'react';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setError(error.message);
          return;
        }

        // Honor a ?redirect= param so flows like email-verification can
        // round-trip the user back to where they started (e.g. the vote
        // page they were trying to access). Only allow same-origin paths
        // — anything starting with `/` is on us; never follow an absolute
        // URL into a phisher's domain.
        const requested = searchParams.get('redirect') || searchParams.get('next');
        const safeRedirect =
          requested && requested.startsWith('/') && !requested.startsWith('//')
            ? requested
            : null;

        if (data.session) {
          router.push(safeRedirect ?? '/admin');
        } else {
          // No session, send to login but preserve the desired final
          // destination so login → vote round-trips too.
          const loginHref = safeRedirect
            ? `/auth/login?redirect=${encodeURIComponent(safeRedirect)}`
            : '/auth/login';
          router.push(loginHref);
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h2>
          <div className="bg-red-50 p-4 rounded-md mb-4">
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={() => router.push('/auth/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}