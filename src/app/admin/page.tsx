'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, BarChart3, UserPlus, Plus, Calendar } from 'lucide-react';
import Navigation from '@/components/layout/navigation';
import { useAuth } from '@/contexts/AuthContext';

type AdminEventEntry = { event: any; role: string };

export default function AdminDashboard() {
  const { user, isAuthenticated, loading, getUserAdminEvents } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<AdminEventEntry[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?redirect=/admin');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setEventsLoading(true);
      try {
        const result = await getUserAdminEvents();
        if (!cancelled) setEvents(result);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, getUserAdminEvents]);

  if (loading || !user) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto py-8">
          <div className="animate-pulse">Loading admin dashboard…</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, <span className="font-medium">{user.email}</span>
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Event
              </CardTitle>
              <CardDescription>Start a new voting event</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/events/create">
                <Button className="w-full">New Event</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Proposals
              </CardTitle>
              <CardDescription>Moderate community proposals</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/proposals">
                <Button className="w-full" variant="outline">
                  Moderation Queue
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Admin Invite
              </CardTitle>
              <CardDescription>Accept an admin invitation</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/invite">
                <Button className="w-full" variant="outline">
                  Accept Invite
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Your events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Your Events
            </CardTitle>
            <CardDescription>Events where you have admin access</CardDescription>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : events.length === 0 ? (
              <div className="text-sm text-gray-500">
                You don&apos;t admin any events yet.{' '}
                <Link href="/events/create" className="text-indigo-600 hover:text-indigo-500 font-medium">
                  Create one
                </Link>
                .
              </div>
            ) : (
              <ul className="divide-y">
                {events.map(({ event, role }) => (
                  <li key={event.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(event.start_time).toLocaleDateString()} → {new Date(event.end_time).toLocaleDateString()}
                        <Badge variant="outline" className="ml-2">{role}</Badge>
                      </div>
                    </div>
                    <Link href={`/admin/events/${event.id}`}>
                      <Button size="sm" variant="outline">Manage</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
