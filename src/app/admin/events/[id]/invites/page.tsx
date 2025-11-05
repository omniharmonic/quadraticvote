'use client';

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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  Mail,
  Plus,
  Copy,
  ExternalLink,
  Users,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Upload,
  Trash2
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
    sendEmail: true
  });

  // Bulk invite form
  const [bulkForm, setBulkForm] = useState({
    emails: '',
    inviteType: 'voting' as 'voting' | 'proposal' | 'both',
    sendEmail: true,
    customMessage: ''
  });

  useEffect(() => {
    fetchEventAndInvites();
  }, [eventId]);

  const fetchEventAndInvites = async () => {
    try {
      if (!adminCode) {
        toast({
          title: 'Access Required',
          description: 'Please access this page from the admin dashboard with proper authorization.',
          variant: 'destructive',
        });
        router.push('/');
        return;
      }

      // Fetch event details
      const eventResponse = await fetch(`/api/events/${eventId}`);
      const eventData = await eventResponse.json();

      // Fetch invites with admin code
      const invitesResponse = await fetch(`/api/events/${eventId}/invites?code=${adminCode}`);
      const invitesData = await invitesResponse.json();

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
      const response = await fetch(`/api/events/${eventId}/invites?code=${adminCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(singleForm),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Invites created successfully!',
          description: `${singleForm.count} invite(s) created${singleForm.sendEmail ? ' and email(s) sent' : ''}.`,
        });

        // Reset form
        setSingleForm({
          email: '',
          inviteType: 'voting',
          count: 1,
          sendEmail: true
        });

        // Refresh invites
        fetchEventAndInvites();
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
        fetch(`/api/events/${eventId}/invites?code=${adminCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            inviteType: bulkForm.inviteType,
            count: 1,
            sendEmail: bulkForm.sendEmail,
            customMessage: bulkForm.customMessage
          }),
        })
      );

      const responses = await Promise.allSettled(createPromises);
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const failed = responses.length - successful;

      toast({
        title: 'Bulk invites processed',
        description: `${successful} invites created successfully${failed > 0 ? `, ${failed} failed` : ''}.`,
      });

      // Reset form
      setBulkForm({
        emails: '',
        inviteType: 'voting',
        sendEmail: true,
        customMessage: ''
      });
      setShowBulkDialog(false);

      // Refresh invites
      fetchEventAndInvites();
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
      <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      <Navigation
        eventId={eventId}
        eventTitle={event.title}
        showAdminNav={true}
      />

      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Invite Management</h1>
          <p className="text-gray-600">
            Create and manage invites for: <span className="font-medium">{event.title}</span>
          </p>
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
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList>
            <TabsTrigger value="create">Create Invites</TabsTrigger>
            <TabsTrigger value="manage">Manage Invites ({invites.length})</TabsTrigger>
          </TabsList>

          {/* Create Invites Tab */}
          <TabsContent value="create" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Single Invite */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Single Invite
                  </CardTitle>
                  <CardDescription>
                    Create one or more invites for a specific email address
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

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sendEmail"
                        checked={singleForm.sendEmail}
                        onCheckedChange={(checked) => setSingleForm({ ...singleForm, sendEmail: checked })}
                      />
                      <Label htmlFor="sendEmail">Send email automatically</Label>
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
                          Create Invite{singleForm.count > 1 ? 's' : ''}
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
                    Bulk Invites
                  </CardTitle>
                  <CardDescription>
                    Create invites for multiple email addresses at once
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowBulkDialog(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Create Bulk Invites
                  </Button>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> Bulk invites allow you to send invites to multiple people at once.
                      You can paste email addresses or upload a list.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            {invites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Useful actions for managing your invites
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={copyAllLinks}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy All Links
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline">
                      <Send className="w-4 h-4 mr-2" />
                      Resend Emails
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
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invites yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first invite to get started with participant recruitment.
                  </p>
                  <Button onClick={() => {
                    const createTab = document.querySelector('[data-value="create"]') as HTMLElement;
                    if (createTab) {
                      createTab.click();
                    }
                  }}>
                    Create First Invite
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {invites.map((invite) => (
                  <Card key={invite.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-gray-900">{invite.email}</span>
                            {getInviteStatus(invite)}
                            <Badge variant="outline">{getInviteTypeDisplay(invite.inviteType)}</Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Code: {invite.code}</span>
                            {invite.usedAt && (
                              <>
                                <span>•</span>
                                <span>Opened: {new Date(invite.usedAt).toLocaleDateString()}</span>
                              </>
                            )}
                            {invite.voteSubmittedAt && (
                              <>
                                <span>•</span>
                                <span>Voted: {new Date(invite.voteSubmittedAt).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyInviteLink(invite.code)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const baseUrl = window.location.origin;
                              const link = `${baseUrl}/events/${eventId}/vote?code=${invite.code}`;
                              window.open(link, '_blank');
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Invite Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Bulk Invites</DialogTitle>
            <DialogDescription>
              Enter email addresses (one per line) to create multiple invites at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emails">Email Addresses *</Label>
              <Textarea
                id="emails"
                value={bulkForm.emails}
                onChange={(e) => setBulkForm({ ...bulkForm, emails: e.target.value })}
                placeholder={`alice@example.com\nbob@example.com\ncharlie@example.com`}
                rows={8}
              />
              <p className="text-sm text-gray-500">
                Enter one email address per line. Invalid emails will be skipped.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invite Type</Label>
                <Select
                  value={bulkForm.inviteType}
                  onValueChange={(value: any) => setBulkForm({ ...bulkForm, inviteType: value })}
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

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="bulkSendEmail"
                  checked={bulkForm.sendEmail}
                  onCheckedChange={(checked) => setBulkForm({ ...bulkForm, sendEmail: checked })}
                />
                <Label htmlFor="bulkSendEmail">Send emails automatically</Label>
              </div>
            </div>

            {bulkForm.sendEmail && (
              <div className="space-y-2">
                <Label htmlFor="customMessage">Custom Message (optional)</Label>
                <Textarea
                  id="customMessage"
                  value={bulkForm.customMessage}
                  onChange={(e) => setBulkForm({ ...bulkForm, customMessage: e.target.value })}
                  placeholder="Add a personal message to the invite emails..."
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBulk}
              disabled={isCreating || !bulkForm.emails.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Invites'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}