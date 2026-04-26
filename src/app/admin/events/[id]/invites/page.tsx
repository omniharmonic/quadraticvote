'use client';

import { authedFetch } from '@/lib/utils/authed-fetch';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  Mail,
  Plus,
  Copy,
  ExternalLink,
  Users,
  CheckCircle,
  Clock,
  Upload,
} from 'lucide-react';
import Navigation from '@/components/layout/navigation';

interface Invite {
  id: string;
  code: string;
  email: string;
  inviteType: 'voting' | 'proposal' | 'both';
  usedAt?: string;
  voteSubmittedAt?: string;
  proposalsSubmitted?: number;
  metadata: any;
}

export default function InviteManagementPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getAdminCode, setAdminCode } = useAdmin();
  const eventId = params.id as string;

  // Try to get admin code from URL params first, then from context
  const adminCodeParam = searchParams.get('code');
  const adminCode = adminCodeParam || getAdminCode(eventId);

  // Store admin code if provided in URL
  useEffect(() => {
    if (adminCodeParam) {
      setAdminCode(adminCodeParam);
    }
  }, [adminCodeParam, setAdminCode]);

  const [event, setEvent] = useState<any>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  // Single invite form
  const [singleForm, setSingleForm] = useState({
    email: '',
    inviteType: 'voting' as 'voting' | 'proposal' | 'both',
    count: 1,
  });

  // Bulk invite form
  const [bulkForm, setBulkForm] = useState({
    emails: '',
    inviteType: 'voting' as 'voting' | 'proposal' | 'both',
  });

  // After creating, jump to the Manage tab so users see the link they need to share.
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  useEffect(() => {
    fetchEventAndInvites();
  }, [eventId]);

  const fetchEventAndInvites = async () => {
    try {
      // Fetch event details
      const eventResponse = await authedFetch(`/api/events/${eventId}`);
      const eventData = await eventResponse.json();

      // Fetch invites — auth is JWT-based via authedFetch
      const invitesResponse = await authedFetch(`/api/events/${eventId}/invites`);
      const invitesData = await invitesResponse.json();

      if (invitesResponse.status === 401 || invitesResponse.status === 403) {
        router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
        return;
      }

      if (eventData.success && invitesData.success) {
        setEvent(eventData.event);
        setInvites(Array.isArray(invitesData.invites) ? invitesData.invites : []);
      } else {
        const errorMessage = eventData.error || invitesData.error || 'Failed to load event and invites';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await authedFetch(`/api/events/${eventId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(singleForm),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: `Invite${singleForm.count > 1 ? 's' : ''} created`,
          description: 'Copy the link from the Manage tab and share it.',
        });

        // Reset form
        setSingleForm({
          email: '',
          inviteType: 'voting',
          count: 1,
        });

        // Refresh and jump to Manage so the link is immediately visible.
        await fetchEventAndInvites();
        setActiveTab('manage');
      } else {
        throw new Error(data.message || 'Failed to create invites');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create invites',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateBulk = async () => {
    if (!bulkForm.emails.trim()) return;

    setIsCreating(true);

    try {
      const emailList = bulkForm.emails
        .split('\n')
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      if (emailList.length === 0) {
        throw new Error('No valid email addresses found');
      }

      // Create invites for each email
      const createPromises = emailList.map(email =>
        authedFetch(`/api/events/${eventId}/invites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            inviteType: bulkForm.inviteType,
            count: 1,
          }),
        })
      );

      const responses = await Promise.allSettled(createPromises);
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const failed = responses.length - successful;

      toast({
        title: 'Bulk invites created',
        description:
          `${successful} link${successful === 1 ? '' : 's'} ready to share` +
          (failed > 0 ? `, ${failed} failed` : '') + '.',
      });

      // Reset form
      setBulkForm({
        emails: '',
        inviteType: 'voting',
      });
      setShowBulkDialog(false);

      // Refresh and jump to Manage tab.
      await fetchEventAndInvites();
      setActiveTab('manage');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create bulk invites',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyInviteLink = (code: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/events/${eventId}/vote?code=${code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copied!',
      description: 'Invite link has been copied to clipboard.',
    });
  };

  const copyAllLinks = () => {
    const baseUrl = window.location.origin;
    const links = invites.map(invite =>
      `${invite.email}: ${baseUrl}/events/${eventId}/vote?code=${invite.code}`
    ).join('\n');

    navigator.clipboard.writeText(links);
    toast({
      title: 'All links copied!',
      description: 'All invite links have been copied to clipboard.',
    });
  };

  const getInviteStatus = (invite: Invite) => {
    if (invite?.voteSubmittedAt) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Voted</Badge>;
    } else if (invite?.usedAt) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Opened</Badge>;
    } else {
      return <Badge variant="outline"><Mail className="w-3 h-3 mr-1" />Sent</Badge>;
    }
  };

  const getInviteTypeDisplay = (type: string) => {
    switch (type) {
      case 'voting':
        return 'Voting Only';
      case 'proposal':
        return 'Proposals Only';
      case 'both':
        return 'Voting & Proposals';
      default:
        return type;
    }
  };

  const stats = {
    total: invites?.length || 0,
    sent: invites?.length || 0,
    opened: invites?.filter(i => i?.usedAt).length || 0,
    voted: invites?.filter(i => i?.voteSubmittedAt).length || 0,
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <Navigation />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading invite management...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navigation
        eventId={eventId}
        eventTitle={event.title}
        showAdminNav={true}
      />

      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-ink mb-2">Invites</h1>
          <p className="text-ink-2">
            Manage invite links for: <span className="font-medium">{event.title}</span>
          </p>
        </div>

        {/* Honest banner — we don't actually send emails */}
        <div className="mb-8 border border-blueprint/30 bg-blueprint/8 rounded-[3px] px-4 py-3 font-serif text-[14.5px] text-ink-2 leading-snug">
          <strong className="text-ink">Heads up:</strong> we don&apos;t send emails (yet).
          Each invite generates a unique link — copy it from the Manage tab and
          share it however your community talks (email, Slack, Discord, DMs).
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Invites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Opened</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.opened}</div>
              <div className="text-sm text-gray-500">
                {stats.total > 0 ? Math.round((stats.opened / stats.total) * 100) : 0}% open rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Voted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.voted}</div>
              <div className="text-sm text-gray-500">
                {stats.total > 0 ? Math.round((stats.voted / stats.total) * 100) : 0}% conversion
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.total - stats.voted}</div>
              <div className="text-sm text-gray-500">
                Haven't voted yet
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'create' | 'manage')}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="create">Create invites</TabsTrigger>
            <TabsTrigger value="manage">Manage invites ({invites.length})</TabsTrigger>
          </TabsList>

          {/* Create Invites Tab */}
          <TabsContent value="create" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Single Invite */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Single invite
                  </CardTitle>
                  <CardDescription>
                    Generate a unique invite link for one person.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateSingle} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={singleForm.email}
                        onChange={(e) => setSingleForm({ ...singleForm, email: e.target.value })}
                        placeholder="participant@example.com"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Invite Type</Label>
                        <Select
                          value={singleForm.inviteType}
                          onValueChange={(value: any) => setSingleForm({ ...singleForm, inviteType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="voting">Voting Only</SelectItem>
                            <SelectItem value="proposal">Proposals Only</SelectItem>
                            <SelectItem value="both">Voting & Proposals</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="count">Count</Label>
                        <Input
                          id="count"
                          type="number"
                          min="1"
                          max="10"
                          value={singleForm.count}
                          onChange={(e) => setSingleForm({ ...singleForm, count: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isCreating || !singleForm.email}
                    >
                      {isCreating ? (
                        'Creating...'
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create invite{singleForm.count > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Bulk Invites */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Bulk invites
                  </CardTitle>
                  <CardDescription>
                    Generate links for many people at once. Paste a list of
                    emails — each one gets its own unique link.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowBulkDialog(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Paste email list
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            {invites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick actions</CardTitle>
                  <CardDescription>
                    Copy every invite link at once, or jump to the manage tab to copy one at a time.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={copyAllLinks}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy all links
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('manage')}>
                      <Mail className="w-4 h-4 mr-2" />
                      Open manage tab
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Manage Invites Tab */}
          <TabsContent value="manage">
            {invites.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Mail className="h-12 w-12 text-ink-3 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-ink mb-2">No invites yet</h3>
                  <p className="text-ink-2 mb-4">
                    Create an invite to generate a shareable link.
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    Create first invite
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {invites.map((invite) => {
                  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                  const link = `${baseUrl}/events/${eventId}/vote?code=${invite.code}`;
                  return (
                    <Card key={invite.id}>
                      <CardContent className="p-6 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-medium text-ink">{invite.email}</span>
                          {getInviteStatus(invite)}
                          <Badge variant="outline">{getInviteTypeDisplay(invite.inviteType)}</Badge>
                        </div>

                        {/* The link IS the share artifact — make it the prominent thing */}
                        <div className="flex items-center gap-2 border border-ink/20 bg-paper-2/50 rounded-[3px] px-3 py-2">
                          <code className="flex-1 truncate font-mono text-[12.5px] text-ink-2">
                            {link}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyInviteLink(invite.code)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(link, '_blank')}
                            title="Preview as voter"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-ink-3 flex-wrap">
                          {invite.usedAt && (
                            <span>Opened: {new Date(invite.usedAt).toLocaleDateString()}</span>
                          )}
                          {invite.voteSubmittedAt && (
                            <span>Voted: {new Date(invite.voteSubmittedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Invite Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create bulk invites</DialogTitle>
            <DialogDescription>
              Paste a list of email addresses (one per line). We&apos;ll generate
              a unique invite link for each one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emails">Email addresses *</Label>
              <Textarea
                id="emails"
                value={bulkForm.emails}
                onChange={(e) => setBulkForm({ ...bulkForm, emails: e.target.value })}
                placeholder={`alice@example.com\nbob@example.com\ncharlie@example.com`}
                rows={8}
              />
              <p className="text-sm text-ink-3">
                One per line. Invalid lines are skipped.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Invite type</Label>
              <Select
                value={bulkForm.inviteType}
                onValueChange={(value: any) => setBulkForm({ ...bulkForm, inviteType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voting">Voting only</SelectItem>
                  <SelectItem value="proposal">Proposals only</SelectItem>
                  <SelectItem value="both">Voting &amp; proposals</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBulk}
              disabled={isCreating || !bulkForm.emails.trim()}
            >
              {isCreating ? 'Creating...' : 'Create invites'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}