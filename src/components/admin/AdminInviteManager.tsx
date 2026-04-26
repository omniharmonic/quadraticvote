'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminInvitation {
  id: string;
  email: string;
  role: 'admin' | 'owner';
  inviteCode: string;
  sentAt: string;
  acceptedAt?: string;
  status: 'pending' | 'accepted' | 'expired';
}

interface AdminInviteManagerProps {
  eventId: string;
}

export function AdminInviteManager({ eventId }: AdminInviteManagerProps) {
  const { user, session, isEventAdmin } = useAuth();
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'owner'>('admin');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await isEventAdmin(eventId);
        setIsAdmin(adminStatus);
        if (adminStatus) {
          await fetchInvitations();
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [eventId, user, isEventAdmin]);

  const fetchInvitations = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/admin-invite`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }

      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (err) {
      setError('Failed to load invitations');
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/events/${eventId}/admin-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setSuccess('Invite created. Copy the link below and send it to them.');
      setInviteEmail('');
      setInviteRole('admin');

      // Refresh invitations list
      await fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Admin Management
        </h3>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Admin invitations
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Each invite generates a link. We don&apos;t send emails — copy the
        link and share it however your community talks.
      </p>

      {/* Invite Form */}
      <form onSubmit={sendInvite} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'owner')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isInviting || !inviteEmail.trim()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInviting ? 'Creating...' : 'Create invite link'}
            </button>
          </div>
        </div>
      </form>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md mb-4">
          {success}
        </div>
      )}

      {/* Invitations List */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Pending invitations
        </h4>

        {invitations.length === 0 ? (
          <p className="text-gray-500 text-sm">No pending invitations</p>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => {
              const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
              const link = `${baseUrl}/admin/invite?code=${invitation.inviteCode}`;
              return (
                <div
                  key={invitation.id}
                  className="border border-gray-200 rounded-md p-3 space-y-2"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {invitation.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        Role: {invitation.role} ·
                        Created: {new Date(invitation.sentAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-1 text-xs font-semibold rounded-full ${
                        invitation.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : invitation.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {invitation.status}
                    </span>
                  </div>

                  {invitation.status === 'pending' && (
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                      <code className="flex-1 truncate text-xs font-mono text-gray-700">
                        {link}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(link);
                          setSuccess('Invite link copied.');
                          setTimeout(() => setSuccess(null), 2000);
                        }}
                        className="shrink-0 text-xs font-medium text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}