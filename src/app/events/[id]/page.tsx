'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/layout/navigation';
import {
  GraphPaper,
  SectionLabel,
  SchematicCard,
  Stamp,
  SpecRow,
  Sqrt,
  NumberMarker,
  InkRule,
} from '@/components/schematic';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

export const dynamic = 'force-dynamic';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setEvent(d.event ?? null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <Navigation />
        <div className="mx-auto max-w-5xl px-5 md:px-8 py-20">
          <div className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
            Loading file…
          </div>
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
          <h1 className="mt-4 font-display text-3xl text-ink">File not found.</h1>
          <p className="mt-2 font-serif text-ink-2">
            We couldn&apos;t locate that event in the cabinet.
          </p>
          <button
            className="btn-ink mt-6"
            onClick={() => router.push('/')}
          >
            Back to slate
          </button>
        </div>
      </div>
    );
  }

  const framework = event.decisionFramework ?? {};
  const isBinary = framework.framework_type === 'binary_selection';
  const config = framework.config ?? {};
  const now = new Date();
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const isLive = now >= start && now <= end;
  const upcoming = now < start;
  const closed = now > end;
  const status = isLive ? 'live' : upcoming ? 'upcoming' : 'closed';
  const acceptsProposals =
    event.optionMode === 'community_proposals' || event.optionMode === 'hybrid';

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navigation eventId={params.id as string} eventTitle={event.title} />

      {/* HEADER */}
      <section className="relative overflow-hidden border-b border-ink/15">
        <GraphPaper aria-hidden className="absolute inset-0 opacity-50" />
        <div
          aria-hidden
          className="absolute left-12 top-0 bottom-0 w-px bg-terracotta/40 hidden md:block"
        />

        <div className="relative mx-auto max-w-6xl px-5 md:px-8 py-12 md:py-16">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <Badge variant={isBinary ? 'blueprint' : 'terracotta'}>
              {isBinary ? 'Binary Selection' : 'Proportional Distribution'}
            </Badge>
            <Badge
              variant={
                isLive ? 'sage' : upcoming ? 'terracotta' : 'secondary'
              }
            >
              <span
                className={cn(
                  'mr-1 inline-block h-1.5 w-1.5 rounded-full',
                  isLive && 'bg-sage animate-pulse',
                  upcoming && 'bg-terracotta',
                  closed && 'bg-ink-3'
                )}
              />
              {status}
            </Badge>
            {acceptsProposals && (
              <Badge variant="outline">Community proposals</Badge>
            )}
          </div>

          <h1 className="font-display text-[36px] sm:text-[44px] lg:text-[56px] leading-[1.02] tracking-[-0.02em] text-ink anim-ink text-balance">
            {event.title}
          </h1>

          {event.description && (
            <p className="mt-5 max-w-3xl font-serif text-[18px] text-ink-2 leading-snug anim-ink [animation-delay:120ms] text-pretty">
              {event.description}
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3 anim-ink [animation-delay:240ms]">
            <SpecBlock label="Window">
              <FmtDate d={start} /> → <FmtDate d={end} />
            </SpecBlock>
            <SpecBlock label="Credit purse">
              {event.creditsPerVoter} per voter
            </SpecBlock>
            <SpecBlock label="Visibility">{event.visibility}</SpecBlock>
            {!isBinary && config.total_pool_amount && (
              <SpecBlock label="Pool">
                {config.resource_symbol} {Number(config.total_pool_amount).toLocaleString()}{' '}
                {config.resource_name}
              </SpecBlock>
            )}
          </div>
        </div>
      </section>

      {/* CONTENT GRID */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 py-12 md:py-16 grid grid-cols-12 gap-6">
        {/* Left: how it works + options */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <SchematicCard accent className="p-7 md:p-9">
            <SectionLabel number={1}>How this works</SectionLabel>
            {isBinary ? (
              <>
                <h2 className="mt-3 font-display text-3xl text-ink">
                  This event picks winners.
                </h2>
                <p className="mt-2 font-serif text-[16px] text-ink-2 leading-snug max-w-2xl text-pretty">
                  Voters allocate their credits across the options. Each
                  vote counts as <span className="font-display italic">√credits</span>.
                  When the deadline hits, the schematic below decides who&apos;s in.
                </p>

                <div className="mt-5 inline-flex items-center gap-3 px-4 py-3 border border-blueprint/30 bg-blueprint/8 rounded-[3px]">
                  <span className="font-mono text-[10.5px] uppercase tracking-widest text-blueprint">
                    Cut rule
                  </span>
                  <span className="font-display text-ink text-lg">
                    {config.threshold_mode === 'top_n' &&
                      `Top ${config.top_n_count} options selected`}
                    {config.threshold_mode === 'percentage' &&
                      `≥ ${config.percentage_threshold}% of leader`}
                    {config.threshold_mode === 'absolute_votes' &&
                      `≥ ${config.absolute_vote_threshold} votes`}
                    {config.threshold_mode === 'above_average' &&
                      'Above the average vote count'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-3 font-display text-3xl text-ink">
                  This event splits a pool.
                </h2>
                <p className="mt-2 font-serif text-[16px] text-ink-2 leading-snug max-w-2xl text-pretty">
                  Voters allocate credits. The pool is distributed in proportion to
                  the votes each option receives. A small floor can be set to keep
                  any participating option from going home empty.
                </p>

                <div className="mt-5 inline-flex flex-col items-start gap-1 px-4 py-3 border border-terracotta/30 bg-terracotta/8 rounded-[3px]">
                  <span className="font-mono text-[10.5px] uppercase tracking-widest text-terracotta">
                    Pool
                  </span>
                  <span className="font-display text-ink text-2xl leading-none">
                    {config.resource_symbol}
                    {Number(config.total_pool_amount).toLocaleString()}{' '}
                    <span className="text-base text-ink-3">
                      {config.resource_name}
                    </span>
                  </span>
                </div>
              </>
            )}
          </SchematicCard>

          {/* Options */}
          <SchematicCard className="p-7 md:p-9">
            <div className="flex items-baseline justify-between">
              <SectionLabel number={2}>Options on the slate</SectionLabel>
              <span className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3">
                {event.options?.length ?? 0} on file
              </span>
            </div>

            {event.options?.length === 0 ? (
              <div className="mt-6 border border-dashed border-ink/30 px-6 py-10 text-center">
                <p className="font-display text-2xl text-ink">No options yet.</p>
                <p className="mt-2 font-serif text-ink-2">
                  {acceptsProposals
                    ? 'The community gets to write this slate. Submit the first proposal.'
                    : 'The organizer hasn\'t added any options yet.'}
                </p>
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-ink/12">
                {event.options?.map((opt: any, i: number) => (
                  <li
                    key={opt.id}
                    className="flex gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <NumberMarker n={i + 1} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[18px] text-ink leading-snug">
                        {opt.title}
                      </h3>
                      {opt.description && (
                        <p className="mt-1 font-serif text-[14.5px] text-ink-2 leading-snug">
                          {opt.description}
                        </p>
                      )}
                      {opt.source === 'community' && (
                        <span className="mt-2 inline-block font-mono text-[10px] uppercase tracking-widest text-terracotta">
                          From the community
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SchematicCard>
        </div>

        {/* Right: actions rail */}
        <aside className="col-span-12 lg:col-span-4 space-y-6">
          {/* Vote CTA */}
          <SchematicCard
            accent
            className={cn(
              'p-6 transition-all',
              isLive && 'hover:-translate-y-0.5'
            )}
          >
            <div className="flex items-baseline justify-between">
              <SectionLabel number="A">Cast a vote</SectionLabel>
              {isLive && <Stamp tone="sage" rotate={-2}>Open</Stamp>}
              {upcoming && <Stamp tone="terracotta">Soon</Stamp>}
              {closed && <Stamp tone="ink">Closed</Stamp>}
            </div>
            <h3 className="mt-3 font-display text-2xl text-ink leading-tight">
              {event.creditsPerVoter} credits.
              <br />
              How will you spend them?
            </h3>
            <p className="mt-2 font-serif text-[14.5px] text-ink-2 leading-snug">
              Allocate across the options. Concentration costs you — that&apos;s
              the point.
            </p>
            <Link
              href={`/events/${event.id}/vote`}
              className={cn(
                'mt-5 w-full',
                isLive ? 'btn-ink' : 'btn-paper opacity-60 cursor-not-allowed'
              )}
              aria-disabled={!isLive}
              tabIndex={isLive ? undefined : -1}
            >
              {isLive ? 'Open the ballot →' : closed ? 'Voting closed' : 'Not yet open'}
            </Link>
          </SchematicCard>

          {/* Proposal CTA */}
          {acceptsProposals && (
            <SchematicCard className="p-6">
              <div className="flex items-baseline justify-between">
                <SectionLabel number="B">Submit a proposal</SectionLabel>
                <span className="font-mono text-[10.5px] uppercase tracking-widest text-terracotta">
                  Open
                </span>
              </div>
              <h3 className="mt-3 font-display text-2xl text-ink leading-tight">
                Add your own to the slate.
              </h3>
              <p className="mt-2 font-serif text-[14.5px] text-ink-2 leading-snug">
                The organizer reviews proposals. Approved ones become
                voting options.
              </p>
              <Link
                href={`/events/${event.id}/propose`}
                className="btn-terra mt-5 w-full"
              >
                Send it in →
              </Link>
            </SchematicCard>
          )}

          {/* Results */}
          <SchematicCard className="p-6">
            <SectionLabel>Read the room</SectionLabel>
            <p className="mt-3 font-serif text-[14.5px] text-ink-2 leading-snug">
              {event.showResultsDuringVoting
                ? 'Live tally is visible to anyone with the link.'
                : 'Final tally posts when voting closes.'}
            </p>
            <Link
              href={`/events/${event.id}/results`}
              className="btn-paper mt-4 w-full"
            >
              View tally
            </Link>
          </SchematicCard>
        </aside>
      </section>
    </div>
  );
}

function SpecBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3">
        {label}
      </span>
      <span className="font-display text-[16px] text-ink leading-tight">
        {children}
      </span>
    </div>
  );
}

function FmtDate({ d }: { d: Date }) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
  return <>{fmt}</>;
}
