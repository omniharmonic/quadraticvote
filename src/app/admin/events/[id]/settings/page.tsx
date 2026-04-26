'use client';

import { authedFetch } from '@/lib/utils/authed-fetch';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Settings, Trash2, AlertTriangle } from 'lucide-react';
import Navigation from '@/components/layout/navigation';

export default function EventSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [settings, setSettings] = useState({
    title: '',
    description: '',
    visibility: 'public',
    startTime: '',
    endTime: '',
    creditsPerVoter: 100,
    allowLateSubmissions: false,
    requireEmailVerification: true,
    showResultsLive: false,
    allowVoteChanges: true,
    maxVotesPerUser: 1,
  });

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await authedFetch(`/api/events/${eventId}`);
      const data = await response.json();

      if (response.ok && data.event) {
        setEvent(data.event);
        setSettings({
          title: data.event.title || '',
          description: data.event.description || '',
          visibility: data.event.visibility || 'public',
          startTime: data.event.startTime ? new Date(data.event.startTime).toISOString().slice(0, 16) : '',
          endTime: data.event.endTime ? new Date(data.event.endTime).toISOString().slice(0, 16) : '',
          creditsPerVoter: data.event.creditsPerVoter || 100,
          allowLateSubmissions: data.event.allowLateSubmissions || false,
          requireEmailVerification: data.event.requireEmailVerification !== false,
          showResultsLive: data.event.showResultsLive || false,
          allowVoteChanges: data.event.allowVoteChanges !== false,
          maxVotesPerUser: data.event.maxVotesPerUser || 1,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load event settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load event settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await authedFetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Settings saved successfully!',
          description: 'Event settings have been updated.',
        });
        fetchEvent(); // Refresh data
      } else {
        throw new Error(data.message || 'Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authedFetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Event deleted',
          description: 'The event has been permanently deleted.',
        });
        router.push('/admin');
      } else {
        throw new Error('Failed to delete event');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  const isEventActive = () => {
    if (!event) return false;
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <Navigation />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading event settings...</p>
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/admin/events/${eventId}`)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Event Management
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Event Settings</h1>
            <p className="text-gray-600 mt-1">Configure your event preferences and options</p>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" />
            {isEventActive() && (
              <span className="text-sm text-orange-600 font-medium">Event is currently active</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update the basic details of your event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={settings.title}
                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                    placeholder="Enter event title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={settings.description}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                    placeholder="Describe your event..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select
                    value={settings.visibility}
                    onValueChange={(value) => setSettings({ ...settings, visibility: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public - Anyone can see this event</SelectItem>
                      <SelectItem value="unlisted">Unlisted - Only people with the link</SelectItem>
                      <SelectItem value="private">Private - Invite only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Event Schedule</CardTitle>
              <CardDescription>
                Set when voting opens and closes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={settings.startTime}
                    onChange={(e) => setSettings({ ...settings, startTime: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={settings.endTime}
                    onChange={(e) => setSettings({ ...settings, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              {isEventActive() && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <p className="text-sm text-orange-800">
                      <strong>Warning:</strong> This event is currently active. Changing the schedule may affect ongoing voting.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voting Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Voting Configuration</CardTitle>
              <CardDescription>
                Configure how voting works for this event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="creditsPerVoter">Credits Per Voter</Label>
                  <Input
                    id="creditsPerVoter"
                    type="number"
                    min="10"
                    max="1000"
                    value={settings.creditsPerVoter}
                    onChange={(e) => setSettings({ ...settings, creditsPerVoter: parseInt(e.target.value) })}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    How many credits each voter gets to allocate
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxVotesPerUser">Max Votes Per User</Label>
                  <Input
                    id="maxVotesPerUser"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxVotesPerUser}
                    onChange={(e) => setSettings({ ...settings, maxVotesPerUser: parseInt(e.target.value) })}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Maximum number of times a user can vote
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowVoteChanges">Allow Vote Changes</Label>
                    <p className="text-sm text-gray-500">Let voters modify their votes after submission</p>
                  </div>
                  <Switch
                    id="allowVoteChanges"
                    checked={settings.allowVoteChanges}
                    onCheckedChange={(checked) => setSettings({ ...settings, allowVoteChanges: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowLateSubmissions">Allow Late Submissions</Label>
                    <p className="text-sm text-gray-500">Accept votes after the end time</p>
                  </div>
                  <Switch
                    id="allowLateSubmissions"
                    checked={settings.allowLateSubmissions}
                    onCheckedChange={(checked) => setSettings({ ...settings, allowLateSubmissions: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showResultsLive">Show Live Results</Label>
                    <p className="text-sm text-gray-500">Display results in real-time during voting</p>
                  </div>
                  <Switch
                    id="showResultsLive"
                    checked={settings.showResultsLive}
                    onCheckedChange={(checked) => setSettings({ ...settings, showResultsLive: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requireEmailVerification">Require Email Verification</Label>
                    <p className="text-sm text-gray-500">Voters must verify their email before voting</p>
                  </div>
                  <Switch
                    id="requireEmailVerification"
                    checked={settings.requireEmailVerification}
                    onCheckedChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

        </form>

          {/* Onchain Payout (Gnosis Safe) — proportional events only.
              Saves through its own endpoint, independent of the main form. */}
          {event.decisionFramework?.framework_type === 'proportional_distribution' && (
            <PayoutConfigCard
              eventId={eventId}
              initialConfig={event.decisionFramework?.config ?? {}}
              onSaved={fetchEvent}
            />
          )}

          <form onSubmit={handleSave} className="space-y-8">
          {/* Actions */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteEvent}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Event
            </Button>

            <Button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ────────────────────── PAYOUT CONFIG CARD ────────────────────── */
function PayoutConfigCard({
  eventId,
  initialConfig,
  onSaved,
}: {
  eventId: string;
  initialConfig: any;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState<boolean>(
    !!initialConfig?.payout_token_type
  );
  const [tokenType, setTokenType] = useState<'native' | 'erc20'>(
    initialConfig?.payout_token_type === 'erc20' ? 'erc20' : 'native'
  );
  const [tokenAddress, setTokenAddress] = useState<string>(
    initialConfig?.payout_token_address ?? ''
  );
  const [chainId, setChainId] = useState<string>(
    initialConfig?.payout_chain_id ? String(initialConfig.payout_chain_id) : ''
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await authedFetch(`/api/events/${eventId}/payout-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          token_type: enabled ? tokenType : undefined,
          token_address:
            enabled && tokenType === 'erc20' ? tokenAddress.trim() : undefined,
          chain_id: enabled && chainId ? parseInt(chainId) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      toast({
        title: 'Onchain payout updated',
        description: enabled
          ? 'Gnosis Safe CSV export is enabled on this event.'
          : 'Gnosis Safe CSV export is disabled.',
      });
      onSaved();
    } catch (err) {
      toast({
        title: 'Failed to save payout config',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle>Onchain payout (Gnosis Safe)</CardTitle>
        <CardDescription>
          Optional. When enabled, the results page exposes an admin-only
          Safe Airdrop CSV export. Receivers come from each option&apos;s
          linked proposal payout wallet.{' '}
          <a
            href="https://github.com/bh2smith/safe-airdrop"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            CSV Airdrop Safe App docs
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="payoutEnabled-settings">Enable Gnosis Safe CSV export</Label>
            <p className="text-sm text-gray-500">
              Admin-only download on the results page.
            </p>
          </div>
          <Switch
            id="payoutEnabled-settings"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="payoutTokenType-settings">Payout asset</Label>
              <Select
                value={tokenType}
                onValueChange={(v) => setTokenType(v as 'native' | 'erc20')}
              >
                <SelectTrigger id="payoutTokenType-settings">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="native">Native (ETH, xDAI, etc.)</SelectItem>
                  <SelectItem value="erc20">ERC-20 token</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tokenType === 'erc20' && (
              <div className="space-y-2">
                <Label htmlFor="payoutTokenAddress-settings">Token contract address</Label>
                <Input
                  id="payoutTokenAddress-settings"
                  placeholder="0x…"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payoutChainId-settings">Chain</Label>
              <Select
                value={chainId}
                onValueChange={setChainId}
              >
                <SelectTrigger id="payoutChainId-settings">
                  <SelectValue placeholder="Choose chain (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ethereum mainnet (1)</SelectItem>
                  <SelectItem value="8453">Base (8453)</SelectItem>
                  <SelectItem value="10">Optimism (10)</SelectItem>
                  <SelectItem value="42161">Arbitrum One (42161)</SelectItem>
                  <SelectItem value="137">Polygon (137)</SelectItem>
                  <SelectItem value="100">Gnosis Chain (100)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Reminder for which Safe to open. The CSV itself is chain-agnostic.
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? 'Saving…' : (<><Save className="w-4 h-4" /> Save payout config</>)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}