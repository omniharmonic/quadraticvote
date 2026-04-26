'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/navigation';
import {
  GraphPaper,
  SectionLabel,
  SchematicCard,
  Stamp,
  NumberMarker,
  Sqrt,
} from '@/components/schematic';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/cn';

type AdminEventEntry = { event: any; role: string };

export default function AdminDashboard() {
  const { user, isAuthenticated, loading, getUserAdminEvents } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<AdminEventEntry[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?redirect=/admin');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setEventsLoading(true);
      try {
        const result = await getUserAdminEvents();
        if (!cancelled) setEvents(result);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getUserAdminEvents]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-paper">
        <Navigation />
        <div className="mx-auto max-w-5xl px-5 md:px-8 py-20 font-mono text-[11px] uppercase tracking-widest text-ink-3">
          Loading…
        </div>
      </div>
    );
  }

  const now = new Date();
  const liveEvents = events.filter(
    (e) => new Date(e.event.start_time) <= now && new Date(e.event.end_time) >= now
  );
  const upcomingEvents = events.filter((e) => new Date(e.event.start_time) > now);
  const closedEvents = events.filter((e) => new Date(e.event.end_time) < now);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navigation />

      {/* HEADER — editor's desk */}
      <section className="relative overflow-hidden border-b border-ink/15">
        <GraphPaper aria-hidden className="absolute inset-0 opacity-50" />
        <div
          aria-hidden
          className="absolute left-12 top-0 bottom-0 w-px bg-terracotta/40 hidden md:block"
        />

        <div className="relative mx-auto max-w-7xl px-5 md:px-8 py-14 md:py-20">
          <div className="flex items-end justify-between flex-wrap gap-6">
            <div>
              <SectionLabel>Dashboard</SectionLabel>
              <h1 className="mt-3 font-display text-[44px] sm:text-[56px] leading-[1.02] tracking-[-0.02em] text-ink anim-ink text-balance">
                Welcome back, {(user.email || '').split('@')[0]}.
              </h1>
              <p className="mt-4 max-w-xl font-serif text-[17px] text-ink-2 leading-snug anim-ink [animation-delay:120ms]">
                Your events. Pick up where you left off, or start a new one.
              </p>
            </div>
            <Stamp tone="blueprint" rotate={-2}>
              {events.length} event{events.length === 1 ? '' : 's'}
            </Stamp>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 md:px-8 py-12 md:py-16 space-y-12">
        {/* QUICK ACTIONS — three numbered shortcuts */}
        <section>
          <SectionLabel number={1}>Quick actions</SectionLabel>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
            <ActionCard
              n={1}
              title="Create a new event"
              body="Six steps from idea to live ballot."
              href="/events/create"
              accent="blueprint"
              cta="New event"
              ctaClass="btn-blueprint"
            />
            <ActionCard
              n={2}
              title="Review proposals"
              body="Approve community-submitted proposals as voting options, or send them back."
              href="/admin/proposals"
              accent="terracotta"
              cta="Open queue"
              ctaClass="btn-terra"
            />
            <ActionCard
              n={3}
              title="Accept an admin invite"
              body="Have a code from another organizer? Use it to gain access to a shared event."
              href="/admin/invite"
              accent="sage"
              cta="Use code"
              ctaClass="btn-paper"
            />
          </div>
        </section>

        {/* YOUR EVENTS */}
        <section>
          <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
            <div>
              <SectionLabel number={2}>Your events</SectionLabel>
              <h2 className="mt-3 font-display text-3xl text-ink leading-tight">
                Events you can manage.
              </h2>
              {!eventsLoading && events.length > 0 && (
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-ink-3">
                  {events.length} total ·{' '}
                  <span className="text-sage">{liveEvents.length} live</span> ·{' '}
                  <span className="text-terracotta">{upcomingEvents.length} upcoming</span> ·{' '}
                  <span className="text-ink-3">{closedEvents.length} closed</span>
                </p>
              )}
            </div>
          </div>

          {eventsLoading ? (
            <div className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
              Loading your events…
            </div>
          ) : events.length === 0 ? (
            <SchematicCard className="p-12 text-center">
              <Sqrt size="md" className="mx-auto opacity-30" />
              <p className="mt-4 font-display text-2xl text-ink">
                No events yet.
              </p>
              <p className="mt-2 font-serif text-ink-2 max-w-md mx-auto">
                Create your first event, or accept an invite from another organizer.
              </p>
              <Link href="/events/create" className="btn-ink mt-6 inline-flex">
                Create an event
              </Link>
            </SchematicCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map(({ event, role }, i) => (
                <AdminEventCard key={event.id} event={event} role={role} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ─────────── pieces ─────────── */

function ActionCard({
  n,
  title,
  body,
  href,
  accent,
  cta,
  ctaClass,
}: {
  n: number;
  title: string;
  body: string;
  href: string;
  accent: 'blueprint' | 'terracotta' | 'sage';
  cta: string;
  ctaClass: string;
}) {
  return (
    <SchematicCard accent className="p-6 md:p-7 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
          Action · {String(n).padStart(2, '0')}
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
      <h3 className="font-display text-2xl text-ink leading-tight">{title}</h3>
      <p className="mt-2.5 font-serif text-[15px] text-ink-2 leading-snug flex-1 text-pretty">
        {body}
      </p>
      <Link href={href} className={cn('mt-5', ctaClass)}>
        {cta} →
      </Link>
    </SchematicCard>
  );
}

function AdminEventCard({
  event,
  role,
  index,
}: {
  event: any;
  role: string;
  index: number;
}) {
  const now = new Date();
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const live = now >= start && now <= end;
  const upcoming = now < start;
  const closed = now > end;
  const fw = event.decision_framework?.framework_type;
  const isBinary = fw === 'binary_selection';

  return (
    <Link href={`/admin/events/${event.id}`} className="block group">
      <SchematicCard
        className={cn(
          'p-6 transition-all anim-draft',
          'hover:-translate-y-0.5 hover:shadow-[0_18px_30px_-18px_rgb(var(--ink)/0.35)]'
        )}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <Badge variant={isBinary ? 'blueprint' : 'terracotta'}>
            {isBinary ? 'Binary' : 'Proportional'}
          </Badge>
          <Badge
            variant={
              live ? 'sage' : upcoming ? 'terracotta' : 'secondary'
            }
          >
            <span
              className={cn(
                'mr-1 inline-block h-1.5 w-1.5 rounded-full',
                live && 'bg-sage animate-pulse',
                upcoming && 'bg-terracotta',
                closed && 'bg-ink-3'
              )}
            />
            {live ? 'live' : upcoming ? 'upcoming' : 'closed'}
          </Badge>
        </div>

        <h3 className="font-display text-[20px] leading-tight text-ink line-clamp-2 group-hover:text-blueprint transition-colors">
          {event.title}
        </h3>

        <hr className="ink-rule" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[10.5px] uppercase tracking-widest">
          <div className="flex flex-col">
            <span className="text-ink-3">Window</span>
            <span className="font-display normal-case tracking-normal text-[14px] text-ink">
              {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {' → '}
              {end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-ink-3">Role</span>
            <span className="font-display normal-case tracking-normal text-[14px] text-terracotta">
              {role}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-widest text-ink-3 group-hover:text-terracotta transition-colors">
          <span>Manage event</span>
          <span aria-hidden>→</span>
        </div>
      </SchematicCard>
    </Link>
  );
}
