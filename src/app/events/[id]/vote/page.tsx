'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { supabase } from '@/lib/supabase';
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

/**
 * Gate before a voter is allowed to start allocating credits. The order
 * mirrors the server-side enforcement in vote.service so users see the
 * blocker that would have rejected their submission anyway.
 */
type Gate =
  | 'event-loading'      // still fetching
  | 'auth-required'      // requireEmailVerification + no session
  | 'verify-email'       // requireEmailVerification + session but unconfirmed
  | 'invite-required'    // private event without code, or public+anon-disabled
  | 'ready';             // we have a usable invite path, show the ballot

export default function VotingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<any>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [gate, setGate] = useState<Gate>('event-loading');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [codeInput, setCodeInput] = useState<string>('');
  const [resendingEmail, setResendingEmail] = useState(false);

  // Same URL the voter is on now — used to round-trip them back here after
  // signing in. Memoized so the value is stable across re-renders.
  const returnUrl = useMemo(() => {
    const qs = searchParams?.toString();
    return `/events/${params.id}/vote${qs ? `?${qs}` : ''}`;
  }, [params.id, searchParams]);

  /* ─── load event ─── */
  useEffect(() => {
    let cancelled = false;
    // Forward any invite code on the URL so private events can be loaded
    // by their invitees (the API gates GET by visibility).
    const urlCode = searchParams?.get('code');
    const url = urlCode
      ? `/api/events/${params.id}?code=${encodeURIComponent(urlCode)}`
      : `/api/events/${params.id}`;
    // authedFetch so admins can load private events even without ?code=.
    authedFetch(url)
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

  /* ─── compute the gate once event + auth state are known ─── */
  useEffect(() => {
    if (!event || authLoading) return;
    const settings = event.voteSettings || {};
    const urlCode = searchParams?.get('code');

    // Email-verification gate. Server-side this throws "requires a signed-in
    // account with a verified email" — surface that intent up-front instead
    // of letting the voter compose a ballot they can't submit.
    if (settings.requireEmailVerification) {
      if (!user) { setGate('auth-required'); return; }
      if (!user.email_confirmed_at) { setGate('verify-email'); return; }
    }

    // We have a code in the URL (or the user is an event admin who got
    // through the API gate without one). Honor it.
    if (urlCode) {
      setInviteCode(urlCode);
      setCodeInput(urlCode);
      setGate('ready');
      return;
    }

    // Anonymous fall-through: only on public events with anon enabled.
    const allowAnon = settings.allowAnonymous !== false;
    if (event.visibility === 'public' && allowAnon) {
      setInviteCode('anonymous');
      setGate('ready');
      return;
    }

    // Anything else (private/unlisted, or public-but-anon-disabled) needs
    // an explicit invite code.
    setGate('invite-required');
  }, [event, user, authLoading, searchParams]);

  /* ─── load existing vote, if any ─── */
  useEffect(() => {
    if (!inviteCode || gate !== 'ready') return;
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
  }, [inviteCode, gate, params.id]);

  const verifyInviteCode = async (code: string) => {
    const r = await fetch(`/api/events/${params.id}/invites/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const d = await r.json();
    if (r.ok && d.valid) {
      setInviteCode(code);
      setGate('ready');
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

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      if (error) throw error;
      toast({
        title: 'Verification email sent',
        description: `Check ${user.email} and click the link to confirm.`,
      });
    } catch (err) {
      toast({
        title: 'Could not resend',
        description: err instanceof Error ? err.message : 'Try again in a minute.',
        variant: 'destructive',
      });
    } finally {
      setResendingEmail(false);
    }
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-paper">
        <Navigation />
        <div className="mx-auto max-w-3xl px-5 md:px-8 py-20 font-mono text-[11px] uppercase tracking-widest text-ink-3">
          Loading…
        </div>
      </div>
    );
  }

  // Event load completed but returned nothing — typically a private event
  // we don't have access to (the API gate 404s rather than leaking the
  // existence of private events). Show a clean not-found screen instead
  // of an infinite spinner.
  if (!event) {
    return (
      <div className="min-h-screen bg-paper">
        <Navigation />
        <div className="mx-auto max-w-md px-5 md:px-8 py-20 text-center">
          <Sqrt size="md" className="opacity-30" />
          <h1 className="mt-4 font-display text-3xl text-ink">Event not found.</h1>
          <p className="mt-2 font-serif text-ink-2">
            This event may be private, deleted, or the link is wrong. If
            you have an invite link from the organizer, use that instead.
          </p>
          <Link href="/" className="btn-paper mt-6 inline-flex">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (gate === 'event-loading') {
    return (
      <div className="min-h-screen bg-paper">
        <Navigation />
        <div className="mx-auto max-w-3xl px-5 md:px-8 py-20 font-mono text-[11px] uppercase tracking-widest text-ink-3">
          Loading…
        </div>
      </div>
    );
  }

  /* ─── auth-required gate: requireEmailVerification + no session ─── */
  if (gate === 'auth-required') {
    const loginHref = `/auth/login?redirect=${encodeURIComponent(returnUrl)}`;
    const signupHref = `/auth/signup?redirect=${encodeURIComponent(returnUrl)}`;
    return (
      <GateShell eventTitle={event.title}>
        <SectionLabel>Sign in to vote</SectionLabel>
        <h1 className="mt-3 font-display text-4xl text-ink leading-tight text-balance">
          You&apos;ll need an account to vote in this one.
        </h1>
        <p className="mt-3 font-serif text-[16px] text-ink-2 leading-snug">
          The organizer requires a verified email for every ballot. Sign in,
          or open a new account — we&apos;ll bring you right back here.
        </p>

        <EventPreview event={event} />

        <Link href={loginHref} className="btn-ink w-full mt-6 text-center">
          Sign in to continue →
        </Link>
        <Link href={signupHref} className="btn-paper w-full mt-3 text-center">
          Open an account
        </Link>
      </GateShell>
    );
  }

  /* ─── verify-email gate: signed in but unconfirmed ─── */
  if (gate === 'verify-email') {
    return (
      <GateShell eventTitle={event.title}>
        <SectionLabel>One more step</SectionLabel>
        <h1 className="mt-3 font-display text-4xl text-ink leading-tight text-balance">
          Verify your email to vote.
        </h1>
        <p className="mt-3 font-serif text-[16px] text-ink-2 leading-snug">
          We sent a confirmation link to{' '}
          <span className="font-mono text-ink">{user?.email}</span> when you
          signed up. Click it to confirm, then come back to this page.
        </p>

        <EventPreview event={event} />

        <button
          type="button"
          onClick={handleResendVerification}
          disabled={resendingEmail}
          className="btn-ink w-full mt-6 disabled:opacity-50"
        >
          {resendingEmail ? 'Sending…' : 'Resend verification email'}
        </button>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="btn-paper w-full mt-3"
        >
          I&apos;ve verified — refresh
        </button>
      </GateShell>
    );
  }

  /* ─── invite-required gate: private/unlisted, or public+anon-disabled ─── */
  if (gate === 'invite-required') {
    const isPublic = event.visibility === 'public';
    const allowAnon = event.voteSettings?.allowAnonymous !== false;
    const headline = isPublic && !allowAnon
      ? 'This event needs an invite code.'
      : isPublic
      ? 'Vote anonymously, or enter your code'
      : 'Enter your invite code';
    const lede = isPublic && !allowAnon
      ? 'The organizer disabled anonymous voting on this public event. Enter the code from the email they sent you.'
      : isPublic
      ? 'This event is open to the public. Vote anonymously, or enter an invite code if an organizer sent you one.'
      : 'This event is invite-only. Enter the code that was shared with you.';
    return (
      <GateShell eventTitle={event.title}>
        <SectionLabel>Verify</SectionLabel>
        <h1 className="mt-3 font-display text-4xl text-ink leading-tight text-balance">
          {headline}
        </h1>
        <p className="mt-3 font-serif text-[16px] text-ink-2 leading-snug">{lede}</p>

        <EventPreview event={event} />

        {isPublic && allowAnon && (
          <button
            type="button"
            className="btn-ink w-full mt-6"
            onClick={() => {
              setInviteCode('anonymous');
              setGate('ready');
            }}
          >
            Continue anonymously →
          </button>
        )}

        <form onSubmit={handleCodeSubmit} className="mt-6 space-y-3">
          <label className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3 block">
            {isPublic && allowAnon ? 'Or use an invite code' : 'Invite code'}
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
            className={isPublic && allowAnon ? 'btn-paper w-full' : 'btn-ink w-full'}
          >
            Verify code
          </button>
        </form>
      </GateShell>
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

/* ───────────────── shared gate-screen primitives ───────────────── */

function GateShell({
  eventTitle,
  children,
}: {
  eventTitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper relative">
      <Navigation eventTitle={eventTitle} />
      <GraphPaper aria-hidden className="absolute inset-0 opacity-40 pointer-events-none" />
      <div className="relative mx-auto max-w-md px-5 md:px-8 py-16">
        {children}
      </div>
    </div>
  );
}

function EventPreview({ event }: { event: any }) {
  const start = event.startTime ? new Date(event.startTime) : null;
  const end = event.endTime ? new Date(event.endTime) : null;
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(d);
  return (
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
      {start && end && (
        <div className="mt-3 font-mono text-[10.5px] uppercase tracking-widest text-ink-3">
          {fmt(start)} → {fmt(end)}
        </div>
      )}
    </SchematicCard>
  );
}
