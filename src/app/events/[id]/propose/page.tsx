'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/layout/navigation';
import {
  GraphPaper,
  SectionLabel,
  SchematicCard,
  Stamp,
  Sqrt,
} from '@/components/schematic';
import { FieldRow } from '@/components/auth/AuthShell';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { toast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

export default function ProposalSubmissionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;
  const inviteCode = searchParams.get('code');

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    submitterEmail: '',
    submitterWallet: '',
    payoutWallet: '',
    inviteCode: inviteCode || '',
  });

  useEffect(() => {
    let cancelled = false;
    // Forward any invite code so private events resolve for their invitees.
    const url = inviteCode
      ? `/api/events/${eventId}?code=${encodeURIComponent(inviteCode)}`
      : `/api/events/${eventId}`;
    // authedFetch so admins can load private events even without ?code=.
    authedFetch(url)
      .then((r) => r.json())
      .then((d) => !cancelled && setEvent(d?.event ?? null))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [eventId, inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const r = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, eventId }),
      });
      const d = await r.json();
      if (d.success) {
        toast({ title: 'Proposal sent.', description: 'The organizer will review it.' });
        setSubmitted(true);
      } else {
        const msg = d.error || d.message || 'Submission failed.';
        setError(msg);
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    } catch {
      setError('Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <Navigation />
        <div className="mx-auto max-w-3xl px-5 md:px-8 py-20 font-mono text-[11px] uppercase tracking-widest text-ink-3">
          Opening the proposal book…
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-paper">
        <Navigation />
        <div className="mx-auto max-w-md px-5 md:px-8 py-20 text-center">
          <Sqrt size="md" className="opacity-30" />
          <h1 className="mt-4 font-display text-3xl text-ink">Event not found.</h1>
        </div>
      </div>
    );
  }

  const acceptsProposals =
    event.optionMode === 'community_proposals' || event.optionMode === 'hybrid';

  if (submitted) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <Navigation eventTitle={event.title} />
        <section className="relative overflow-hidden border-b border-ink/15">
          <GraphPaper aria-hidden className="absolute inset-0 opacity-50" />
          <div className="relative mx-auto max-w-2xl px-5 md:px-8 py-20 text-center">
            <Stamp tone="sage" rotate={-2} className="mx-auto mb-6">
              Filed · Pending review
            </Stamp>
            <h1 className="font-display text-[40px] sm:text-[48px] leading-tight text-ink anim-ink text-balance">
              Your proposal is on the table.
            </h1>
            <p className="mt-5 font-serif text-[17px] text-ink-2 leading-snug max-w-lg mx-auto anim-ink [animation-delay:120ms]">
              The organizer will review it. If approved, it joins the slate
              and becomes a voting option.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 anim-ink [animation-delay:240ms]">
              <Link href={`/events/${eventId}`} className="btn-paper">
                Back to event
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setForm({
                    title: '',
                    description: '',
                    submitterEmail: form.submitterEmail,
                    submitterWallet: form.submitterWallet,
                    payoutWallet: form.payoutWallet,
                    inviteCode: form.inviteCode,
                  });
                }}
                className="btn-ink"
              >
                Submit another →
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navigation eventTitle={event.title} />

      <section className="relative overflow-hidden border-b border-ink/15">
        <GraphPaper aria-hidden className="absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-3xl px-5 md:px-8 py-12 md:py-16">
          <SectionLabel>Submit a proposal</SectionLabel>
          <h1 className="mt-3 font-display text-[40px] sm:text-[52px] leading-[1.02] tracking-[-0.018em] text-ink anim-ink text-balance">
            Add a card to the slate.
          </h1>
          <p className="mt-5 max-w-2xl font-serif text-[17px] text-ink-2 leading-snug anim-ink [animation-delay:120ms]">
            Tell the community what you want them to consider. Be clear,
            be specific, and include a wallet if there&apos;s a payout. The
            organizer will review before it goes on the ballot.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-5 md:px-8 py-10">
        {!acceptsProposals && (
          <SchematicCard className="p-6 mb-8 border-wine/30">
            <SectionLabel>Heads up</SectionLabel>
            <p className="mt-3 font-serif text-[15px] text-ink-2">
              This event isn&apos;t accepting community proposals. The
              organizer set the slate themselves.
            </p>
          </SchematicCard>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <SchematicCard className="p-6 md:p-7 space-y-5">
            <SectionLabel number={1}>The proposal</SectionLabel>

            <FieldRow label="Title" htmlFor="title" hint={<span>{form.title.length} / 120</span>}>
              <input
                id="title"
                name="title"
                required
                maxLength={120}
                placeholder="Short, plain language"
                className="field w-full"
                value={form.title}
                onChange={set('title')}
              />
            </FieldRow>

            <FieldRow
              label="Description"
              htmlFor="description"
              hint={<span>Optional — but encouraged</span>}
            >
              <textarea
                id="description"
                name="description"
                rows={6}
                placeholder="What are you proposing? Who benefits? What does success look like?"
                className="field w-full leading-snug"
                value={form.description}
                onChange={set('description')}
              />
            </FieldRow>
          </SchematicCard>

          <SchematicCard className="p-6 md:p-7 space-y-5">
            <SectionLabel number={2}>About you</SectionLabel>

            <FieldRow label="Your email" htmlFor="email" hint={<span>Hashed before storing</span>}>
              <input
                id="email"
                name="submitterEmail"
                type="email"
                required
                placeholder="you@yourdomain"
                className="field w-full"
                value={form.submitterEmail}
                onChange={set('submitterEmail')}
              />
            </FieldRow>

            {event.proposalConfig?.access_control === 'invite_only' && (
              <FieldRow
                label="Invite code"
                htmlFor="invite"
                hint={<span>From the email you received</span>}
              >
                <input
                  id="invite"
                  name="inviteCode"
                  required
                  placeholder="••••-••••"
                  className="field w-full font-mono tracking-widest"
                  value={form.inviteCode}
                  onChange={set('inviteCode')}
                />
              </FieldRow>
            )}
          </SchematicCard>

          {/* Wallets — only show for community_proposals events with payout intent */}
          <SchematicCard className="p-6 md:p-7 space-y-5">
            <div className="flex items-baseline justify-between">
              <SectionLabel number={3}>Wallets</SectionLabel>
              <span className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3">
                Optional
              </span>
            </div>
            <p className="font-serif text-[14.5px] text-ink-2 leading-snug">
              If this proposal might receive a payout, leave the address you want
              the funds sent to. The contact wallet is only used for verification.
            </p>

            <FieldRow label="Payout wallet" htmlFor="payout">
              <input
                id="payout"
                name="payoutWallet"
                placeholder="0x… or yourname.eth"
                className="field w-full font-mono"
                value={form.payoutWallet}
                onChange={set('payoutWallet')}
              />
            </FieldRow>

            <FieldRow label="Contact wallet" htmlFor="contact">
              <input
                id="contact"
                name="submitterWallet"
                placeholder="0x… or yourname.eth"
                className="field w-full font-mono"
                value={form.submitterWallet}
                onChange={set('submitterWallet')}
              />
            </FieldRow>
          </SchematicCard>

          {error && (
            <div
              role="alert"
              className="border border-wine/30 bg-wine/8 px-4 py-3 text-[14.5px] text-wine font-serif"
            >
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Link href={`/events/${eventId}`} className="btn-paper">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !acceptsProposals}
              className="btn-ink disabled:opacity-50"
            >
              {submitting ? 'Sending…' : 'Send for review →'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
