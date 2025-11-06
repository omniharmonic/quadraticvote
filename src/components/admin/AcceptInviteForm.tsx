'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

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

    if (!user) {
      setError('You must be logged in to accept an invitation');
      return;
    }

    if (!inviteCode.trim()) {
      setError('Please enter an invitation code');
      return;
    }

    setIsAccepting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setSuccess('Admin invitation accepted successfully!');

      // Redirect to admin page after short delay
      setTimeout(() => {
        router.push('/admin');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Accept Admin Invitation
        </h2>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
          Please log in to accept an admin invitation.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Accept Admin Invitation
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
            Invitation Code
          </label>
          <input
            type="text"
            id="inviteCode"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your invitation code"
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
            {success}
            <div className="text-sm mt-1">Redirecting to admin panel...</div>
          </div>
        )}

        <button
          type="submit"
          disabled={isAccepting || !inviteCode.trim() || !!success}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAccepting ? 'Accepting...' : 'Accept Invitation'}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          By accepting this invitation, you will gain administrative access to manage events.
        </p>
      </div>
    </div>
  );
}