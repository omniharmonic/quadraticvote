'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/layout/navigation';
import {
  GraphPaper,
  SectionLabel,
  SchematicCard,
  Stamp,
  Sqrt,
  InkRule,
  NumberMarker,
  SpecRow,
} from '@/components/schematic';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

export const dynamic = 'force-dynamic';

type Event = any;
type Results = any;
type Analytics = any;

export default function ResultsPage() {
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/events/${params.id}`).then((r) => r.json()),
      fetch(`/api/events/${params.id}/results`).then((r) => r.json()),
      fetch(`/api/events/${params.id}/analytics?range=all`).then((r) => r.json()),
    ])
      .then(([e, r, a]) => {
        if (cancelled) return;
        setEvent(e?.event ?? null);
        setResults(r?.results ?? null);
        setAnalytics(a?.analytics ?? null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <Navigation />
        <div className="mx-auto max-w-5xl px-5 md:px-8 py-20 font-mono text-[11px] uppercase tracking-widest text-ink-3">
          Tallying…
        </div>
      </div>
    );
  }

  if (!event || !results) {
    return (
      <div className="min-h-screen bg-paper">
        <Navigation />
        <div className="mx-auto max-w-md px-5 md:px-8 py-20 text-center">
          <Sqrt size="md" className="opacity-30" />
          <h1 className="mt-4 font-display text-3xl text-ink">Tally not available.</h1>
          <p className="mt-2 font-serif text-ink-2">
            This event may not have results yet.
          </p>
        </div>
      </div>
    );
  }

  const framework = event.decisionFramework;
  const isBinary = framework?.framework_type === 'binary_selection';
  const isClosed = new Date(event.endTime) < new Date();
  const totalVoters = analytics?.voting?.total_votes ?? results?.participation?.total_voters ?? 0;
  const totalCredits = analytics?.voting?.total_credits_used ?? 0;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navigation eventId={params.id as string} eventTitle={event.title} />

      {/* HEADER — final tally */}
      <section className="relative overflow-hidden border-b border-ink/15">
        <GraphPaper aria-hidden className="absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="absolute left-12 top-0 bottom-0 w-px bg-terracotta/40 hidden md:block"
        />

        <div className="relative mx-auto max-w-6xl px-5 md:px-8 py-12 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <SectionLabel>{isClosed ? 'Final tally' : 'Live tally'}</SectionLabel>
              <h1 className="mt-3 font-display text-[36px] sm:text-[48px] lg:text-[56px] leading-[1.02] tracking-[-0.02em] text-ink anim-ink text-balance">
                {event.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-2 anim-ink [animation-delay:120ms]">
                <Spec label="Voters">{totalVoters}</Spec>
                <Spec label="Credits spent">{totalCredits.toLocaleString()}</Spec>
                <Spec label="Method">votes = √credits</Spec>
                {isBinary ? (
                  <Spec label="Cut rule">
                    {framework.config.threshold_mode === 'top_n' &&
                      `Top ${framework.config.top_n_count}`}
                    {framework.config.threshold_mode === 'percentage' &&
                      `≥ ${framework.config.percentage_threshold}%`}
                    {framework.config.threshold_mode === 'absolute_votes' &&
                      `≥ ${framework.config.absolute_vote_threshold} votes`}
                    {framework.config.threshold_mode === 'above_average' &&
                      'Above average'}
                  </Spec>
                ) : (
                  <Spec label="Pool">
                    {framework.config.resource_symbol}
                    {Number(framework.config.total_pool_amount).toLocaleString()}{' '}
                    {framework.config.resource_name}
                  </Spec>
                )}
              </div>
            </div>

            <Stamp tone={isClosed ? 'wine' : 'sage'} rotate={-3}>
              {isClosed ? 'Final · Closed' : 'Live · In session'}
            </Stamp>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 py-12 md:py-16">
        {isBinary ? (
          <BinaryReport results={results.results} />
        ) : (
          <ProportionalReport results={results.results} />
        )}

        {/* Participation chart */}
        {analytics?.participation_over_time?.length > 0 && (
          <SchematicCard className="p-7 md:p-9 mt-10">
            <SectionLabel number={3}>Participation over time</SectionLabel>
            <h2 className="mt-3 font-display text-2xl text-ink leading-tight">
              When the votes came in.
            </h2>
            <ParticipationChart data={analytics.participation_over_time} />
          </SchematicCard>
        )}

        {/* Export */}
        {isClosed && (
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href={`/api/events/${params.id}/export?format=standard`}
              className="btn-paper"
              target="_blank"
              rel="noreferrer"
            >
              ↓ CSV · standard
            </a>
            <a
              href={`/api/events/${params.id}/export?format=gnosis`}
              className="btn-paper"
              target="_blank"
              rel="noreferrer"
            >
              ↓ CSV · Gnosis Safe airdrop
            </a>
          </div>
        )}
      </section>
    </div>
  );
}

/* ────────────────────── BINARY REPORT ────────────────────── */
function BinaryReport({ results }: { results: any }) {
  const selected = results.selected_options ?? [];
  const notSelected = results.not_selected_options ?? [];
  const margin = results.selection_margin;
  const all = [...selected, ...notSelected];
  const max = Math.max(...all.map((o: any) => o.votes), 1);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SchematicCard accent className="p-6 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <SectionLabel number={1}>Selected</SectionLabel>
            <span className="font-mono text-[10.5px] uppercase tracking-widest text-blueprint">
              {selected.length} on the cut · margin {margin?.toFixed(1) ?? '—'}
            </span>
          </div>
          <h2 className="mt-3 font-display text-2xl text-ink leading-tight">
            These options crossed the line.
          </h2>

          <ul className="mt-6 divide-y divide-ink/12">
            {all.map((opt: any, i: number) => (
              <li
                key={opt.option_id}
                className={cn(
                  'flex items-center gap-4 py-3 first:pt-0',
                  !opt.selected && 'opacity-65'
                )}
              >
                <NumberMarker n={opt.rank ?? i + 1} />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[17px] text-ink truncate">
                    {opt.title}
                  </div>
                  <div className="mt-1.5 relative h-2 border border-ink/25 bg-paper">
                    <div
                      className={cn(
                        'h-full',
                        opt.selected ? 'bg-blueprint' : 'bg-ink/30'
                      )}
                      style={{ width: (opt.votes / max) * 100 + '%' }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right min-w-[110px]">
                  <div className="font-display text-[22px] tabular-nums text-ink leading-none">
                    {opt.votes.toFixed(1)}
                  </div>
                  <div
                    className={cn(
                      'font-mono text-[10px] uppercase tracking-widest mt-1',
                      opt.selected ? 'text-blueprint' : 'text-ink-3'
                    )}
                  >
                    {opt.selected ? '✓ Selected' : '— Not selected'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SchematicCard>

        <SchematicCard className="p-6 self-start">
          <SectionLabel>Reading this</SectionLabel>
          <p className="mt-3 font-serif text-[15px] text-ink-2 leading-snug">
            Bars show <em>quadratic</em> votes, not raw credits. The dashed
            line marks where the cut was set. Margin is the distance between
            the last in and the first out.
          </p>

          <hr className="ink-rule" />
          <SpecRow label="Selected" value={selected.length} />
          <SpecRow label="Not selected" value={notSelected.length} />
          <SpecRow
            label="Margin"
            value={margin !== undefined ? margin.toFixed(2) : '—'}
          />
        </SchematicCard>
      </div>
    </>
  );
}

/* ────────────────────── PROPORTIONAL REPORT ────────────────────── */
function ProportionalReport({ results }: { results: any }) {
  const distributions = results.distributions ?? [];
  const totalPool = results.total_pool;
  const totalAllocated = results.total_allocated ?? 0;
  const gini = results.gini_coefficient ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SchematicCard accent className="p-6 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <SectionLabel number={1}>Distribution</SectionLabel>
            <span className="font-mono text-[10.5px] uppercase tracking-widest text-terracotta">
              {results.resource_symbol}
              {totalAllocated.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{' '}
              allocated
            </span>
          </div>
          <h2 className="mt-3 font-display text-2xl text-ink leading-tight">
            How the pool splits.
          </h2>

          {/* Stacked bar */}
          <div className="mt-6">
            <div className="flex h-9 border border-ink/25 overflow-hidden">
              {distributions.map((d: any, i: number) => (
                <div
                  key={d.option_id}
                  title={`${d.title}: ${d.allocation_percentage.toFixed(1)}%`}
                  className={cn(
                    DIST_COLORS[i % DIST_COLORS.length],
                    'transition-opacity hover:opacity-80'
                  )}
                  style={{ width: d.allocation_percentage + '%' }}
                />
              ))}
            </div>
          </div>

          <ul className="mt-6 divide-y divide-ink/12">
            {distributions.map((d: any, i: number) => (
              <li
                key={d.option_id}
                className="flex items-center gap-4 py-3 first:pt-0"
              >
                <span
                  aria-hidden
                  className={cn(
                    'inline-block h-3 w-3 shrink-0',
                    DIST_COLORS[i % DIST_COLORS.length]
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[17px] text-ink truncate">
                    {d.title}
                  </div>
                  <div className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3 mt-0.5">
                    {d.votes.toFixed(1)} votes · {d.allocation_percentage.toFixed(1)}% of pool
                  </div>
                </div>
                <div className="shrink-0 text-right min-w-[140px]">
                  <div className="font-display text-[22px] tabular-nums text-ink leading-none">
                    {results.resource_symbol}
                    {d.allocation_amount.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-ink-3 mt-1">
                    {results.resource_name}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SchematicCard>

        <SchematicCard className="p-6 self-start">
          <SectionLabel>Reading this</SectionLabel>
          <p className="mt-3 font-serif text-[15px] text-ink-2 leading-snug">
            Each option&apos;s share of the pool is proportional to the
            quadratic votes it received. The Gini coefficient below
            summarises how concentrated the result is.
          </p>

          <hr className="ink-rule" />
          <SpecRow label="Pool" value={`${results.resource_symbol}${Number(totalPool).toLocaleString()}`} />
          <SpecRow
            label="Allocated"
            value={`${results.resource_symbol}${totalAllocated.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          />
          <SpecRow
            label="Gini"
            value={
              <span title="0 = perfectly equal · 1 = total concentration">
                {gini.toFixed(3)}{' '}
                <span className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3 ml-1">
                  {gini < 0.2 ? 'even' : gini < 0.4 ? 'mixed' : 'concentrated'}
                </span>
              </span>
            }
          />
        </SchematicCard>
      </div>
    </>
  );
}

const DIST_COLORS = [
  'bg-terracotta',
  'bg-blueprint',
  'bg-sage',
  'bg-gold',
  'bg-terracotta-2',
  'bg-blueprint-2',
];

/* ───── timeline ───── */
function ParticipationChart({ data }: { data: any[] }) {
  const sorted = [...data].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
  const max = Math.max(...sorted.map((d) => d.voteCount), 1);
  return (
    <div className="mt-6 flex items-end gap-1 h-40 border-b border-ink/25 pl-2 pr-2">
      {sorted.map((d, i) => (
        <div
          key={d.timestamp}
          className="relative flex-1 group"
          style={{ height: '100%' }}
          title={`${new Date(d.timestamp).toLocaleString()} — ${d.voteCount} votes`}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-blueprint group-hover:bg-blueprint-2 transition-colors"
            style={{ height: (d.voteCount / max) * 100 + '%' }}
          />
        </div>
      ))}
    </div>
  );
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3">
        {label}
      </span>
      <span className="font-display text-[17px] text-ink leading-tight tabular-nums">
        {children}
      </span>
    </div>
  );
}
