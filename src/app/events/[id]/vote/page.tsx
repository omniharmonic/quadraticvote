'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { calculateQuadraticVotes, getTotalCredits } from '@/lib/utils/quadratic';
import Navigation from '@/components/layout/navigation';
import {
  GraphPaper,
  SectionLabel,
  SchematicCard,
  Stamp,
  Sqrt,
  NumberMarker,
} from '@/components/schematic';
import { cn } from '@/lib/utils/cn';

export const dynamic = 'force-dynamic';

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

  /* ─── load event ─── */
  useEffect(() => {
    let cancelled = false;
    // Forward any invite code on the URL so private events can be loaded
    // by their invitees (the API gates GET by visibility).
    const urlCode = searchParams?.get('code');
    const url = urlCode
      ? `/api/events/${params.id}?code=${encodeURIComponent(urlCode)}`
      : `/api/events/${params.id}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.event) return;
        setEvent(d.event);
        const init: Record<string, number> = {};
        d.event.options?.forEach((o: any) => (init[o.id] = 0));
        setAllocations(init);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [params.id, searchParams]);

  /* ─── code from URL or anon for public ─── */
  useEffect(() => {
    const urlCode = searchParams?.get('code');
    if (urlCode) {
      setInviteCode(urlCode);
      setCodeInput(urlCode);
      setCodeVerified(true);
    } else if (event?.visibility === 'public') {
      setInviteCode('anonymous');
      setCodeVerified(true);
    }
  }, [searchParams, event]);

  /* ─── load existing vote, if any ─── */
  useEffect(() => {
    if (!inviteCode || !codeVerified) return;
    fetch(`/api/events/${params.id}/votes?code=${inviteCode}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.vote?.allocations) {
          setAllocations(d.vote.allocations);
          toast({
            title: 'Previous draft loaded',
            description: 'Edit and resubmit to update your vote.',
          });
        }
      })
      .catch(() => {});
  }, [inviteCode, codeVerified, params.id]);

  const verifyInviteCode = async (code: string) => {
    const r = await fetch(`/api/events/${params.id}/invites/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const d = await r.json();
    if (r.ok && d.valid) {
      setInviteCode(code);
      setCodeVerified(true);
      return true;
    }
    toast({
      title: 'Invalid invite code',
      description: 'Check the code and try again, or ask the organizer.',
      variant: 'destructive',
    });
    return false;
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput.trim()) await verifyInviteCode(codeInput.trim());
  };

  const updateAllocation = (id: string, v: number) =>
    setAllocations((p) => ({ ...p, [id]: v }));

  const resetAllocations = () => {
    const r: Record<string, number> = {};
    event.options.forEach((o: any) => (r[o.id] = 0));
    setAllocations(r);
  };

  const handleSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    try {
      // Use authedFetch so a signed-in voter's bearer token rides along —
      // events with requireEmailVerification need it. Anonymous voters
      // simply send no token, and the server falls back accordingly.
      const r = await authedFetch(`/api/events/${params.id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, allocations }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Submission failed');
      toast({ title: 'Vote submitted.', description: 'Thanks for participating.' });
      router.push(`/events/${params.id}/results`);
    } catch (err) {
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-paper">
        <Navigation />
        <div className="mx-auto max-w-3xl px-5 md:px-8 py-20 font-mono text-[11px] uppercase tracking-widest text-ink-3">
          Loading…
        </div>
      </div>
    );
  }

  /* ─── invite-code gate (private events) ─── */
  if (!codeVerified) {
    const isPublic = event.visibility === 'public';
    return (
      <div className="min-h-screen bg-paper relative">
        <Navigation eventTitle={event.title} />
        <GraphPaper aria-hidden className="absolute inset-0 opacity-40 pointer-events-none" />
        <div className="relative mx-auto max-w-md px-5 md:px-8 py-16">
          <SectionLabel>Verify</SectionLabel>
          <h1 className="mt-3 font-display text-4xl text-ink leading-tight text-balance">
            {isPublic ? 'Vote anonymously' : 'Enter your invite code'}
          </h1>
          <p className="mt-3 font-serif text-[16px] text-ink-2 leading-snug">
            {isPublic
              ? 'This event is open to the public. Vote anonymously, or enter an invite code if an organizer sent you one.'
              : 'This event is invite-only. Enter the code that was shared with you.'}
          </p>

          <SchematicCard accent className="mt-8 p-6">
            <div className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3 mb-3">
              Event
            </div>
            <h2 className="font-display text-xl text-ink leading-tight">
              {event.title}
            </h2>
            {event.description && (
              <p className="mt-1.5 font-serif text-[14px] text-ink-2 leading-snug">
                {event.description}
              </p>
            )}
          </SchematicCard>

          {isPublic && (
            <button
              type="button"
              className="btn-ink w-full mt-6"
              onClick={() => {
                setInviteCode('anonymous');
                setCodeVerified(true);
              }}
            >
              Continue anonymously →
            </button>
          )}

          <form onSubmit={handleCodeSubmit} className="mt-6 space-y-3">
            <label className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3 block">
              {isPublic ? 'Or use an invite code' : 'Invite code'}
            </label>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="••••-••••-••••"
              className="field w-full text-center font-mono tracking-widest"
            />
            <button
              type="submit"
              disabled={!codeInput.trim()}
              className="btn-paper w-full"
            >
              Verify code
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalCredits = event.creditsPerVoter as number;
  const usedCredits = getTotalCredits(allocations);
  const remainingCredits = totalCredits - usedCredits;
  const overBudget = usedCredits > totalCredits;
  const canSubmit = usedCredits > 0 && !overBudget;

  const quadVotes = calculateQuadraticVotes(allocations);
  const totalQuadVotes = Object.values(quadVotes).reduce((a, b) => a + b, 0);
  const framework = event.decisionFramework;
  const isBinary = framework?.framework_type === 'binary_selection';

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navigation eventTitle={event.title} />

      {/* sticky budget bar — the credit purse */}
      <div className="sticky top-[57px] z-30 bg-paper/90 backdrop-blur-sm border-b border-ink/15">
        <div className="mx-auto max-w-4xl px-5 md:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Sqrt size="sm" className="text-blueprint/80" />
              <div>
                <div className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3">
                  Credit purse · {totalCredits} total
                </div>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span
                    className={cn(
                      'font-display text-[28px] leading-none tabular-nums',
                      overBudget ? 'text-wine' : 'text-ink'
                    )}
                  >
                    {remainingCredits}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
                    remaining
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetAllocations}
                disabled={usedCredits === 0 || isSubmitting}
                className="btn-paper text-[11px] disabled:opacity-40"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                disabled={!canSubmit || isSubmitting}
                className="btn-ink disabled:opacity-40"
              >
                {isSubmitting ? 'Submitting…' : 'Submit ballot →'}
              </button>
            </div>
          </div>

          {/* Budget bar — drawn like a beam in a structural drawing */}
          <div className="mt-3 relative h-2 border border-ink/25 bg-paper">
            <div
              className={cn(
                'h-full transition-all',
                overBudget ? 'bg-wine' : 'bg-blueprint'
              )}
              style={{ width: Math.min(100, (usedCredits / totalCredits) * 100) + '%' }}
            />
            <span
              aria-hidden
              className="absolute -top-1 left-0 w-px h-3 bg-ink/40"
            />
            <span
              aria-hidden
              className="absolute -top-1 right-0 w-px h-3 bg-ink/40"
            />
          </div>
          {overBudget && (
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-wine">
              ⚠ Over budget — pull back {usedCredits - totalCredits} credit{usedCredits - totalCredits === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </div>

      {/* Hero block */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-4xl px-5 md:px-8 py-10">
          <SectionLabel>Cast a vote</SectionLabel>
          <h1 className="mt-3 font-display text-[34px] sm:text-[42px] leading-[1.05] tracking-[-0.018em] text-ink anim-ink text-balance">
            Allocate your credits. The math does the rest.
          </h1>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1 font-serif text-[15px] text-ink-2">
            <span>
              <span className="text-ink-3 font-mono text-[11px] uppercase tracking-widest mr-2">Method</span>
              votes = √credits
            </span>
            <span>
              <span className="text-ink-3 font-mono text-[11px] uppercase tracking-widest mr-2">Tip</span>
              spreading credits earns more votes than concentrating
            </span>
          </div>
        </div>
      </section>

      {/* Options list */}
      <main className="mx-auto max-w-4xl px-5 md:px-8 py-10 pb-24 space-y-4">
        {event.options?.map((option: any, i: number) => {
          const credits = allocations[option.id] ?? 0;
          const votes = quadVotes[option.id] ?? 0;
          const percentOfPool = totalQuadVotes > 0 ? (votes / totalQuadVotes) * 100 : 0;
          const allocatedHere = credits > 0;

          return (
            <SchematicCard
              key={option.id}
              accent={allocatedHere}
              className={cn('p-6 md:p-7 transition-colors')}
            >
              <div className="flex items-start gap-4">
                <NumberMarker n={i + 1} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-[22px] text-ink leading-tight">
                    {option.title}
                  </h3>
                  {option.description && (
                    <p className="mt-1.5 font-serif text-[14.5px] text-ink-2 leading-snug">
                      {option.description}
                    </p>
                  )}
                </div>

                {/* Math display */}
                <div className="text-right shrink-0 min-w-[120px]">
                  <div
                    className={cn(
                      'font-display text-[36px] leading-none tabular-nums',
                      allocatedHere ? 'text-blueprint' : 'text-ink-3'
                    )}
                  >
                    {votes.toFixed(1)}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ink-3 mt-1">
                    votes · √{credits}
                  </div>
                </div>
              </div>

              <hr className="ink-rule" />

              {/* Slider */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <label
                    htmlFor={`alloc-${option.id}`}
                    className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3"
                  >
                    Credits allocated
                  </label>
                  <span
                    className={cn(
                      'font-mono text-[14px] tabular-nums',
                      allocatedHere ? 'text-blueprint font-semibold' : 'text-ink-3'
                    )}
                  >
                    {credits}
                  </span>
                </div>

                <Slider
                  data-testid={`allocation-${i}`}
                  value={[credits]}
                  onValueChange={(v) => updateAllocation(option.id, v[0])}
                  max={Math.min(100, totalCredits)}
                  step={1}
                  className="cursor-pointer"
                />

                {/* Live spend preview */}
                {allocatedHere && !isBinary && framework?.config?.total_pool_amount && (
                  <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-widest text-ink-3">
                    <span>Projected share if voting closed now</span>
                    <span className="text-terracotta tabular-nums">
                      {((percentOfPool / 100) * framework.config.total_pool_amount).toFixed(2)}{' '}
                      {framework.config.resource_symbol}
                      <span className="text-ink-3 ml-2">
                        ({percentOfPool.toFixed(1)}% of pool)
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </SchematicCard>
          );
        })}
      </main>

      {/* Confirmation dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="!bg-paper !border-ink/25 !rounded-[4px]">
          <DialogHeader>
            <Stamp tone="terracotta" rotate={-3} className="self-start mb-2">
              Confirm · Final
            </Stamp>
            <DialogTitle className="font-display text-2xl text-ink">
              Submit this ballot?
            </DialogTitle>
            <DialogDescription className="font-serif text-[15px] text-ink-2">
              Here&apos;s your final allocation:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1 max-h-72 overflow-y-auto -mx-6 px-6">
            {event.options
              .filter((o: any) => allocations[o.id] > 0)
              .map((o: any) => (
                <div
                  key={o.id}
                  className="flex items-baseline justify-between py-2 border-b border-dashed border-ink/15 last:border-b-0"
                >
                  <span className="font-display text-[16px] text-ink truncate pr-3">
                    {o.title}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-ink-3 tabular-nums whitespace-nowrap">
                    {allocations[o.id]} cr → {quadVotes[o.id].toFixed(1)} v
                  </span>
                </div>
              ))}
          </div>

          <div className="border border-blueprint/25 bg-blueprint/8 px-3 py-2 font-serif text-[14px] text-ink-2 leading-snug">
            You spent <strong className="text-ink tabular-nums">{usedCredits}</strong>{' '}
            of {totalCredits} credits. You can edit and resubmit later.
          </div>

          <DialogFooter className="gap-3">
            <button
              type="button"
              onClick={() => setShowConfirmDialog(false)}
              className="btn-paper"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-ink"
            >
              Submit ballot
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
