'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, FileText, Send } from 'lucide-react';
import Navigation from '@/components/layout/navigation';
import type { Event } from '@/lib/types';

export default function ProposalSubmissionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.id as string;
  const inviteCode = searchParams.get('code');

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    submitterEmail: '',
    submitterWallet: '',
    payoutWallet: '',
    inviteCode: inviteCode || ''
  });

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      const data = await response.json();
      if (data.success) {
        setEvent(data.event);
      } else {
        setError('Event not found');
      }
    } catch (error) {
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          eventId
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Proposal submitted successfully!',
          description: 'Your proposal is now under review.',
        });
        setSubmitted(true);
      } else {
        const errorMessage = data.error || data.message || 'Failed to submit proposal';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = 'Failed to submit proposal';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-gray-600">Loading proposal submission...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto py-8">
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <CardTitle>Event Not Found</CardTitle>
                <CardDescription>
                  The event was not found or does not accept community proposals.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button onClick={() => router.push('/')} variant="outline">
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Proposal Submitted Successfully!</h2>
              <p className="text-gray-600 mb-4">
                Your proposal has been submitted and is pending review by moderators.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                You will be notified once your proposal has been reviewed.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => router.push(`/events/${eventId}`)} variant="outline">
                  Back to Event
                </Button>
                <Button onClick={() => router.push('/')}>
                  Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if proposals are enabled for this event
  if (event.optionMode === 'admin_defined') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <CardTitle>Proposals Not Enabled</CardTitle>
              <CardDescription>
                This event uses admin-defined options. Community proposals are not accepted.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.push(`/events/${eventId}`)} variant="outline">
                Back to Event
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Submit a Proposal</h1>
            <p className="text-gray-600 mt-2">
              Propose an option for: <span className="font-medium">{event.title}</span>
            </p>
          </div>

          {/* Event Info */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                About This Event
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  {event.description && (
                    <p className="text-gray-600 mt-1">{event.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="secondary">
                    {event.decisionFramework?.framework_type === 'binary_selection'
                      ? 'Binary Selection'
                      : 'Proportional Distribution'}
                  </Badge>
                  <span className="text-gray-600">
                    {event.creditsPerVoter} credits per voter
                  </span>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Proposal Guidelines:</strong> Anyone can submit proposals for community consideration.
                    Proposals may require moderation before appearing as voting options.
                    Make sure your proposal is clear, relevant, and follows community guidelines.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Your Proposal</CardTitle>
              <CardDescription>
                Fill out the details for your proposal. All fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6" data-testid="proposal-form">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Proposal Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Enter a clear, descriptive title"
                    maxLength={100}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    {formData.title.length}/100 characters
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Provide details about your proposal..."
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="text-sm text-gray-500">
                    {formData.description.length}/1000 characters
                  </p>
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL (optional)</Label>
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => handleChange('imageUrl', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-sm text-gray-500">
                    Add an image to help illustrate your proposal
                  </p>
                </div>

                {/* Submitter Info */}
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Contact & Payout Information</h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="submitterEmail">Email Address *</Label>
                      <Input
                        id="submitterEmail"
                        name="submitterEmail"
                        type="email"
                        value={formData.submitterEmail}
                        onChange={(e) => handleChange('submitterEmail', e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        Used for proposal tracking and updates
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="submitterWallet">Contact Wallet Address (optional)</Label>
                        <Input
                          id="submitterWallet"
                          name="submitterWallet"
                          value={formData.submitterWallet}
                          onChange={(e) => handleChange('submitterWallet', e.target.value)}
                          placeholder="0x... or name.eth"
                        />
                        <p className="text-sm text-gray-500">
                          For token-gated events or verification
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="payoutWallet">Payout Wallet Address (optional)</Label>
                        <Input
                          id="payoutWallet"
                          name="payoutWallet"
                          value={formData.payoutWallet}
                          onChange={(e) => handleChange('payoutWallet', e.target.value)}
                          placeholder="0x... or name.eth"
                        />
                        <p className="text-sm text-gray-500">
                          Where payments should be sent if proposal wins
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invite Code */}
                {!inviteCode && (
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Invite Code (optional)</Label>
                    <Input
                      id="inviteCode"
                      name="inviteCode"
                      value={formData.inviteCode}
                      onChange={(e) => handleChange('inviteCode', e.target.value)}
                      placeholder="Optional - only needed for restricted events"
                    />
                    <p className="text-sm text-gray-500">
                      Most events allow public proposal submission. Only enter a code if specifically required.
                    </p>
                  </div>
                )}

                {/* Preview */}
                {formData.title && (
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">Preview</h3>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">{formData.title}</CardTitle>
                        {formData.description && (
                          <CardDescription>{formData.description}</CardDescription>
                        )}
                      </CardHeader>
                      {formData.imageUrl && (
                        <CardContent>
                          <img
                            src={formData.imageUrl}
                            alt="Proposal"
                            className="max-w-xs rounded border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </CardContent>
                      )}
                    </Card>
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/events/${eventId}`)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !formData.title || !formData.submitterEmail}
                    className="flex items-center gap-2"
                  >
                    {submitting ? (
                      'Submitting...'
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Proposal
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </>
  );
}