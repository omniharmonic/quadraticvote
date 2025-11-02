'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Calendar, Users, Trophy, Sparkles, ArrowRight } from 'lucide-react';
import type { Event } from '@/lib/types';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, [params.id]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setEvent(data.event);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load event',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isEventActive = () => {
    if (!event) return false;
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
            <CardDescription>The event you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const framework = event.decisionFramework;
  const isBinary = framework.framework_type === 'binary_selection';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            {isBinary ? (
              <Trophy className="h-6 w-6 text-blue-600" />
            ) : (
              <Sparkles className="h-6 w-6 text-purple-600" />
            )}
            <Badge variant="secondary">
              {isBinary ? 'Binary Selection' : 'Proportional Distribution'}
            </Badge>
            {isEventActive() && (
              <Badge className="bg-green-500">Active</Badge>
            )}
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{event.title}</h1>
          {event.description && (
            <p className="text-lg text-gray-600 mb-4">{event.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
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

        {/* Framework Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>How This Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isBinary ? (
              <>
                <p className="text-gray-700">
                  This is a <strong>competitive selection</strong> event. Voters allocate credits 
                  to their preferred options using quadratic voting. Winners are determined by:
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-medium text-blue-900">
                    {framework.config.threshold_mode === 'top_n' && 
                      `Top ${framework.config.top_n_count} options will be selected`}
                    {framework.config.threshold_mode === 'percentage' && 
                      'Options above a percentage threshold'}
                    {framework.config.threshold_mode === 'absolute_votes' && 
                      'Options above an absolute vote threshold'}
                    {framework.config.threshold_mode === 'above_average' && 
                      'Options above the average votes'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-700">
                  This is a <strong>collaborative allocation</strong> event. Voters allocate credits 
                  to options, and resources are distributed proportionally based on the total votes received.
                </p>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-purple-900">
                    Total Pool: {framework.config.resource_symbol}{framework.config.total_pool_amount.toLocaleString()} {framework.config.resource_name}
                  </p>
                  <p className="text-sm text-purple-700">
                    Each option will receive a proportional share based on votes received
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Options */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Options ({event.options?.length || 0})</CardTitle>
            <CardDescription>
              {isBinary ? 'Choose your preferred options' : 'Allocate your credits across these options'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {event.options?.map((option: any, index: number) => (
                <div key={option.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{option.title}</h4>
                      {option.description && (
                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                      )}
                    </div>
                    <Badge variant="outline">#{index + 1}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>


        {/* Participation Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Voting */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">🗳️ Vote on Options</CardTitle>
              <CardDescription className="text-blue-700">
                Use quadratic voting to express your preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-blue-800 space-y-2">
                <p><strong>1.</strong> Get your unique invite code from the event organizer</p>
                <p><strong>2.</strong> Click the button below and enter your code</p>
                <p><strong>3.</strong> Allocate your {event.creditsPerVoter} credits across options</p>
                <p><strong>4.</strong> Submit your vote</p>
              </div>
              <Button
                size="lg"
                onClick={() => router.push(`/events/${event.id}/vote`)}
                className="w-full"
              >
                Start Voting <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Proposal Submission (if enabled) */}
          {(event.optionMode === 'community_proposals' || event.optionMode === 'hybrid') && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900">💡 Submit a Proposal</CardTitle>
                <CardDescription className="text-green-700">
                  {event.optionMode === 'hybrid'
                    ? 'Add your own proposal to the existing options'
                    : 'Submit your idea for community consideration'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-green-800 space-y-2">
                  <p><strong>1.</strong> Describe your proposal clearly</p>
                  <p><strong>2.</strong> Provide supporting details</p>
                  <p><strong>3.</strong> Submit for review and approval</p>
                  <p><strong>4.</strong> Once approved, it becomes a voting option</p>
                </div>
                <Button
                  size="lg"
                  onClick={() => router.push(`/events/${event.id}/propose`)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Submit Proposal <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Additional Actions */}
        <div className="flex gap-4">
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push(`/events/${event.id}/results`)}
            className="flex-1"
          >
            View Results
          </Button>
        </div>
      </div>
    </div>
  );
}

