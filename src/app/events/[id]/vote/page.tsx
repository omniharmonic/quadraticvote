'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, Check, Info, RefreshCw } from 'lucide-react';
import { calculateQuadraticVotes, getTotalCredits } from '@/lib/utils/quadratic';

export default function VotingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [event, setEvent] = useState<any>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [inviteCode, setInviteCode] = useState<string>('');
  const [codeInput, setCodeInput] = useState<string>('');
  const [codeVerified, setCodeVerified] = useState<boolean>(false);

  // Get code from URL params or require manual entry
  useEffect(() => {
    const urlCode = searchParams?.get('code');
    if (urlCode) {
      setInviteCode(urlCode);
      setCodeInput(urlCode);
      setCodeVerified(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchEvent();
    loadExistingVote();
  }, [params.id]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setEvent(data.event);
        // Initialize allocations
        const initial: Record<string, number> = {};
        data.event.options.forEach((opt: any) => {
          initial[opt.id] = 0;
        });
        setAllocations(initial);
      }
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingVote = async () => {
    if (!inviteCode || !codeVerified) return;

    try {
      const response = await fetch(`/api/events/${params.id}/votes?code=${inviteCode}`);
      const data = await response.json();

      if (response.ok && data.vote) {
        setAllocations(data.vote.allocations);
        toast({
          title: 'Previous vote loaded',
          description: 'You can modify your vote and resubmit.',
        });
      }
    } catch (error) {
      // No existing vote, that's okay
    }
  };

  const verifyInviteCode = async (code: string) => {
    try {
      const response = await fetch(`/api/events/${params.id}/invites/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setInviteCode(code);
        setCodeVerified(true);
        toast({
          title: 'Code verified!',
          description: 'You can now proceed to vote.',
        });
        return true;
      } else {
        toast({
          title: 'Invalid code',
          description: 'Please check your invite code and try again.',
          variant: 'destructive'
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify code. Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput.trim()) {
      await verifyInviteCode(codeInput.trim());
    }
  };

  const updateAllocation = (optionId: string, value: number) => {
    setAllocations(prev => ({
      ...prev,
      [optionId]: value,
    }));
  };

  const resetAllocations = () => {
    const reset: Record<string, number> = {};
    event.options.forEach((opt: any) => {
      reset[opt.id] = 0;
    });
    setAllocations(reset);
  };

  const handleSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/events/${params.id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode,
          allocations,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Vote submitted successfully!',
          description: 'Your voice has been heard.',
        });
        router.push(`/events/${params.id}/results`);
      } else {
        throw new Error(data.message || 'Failed to submit vote');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit vote',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading voting interface...</p>
        </div>
      </div>
    );
  }

  // Show code entry screen if no valid code
  if (!codeVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Enter Your Invite Code</CardTitle>
            <CardDescription>
              You need a valid invite code to participate in this voting event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">Invite Code</Label>
                <Input
                  id="code"
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Enter your invite code"
                  className="text-center font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!codeInput.trim()}>
                Verify Code
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">About this event:</h4>
              <p className="text-sm text-blue-800"><strong>{event.title}</strong></p>
              {event.description && (
                <p className="text-sm text-blue-700 mt-1">{event.description}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCredits = event.creditsPerVoter;
  const usedCredits = getTotalCredits(allocations);
  const remainingCredits = totalCredits - usedCredits;
  const percentUsed = (usedCredits / totalCredits) * 100;
  const isOverBudget = usedCredits > totalCredits;
  const canSubmit = usedCredits > 0 && !isOverBudget;

  const quadraticVotes = calculateQuadraticVotes(allocations);
  const framework = event.decisionFramework;
  const isBinary = framework.framework_type === 'binary_selection';

  // Keep options in original order to prevent React key confusion
  const displayOptions = event.options || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
              <p className="text-sm text-gray-600">
                {isBinary ? 'Select your preferences' : 'Allocate resources'}
              </p>
            </div>
            <Badge variant={isBinary ? 'default' : 'secondary'}>
              {isBinary ? 'Binary Selection' : 'Proportional'}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className={isOverBudget ? 'text-red-600 font-bold' : 'text-gray-700'}>
                {remainingCredits} credits remaining
              </span>
              <span className="text-gray-600">
                {usedCredits} / {totalCredits} used
              </span>
            </div>
            <Progress 
              value={percentUsed} 
              className={isOverBudget ? 'bg-red-100' : ''}
            />
            {isOverBudget && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                You've exceeded your credit limit
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Options List */}
      <div className="max-w-4xl mx-auto p-4 pb-32">
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium">Quadratic Voting</p>
              <p className="text-xs text-blue-700 mt-1">
                The more credits you allocate to an option, the less impact each additional credit has.
                Formula: votes = √credits. This encourages spreading your support across multiple options.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {displayOptions.map((option: any) => {
            const credits = allocations[option.id] || 0;
            const votes = quadraticVotes[option.id] || 0;
            const percentage = usedCredits > 0 ? (votes / Object.values(quadraticVotes).reduce((a, b) => a + b, 0)) * 100 : 0;

            return (
              <Card key={option.id} className={credits > 0 ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{option.title}</CardTitle>
                      {option.description && (
                        <CardDescription className="mt-1">{option.description}</CardDescription>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-primary">
                        {votes.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        votes (√{credits})
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Credits allocated</span>
                      <span className="font-mono font-bold">{credits}</span>
                    </div>
                    
                    <Slider
                      key={`slider-${option.id}`}
                      value={[credits]}
                      onValueChange={(value) => {
                        // Ensure we're only updating this specific option
                        const newValue = value[0];
                        updateAllocation(option.id, newValue);
                      }}
                      max={Math.min(100, totalCredits)}
                      step={1}
                      className="cursor-pointer"
                    />

                    {credits > 0 && !isBinary && (
                      <div className="text-xs text-muted-foreground">
                        If voting closed now, this would receive{' '}
                        <span className="font-semibold">
                          {framework.config.resource_symbol}
                          {((percentage / 100) * framework.config.total_pool_amount).toFixed(2)}
                        </span>
                        {' '}({percentage.toFixed(1)}% of pool)
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={resetAllocations}
              disabled={usedCredits === 0 || isSubmitting}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
            
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={!canSubmit || isSubmitting}
              className="flex-1 text-lg py-6"
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  Submit Vote <Check className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Vote</DialogTitle>
            <DialogDescription>
              You're about to submit your vote with the following allocation:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {event.options
              .filter((opt: any) => allocations[opt.id] > 0)
              .map((opt: any) => (
                <div key={opt.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium">{opt.title}</span>
                  <div className="text-right">
                    <div className="text-sm font-mono">{allocations[opt.id]} credits</div>
                    <div className="text-xs text-muted-foreground">
                      = {quadraticVotes[opt.id].toFixed(1)} votes
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="text-blue-900">
              You used <strong>{usedCredits}</strong> of {totalCredits} credits total.
              You can edit your vote later if needed.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Confirm & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

