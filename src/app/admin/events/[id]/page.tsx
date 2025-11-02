'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/components/layout/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Settings,
  Users,
  FileText,
  BarChart3,
  Calendar,
  Trophy,
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
  Mail
} from 'lucide-react';
import Link from 'next/link';

export default function EventManagementPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${eventId}`);
      const eventData = await eventResponse.json();

      // Fetch invites stats
      const invitesResponse = await fetch(`/api/events/${eventId}/invites`);
      const invitesData = await invitesResponse.json();

      // Fetch proposals if applicable
      const proposalsResponse = await fetch(`/api/proposals?eventId=${eventId}`);
      const proposalsData = await proposalsResponse.json();

      if (eventData.success) {
        setEvent(eventData.event);
        setStats({
          invites: {
            total: invitesData.invites?.length || 0,
            used: invitesData.invites?.filter((i: any) => i.usedAt).length || 0,
            voted: invitesData.invites?.filter((i: any) => i.voteSubmittedAt).length || 0,
          },
          proposals: {
            total: proposalsData.proposals?.length || 0,
            pending: proposalsData.proposals?.filter((p: any) => p.status === 'pending_approval').length || 0,
            approved: proposalsData.proposals?.filter((p: any) => p.status === 'approved').length || 0,
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEventActive = () => {
    if (!event) return false;
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
  };

  const getEventStatus = () => {
    if (!event) return 'Unknown';
    const now = new Date();
    if (now < new Date(event.startTime)) return 'Upcoming';
    if (now > new Date(event.endTime)) return 'Ended';
    return 'Active';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading || !event) {
    return (
      <div>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading event management...</p>
          </div>
        </div>
      </div>
    );
  }

  const framework = event.decisionFramework;
  const isBinary = framework.framework_type === 'binary_selection';
  const eventStatus = getEventStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        eventId={eventId}
        eventTitle={event.title}
        showAdminNav={true}
      />

      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
              <p className="text-gray-600 mt-1">Manage all aspects of your voting event</p>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant={eventStatus === 'Active' ? 'default' : eventStatus === 'Upcoming' ? 'secondary' : 'outline'}
                className={eventStatus === 'Active' ? 'bg-green-500' : ''}
              >
                {eventStatus}
              </Badge>

              {isBinary ? (
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600">Binary Selection</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-purple-600">Proportional Distribution</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
            {event.description && (
              <p className="text-gray-600 mb-3">{event.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(event.startTime)} - {formatDate(event.endTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{event.creditsPerVoter} credits per voter</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Invites Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.invites?.total || 0}</div>
              <div className="text-sm text-gray-500">
                {stats.invites?.used || 0} opened
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Votes Cast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.invites?.voted || 0}</div>
              <div className="text-sm text-gray-500">
                {stats.invites?.total > 0 ? Math.round((stats.invites?.voted / stats.invites?.total) * 100) : 0}% participation
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Voting Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{event.options?.length || 0}</div>
              <div className="text-sm text-gray-500">
                {event.optionMode === 'community_proposals' ? 'Community driven' : 'Admin defined'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.proposals?.total || 0}</div>
              <div className="text-sm text-gray-500">
                {stats.proposals?.pending || 0} pending review
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Invite Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Manage Invites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Create and send invite codes to participants
              </p>
              <div className="space-y-2">
                <Link href={`/admin/events/${eventId}/invites`}>
                  <Button className="w-full" variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Invite Management
                  </Button>
                </Link>
                <Link href={`/admin/events/${eventId}/invites/batch`}>
                  <Button className="w-full" variant="outline">
                    Send Batch Invites
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Proposal Management */}
          {event.optionMode !== 'admin_defined' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Proposals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Review and manage community proposals
                </p>
                <div className="space-y-2">
                  <Link href="/admin/proposals">
                    <Button className="w-full" variant="outline">
                      Review Proposals
                      {stats.proposals?.pending > 0 && (
                        <Badge className="ml-2">{stats.proposals.pending}</Badge>
                      )}
                    </Button>
                  </Link>
                  <Link href={`/events/${eventId}/propose`}>
                    <Button className="w-full" variant="outline">
                      Submit Proposal
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Event Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Configure event options and settings
              </p>
              <div className="space-y-2">
                <Link href={`/admin/events/${eventId}/options`}>
                  <Button className="w-full" variant="outline">
                    Manage Options
                  </Button>
                </Link>
                <Link href={`/admin/events/${eventId}/settings`}>
                  <Button className="w-full" variant="outline">
                    Event Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Results & Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Results & Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                View voting results and participation analytics
              </p>
              <div className="space-y-2">
                <Link href={`/events/${eventId}/results`}>
                  <Button className="w-full" variant="outline">
                    View Results
                  </Button>
                </Link>
                <Link href={`/admin/events/${eventId}/analytics`}>
                  <Button className="w-full" variant="outline">
                    Analytics Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Public View */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Public View
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                View your event as participants see it
              </p>
              <div className="space-y-2">
                <Link href={`/events/${eventId}`}>
                  <Button className="w-full" variant="outline">
                    Public Event Page
                  </Button>
                </Link>
                <Link href={`/events/${eventId}/vote`}>
                  <Button className="w-full" variant="outline">
                    Preview Voting
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Status & Next Steps */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Event Status & Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {eventStatus === 'Upcoming' && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Event Starting Soon</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your event starts {formatDate(event.startTime)}. Make sure to send invites to participants before voting begins.
                    </p>
                  </div>
                </div>
              )}

              {eventStatus === 'Active' && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Voting is Live!</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Participants can now vote using their invite codes. Monitor participation and results in real-time.
                    </p>
                  </div>
                </div>
              )}

              {eventStatus === 'Ended' && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Event Concluded</h4>
                    <p className="text-sm text-gray-700 mt-1">
                      Voting has ended. Review the final results and share them with participants.
                    </p>
                  </div>
                </div>
              )}

              {/* Progress indicators */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Invites Sent</span>
                    <span>{stats.invites?.total || 0} total</span>
                  </div>
                  <Progress value={stats.invites?.total > 0 ? 100 : 0} />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Participation Rate</span>
                    <span>
                      {stats.invites?.total > 0 ? Math.round((stats.invites?.voted / stats.invites?.total) * 100) : 0}%
                    </span>
                  </div>
                  <Progress
                    value={stats.invites?.total > 0 ? (stats.invites?.voted / stats.invites?.total) * 100 : 0}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}