'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/navigation';
import {
  GraphPaper,
  SectionLabel,
  Sqrt,
  SchematicCard,
  InkRule,
  Stamp,
  SpecRow,
  Equation,
} from '@/components/schematic';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

type Event = {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  decisionFramework?: { framework_type?: string; config?: any };
  creditsPerVoter: number;
  optionMode?: string;
};

export default function HomePage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const live = events.filter((e) => isLive(e));
  const upcoming = events.filter((e) => new Date(e.startTime) > new Date());
  const closed = events.filter((e) => new Date(e.endTime) < new Date());

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navigation />

      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden border-b border-ink/15">
        <GraphPaper
          aria-hidden
          className="absolute inset-0 opacity-60 pointer-events-none"
        />
        {/* Drafting margin */}
        <div
          aria-hidden
          className="absolute left-12 top-0 bottom-0 w-px bg-terracotta/40 hidden md:block"
        />

        <div className="relative mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24">
          <div className="grid grid-cols-12 gap-x-6 gap-y-10 items-end">
            <div className="col-span-12 lg:col-span-8">
              <SectionLabel number={1} className="anim-ink">
                Civic Decisions, Fairly Counted
              </SectionLabel>

              <h1 className="mt-5 font-display text-[42px] sm:text-[58px] lg:text-[78px] leading-[0.98] tracking-[-0.02em] text-ink anim-ink [animation-delay:80ms] text-balance">
                Decide together,{' '}
                <span className="scribble-underline">fairly</span>.
              </h1>

              <p className="mt-7 max-w-xl font-serif text-[19px] leading-snug text-ink-2 anim-ink [animation-delay:200ms] text-pretty">
                Quadratic voting for groups making decisions together.
                Each voter gets the same credits; votes count as the
                <span className="font-display italic"> √ </span>
                of credits spent — so a loud minority can&apos;t drown
                out everyone else.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3 anim-ink [animation-delay:340ms]">
                <Link href="/events/create" className="btn-ink">
                  Create an event →
                </Link>
                <Link href="#slate" className="btn-paper">
                  Browse open events
                </Link>
                <span className="font-mono text-[11px] uppercase tracking-widest text-ink-3 ml-2">
                  Free · no credit card
                </span>
              </div>
            </div>

            {/* The √ display block */}
            <div className="col-span-12 lg:col-span-4 anim-ink [animation-delay:140ms]">
              <SchematicCard accent className="relative p-7 md:p-9">
                <div className="absolute -top-3 left-6">
                  <Stamp tone="terracotta" rotate={-3}>
                    Method · √ credits
                  </Stamp>
                </div>

                <div className="flex items-end gap-4">
                  <Sqrt size="lg" />
                  <div className="pb-3">
                    <div className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
                      One voter
                    </div>
                    <div className="font-display text-[26px] leading-tight">
                      100&nbsp;credits
                    </div>
                  </div>
                </div>

                <hr className="ink-rule mt-2" />

                <div className="space-y-1">
                  <Equation
                    lhs={<>√100</>}
                    rhs={<>10 votes</>}
                    note="ALL ON ONE OPTION"
                  />
                  <Equation
                    lhs={<>√25 + √25 + √25 + √25</>}
                    rhs={<>20 votes</>}
                    note="SPREAD ACROSS FOUR"
                  />
                </div>

                <p className="mt-4 font-serif text-[14.5px] text-ink-2 leading-snug">
                  Spreading your credits is{' '}
                  <span className="text-blueprint font-medium">always</span>{' '}
                  worth more votes than concentrating them. That&apos;s the
                  whole idea.
                </p>
              </SchematicCard>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── HOW IT WORKS — three plates ───────── */}
      <section className="border-b border-ink/15 bg-paper-2/40">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <SectionLabel number={2}>How it works</SectionLabel>
              <h2 className="mt-3 font-display text-3xl md:text-4xl text-ink leading-tight">
                Three steps, start to finish.
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {[
              {
                n: 1,
                title: 'Create the event',
                body:
                  'Write the question. Pick winners, or split a pool. Add the options yourself or let the community submit them.',
                cta: { href: '/events/create', label: 'Create event' },
                accent: 'blueprint' as const,
              },
              {
                n: 2,
                title: 'Share with voters',
                body:
                  'Send the invite link. Each voter gets the same credit budget and decides how to spend it across the options.',
                cta: null,
                accent: 'terracotta' as const,
              },
              {
                n: 3,
                title: 'See the results',
                body:
                  'Show a live tally during voting if you want, or wait until the deadline. Export the result as a CSV when it\'s over.',
                cta: { href: '#slate', label: 'See examples' },
                accent: 'sage' as const,
              },
            ].map(({ n, title, body, cta, accent }) => (
              <SchematicCard key={n} className="relative p-6 md:p-7 group">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
                    Step · {String(n).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[10px] uppercase tracking-widest',
                      accent === 'blueprint' && 'text-blueprint',
                      accent === 'terracotta' && 'text-terracotta',
                      accent === 'sage' && 'text-sage'
                    )}
                  >
                    ◇
                  </span>
                </div>
                <h3 className="font-display text-2xl text-ink leading-tight">
                  {title}
                </h3>
                <p className="mt-2.5 font-serif text-[15px] text-ink-2 leading-snug text-pretty">
                  {body}
                </p>
                {cta && (
                  <Link
                    href={cta.href}
                    className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-ink hover:text-terracotta transition-colors"
                  >
                    {cta.label} <span aria-hidden>→</span>
                  </Link>
                )}
              </SchematicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FRAMEWORK SCHEMATICS ───────── */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24">
          <SectionLabel number={3}>Two ways to decide</SectionLabel>
          <h2 className="mt-3 font-display text-3xl md:text-4xl text-ink leading-tight max-w-3xl text-balance">
            Pick winners. Or split a pool. Choose what fits the decision.
          </h2>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BINARY */}
            <SchematicCard accent className="p-7 md:p-9 relative">
              <div className="flex items-baseline justify-between">
                <SectionLabel number="A">Binary selection</SectionLabel>
                <span className="font-mono text-[10.5px] uppercase tracking-widest text-blueprint">
                  Top-N · % · Threshold
                </span>
              </div>
              <h3 className="mt-3 font-display text-3xl text-ink">
                Pick winners.
              </h3>
              <p className="mt-2 font-serif text-[15.5px] text-ink-2 leading-snug">
                Pick a top N, set a percentage cutoff, or take everything
                above the average. Good for shortlists, awards, and
                yes/no decisions.
              </p>

              {/* tiny schematic: ranked bars */}
              <div className="mt-6 space-y-2.5 font-mono text-[11px] uppercase tracking-widest text-ink-3">
                {[
                  { label: 'Option A', w: 88, won: true },
                  { label: 'Option B', w: 76, won: true },
                  { label: 'Option C', w: 54, won: false },
                  { label: 'Option D', w: 38, won: false },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="w-16 text-ink-2">{r.label}</span>
                    <div className="relative flex-1 h-3 border border-ink/25 bg-paper">
                      <div
                        className={cn(
                          'h-full',
                          r.won ? 'bg-blueprint' : 'bg-ink/25'
                        )}
                        style={{ width: r.w + '%' }}
                      />
                      <div className="absolute inset-y-0 left-[68%] w-px bg-terracotta" />
                    </div>
                    <span
                      className={cn(
                        'w-12 text-right',
                        r.won ? 'text-blueprint' : 'text-ink-3'
                      )}
                    >
                      {r.won ? 'IN' : 'OUT'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end mt-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-terracotta">
                  ↑ cut line
                </span>
              </div>

              <hr className="ink-rule" />

              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <SpecRow label="Best for" value="Awards · Shortlists" />
                <SpecRow label="Modes" value="top_n · % · ≥ N" />
              </div>
            </SchematicCard>

            {/* PROPORTIONAL */}
            <SchematicCard accent className="p-7 md:p-9">
              <div className="flex items-baseline justify-between">
                <SectionLabel number="B">Proportional distribution</SectionLabel>
                <span className="font-mono text-[10.5px] uppercase tracking-widest text-terracotta">
                  Pool · Floor · Gini
                </span>
              </div>
              <h3 className="mt-3 font-display text-3xl text-ink">
                Split a pool.
              </h3>
              <p className="mt-2 font-serif text-[15.5px] text-ink-2 leading-snug">
                Distribute a budget across many options in proportion to
                community support. Good for grants, retroactive rewards,
                and any decision where <em>how much</em> matters as
                much as <em>who</em>.
              </p>

              {/* tiny schematic: stacked allocation bar */}
              <div className="mt-6">
                <div className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3 mb-2 flex justify-between">
                  <span>Grant pool</span>
                  <span>$100,000.00</span>
                </div>
                <div className="flex h-7 border border-ink/25 overflow-hidden">
                  <div
                    className="bg-terracotta"
                    style={{ width: '41%' }}
                    title="DeFi · 41%"
                  />
                  <div
                    className="bg-blueprint"
                    style={{ width: '30%' }}
                    title="Bridge · 30%"
                  />
                  <div
                    className="bg-sage"
                    style={{ width: '20%' }}
                    title="DAO Tools · 20%"
                  />
                  <div
                    className="bg-gold"
                    style={{ width: '9%' }}
                    title="Other · 9%"
                  />
                </div>
                <div className="grid grid-cols-4 mt-2 gap-1 font-mono text-[10px] uppercase tracking-widest text-ink-3">
                  <span><span className="inline-block w-2 h-2 bg-terracotta mr-1.5 align-middle" />41%</span>
                  <span><span className="inline-block w-2 h-2 bg-blueprint mr-1.5 align-middle" />30%</span>
                  <span><span className="inline-block w-2 h-2 bg-sage mr-1.5 align-middle" />20%</span>
                  <span><span className="inline-block w-2 h-2 bg-gold mr-1.5 align-middle" />9%</span>
                </div>
              </div>

              <hr className="ink-rule" />

              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <SpecRow label="Best for" value="Funding · Allocation" />
                <SpecRow label="Reports" value="Gini · Floor" />
              </div>
            </SchematicCard>
          </div>
        </div>
      </section>

      {/* ───────── EVENT SLATE ───────── */}
      <section id="slate" className="border-b border-ink/15">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24">
          <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
            <div>
              <SectionLabel number={4}>Open events</SectionLabel>
              <h2 className="mt-3 font-display text-3xl md:text-4xl text-ink leading-tight">
                {live.length > 0
                  ? 'Open for voting now.'
                  : 'No events are open right now.'}
              </h2>
              <p className="mt-2 font-serif text-ink-2">
                {events.length} total ·{' '}
                <span className="text-sage">{live.length} live</span> ·{' '}
                <span className="text-terracotta">{upcoming.length} upcoming</span> ·{' '}
                <span className="text-ink-3">{closed.length} closed</span>
              </p>
            </div>

            <Link href="/events/create" className="btn-blueprint">
              + Create event
            </Link>
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : events.length === 0 ? (
            <SchematicCard className="p-12 text-center">
              <Sqrt size="md" className="mx-auto opacity-30" />
              <p className="mt-4 font-display text-2xl text-ink">
                Nothing here yet.
              </p>
              <p className="mt-2 font-serif text-ink-2">
                Create the first event for your community.
              </p>
              <Link
                href="/events/create"
                className="btn-ink mt-6 inline-flex"
              >
                Create event
              </Link>
            </SchematicCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((e, i) => (
                <EventCard key={e.id} event={e} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───────── COLOPHON ───────── */}
      <footer className="bg-paper-2/50">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <span className="font-display text-[22px] leading-none text-ink tracking-tight">
                quadratic
                <span className="mx-1 text-terracotta">·</span>vote
              </span>
              <p className="mt-3 font-serif text-[15px] text-ink-2 leading-snug max-w-xs">
                An open-source tool for community decisions using
                quadratic voting.
              </p>
            </div>
            <div>
              <SectionLabel>Method</SectionLabel>
              <p className="mt-2 font-serif text-[14.5px] text-ink-2 leading-snug">
                Each voter gets the same credit purse. Votes count as the
                square root of credits spent. Concentration costs you.
              </p>
            </div>
            <div>
              <SectionLabel>Contact</SectionLabel>
              <ul className="mt-2 font-serif text-[14.5px] text-ink-2 space-y-1">
                <li>
                  <Link href="/auth/signup" className="hover:text-ink underline-offset-4 hover:underline">
                    Open an account →
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/omniharmonic/quadraticvote"
                    className="hover:text-ink underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source on GitHub →
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <InkRule />
          <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-widest text-ink-3">
            <span>QV · {new Date().getFullYear()}</span>
            <span>v0.1 · beta</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─────────── helpers ─────────── */

function isLive(e: Event) {
  const now = new Date();
  return now >= new Date(e.startTime) && now <= new Date(e.endTime);
}

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function daysUntil(end: string) {
  const ms = new Date(end).getTime() - Date.now();
  if (ms < 0) return 'closed';
  const d = Math.floor(ms / 86_400_000);
  if (d === 0) return 'today';
  if (d === 1) return '1 day';
  return `${d} days`;
}

function EventCard({ event, index }: { event: Event; index: number }) {
  const router = useRouter();
  const isBinary = event.decisionFramework?.framework_type === 'binary_selection';
  const live = isLive(event);
  const upcoming = new Date(event.startTime) > new Date();
  const closed = new Date(event.endTime) < new Date();

  const status = live ? 'live' : upcoming ? 'upcoming' : 'closed';
  const statusTone =
    live ? 'sage' : upcoming ? 'terracotta' : 'secondary';

  return (
    <SchematicCard
      onClick={() => router.push(`/events/${event.id}`)}
      className={cn(
        'group cursor-pointer p-6 transition-all anim-draft',
        'hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-18px_rgb(var(--ink)/0.35)]'
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <Badge variant={isBinary ? 'blueprint' : 'terracotta'}>
          {isBinary ? 'Binary' : 'Proportional'}
        </Badge>
        <Badge variant={statusTone as any}>
          <span
            className={cn(
              'mr-1 inline-block h-1.5 w-1.5 rounded-full',
              live && 'bg-sage animate-pulse',
              upcoming && 'bg-terracotta',
              closed && 'bg-ink-3'
            )}
          />
          {status}
        </Badge>
      </div>

      <h3 className="font-display text-[22px] leading-tight text-ink line-clamp-2 group-hover:text-blueprint transition-colors">
        {event.title}
      </h3>

      {event.description && (
        <p className="mt-2 font-serif text-[14.5px] leading-snug text-ink-2 line-clamp-2 text-pretty">
          {event.description}
        </p>
      )}

      <hr className="ink-rule" />

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[10.5px] uppercase tracking-widest">
        <div className="flex flex-col">
          <span className="text-ink-3">Credits</span>
          <span className="font-display normal-case tracking-normal text-[15px] text-ink">
            {event.creditsPerVoter}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-ink-3">
            {closed ? 'Closed' : 'Closes in'}
          </span>
          <span className="font-display normal-case tracking-normal text-[15px] text-ink">
            {closed ? fmtShort(event.endTime) : daysUntil(event.endTime)}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-widest text-ink-3 group-hover:text-terracotta transition-colors">
        <span>Open event</span>
        <span aria-hidden>→</span>
      </div>
    </SchematicCard>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="schematic schematic-tick p-6 animate-pulse"
          style={{ opacity: 0.6 }}
        >
          <div className="h-3 w-16 bg-ink/10 mb-3" />
          <div className="h-6 w-2/3 bg-ink/15 mb-2" />
          <div className="h-3 w-full bg-ink/10 mb-1.5" />
          <div className="h-3 w-3/4 bg-ink/10" />
          <div className="ink-rule" />
          <div className="flex justify-between">
            <div className="h-4 w-16 bg-ink/10" />
            <div className="h-4 w-20 bg-ink/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
