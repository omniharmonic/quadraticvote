'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/cn';

interface NavigationProps {
  eventId?: string;
  eventTitle?: string;
  showAdminNav?: boolean;
}

/**
 * Letterhead-style site nav. Wordmark left ("QUADRATIC · VOTE"), context
 * tabs centre, account right. The hairline rule under it reads as the
 * underline of a printed letterhead.
 */
export default function Navigation({
  eventId,
  eventTitle,
  showAdminNav = false,
}: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, signOut } = useAuth();

  const tabs = showAdminNav && eventId
    ? [
        { href: `/events/${eventId}`, label: 'Event' },
        { href: `/admin/events/${eventId}`, label: 'Manage' },
        { href: `/admin/events/${eventId}/invites`, label: 'Invites' },
        { href: `/admin/events/${eventId}/options`, label: 'Options' },
        { href: `/events/${eventId}/results`, label: 'Results' },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-ink/15">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex items-center justify-between gap-6 py-3.5">
          {/* Wordmark */}
          <Link
            href="/"
            className="group inline-flex items-baseline gap-2 select-none"
          >
            <span className="font-display text-[22px] leading-none text-ink tracking-tight">
              quadratic
              <span className="mx-1 text-terracotta">·</span>
              vote
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3 hidden sm:inline">
              .xyz
            </span>
          </Link>

          {/* Context tabs */}
          {tabs.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map(({ href, label }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'px-3 py-1.5 rounded-[3px] font-mono text-[11px] uppercase tracking-widest transition-colors',
                      active
                        ? 'bg-ink text-paper'
                        : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right cluster */}
          <div className="flex items-center gap-3">
            {pathname !== '/' && (
              <button
                type="button"
                onClick={() => router.back()}
                className="hidden md:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-ink-3 hover:text-ink transition-colors"
                aria-label="Go back"
              >
                <span aria-hidden>←</span>
                <span>Back</span>
              </button>
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/admin"
                  className="hidden lg:inline font-mono text-[11px] uppercase tracking-widest text-ink-3 hover:text-ink transition-colors"
                >
                  Dashboard
                </Link>
                <span
                  className="hidden md:inline font-serif text-sm text-ink-3"
                  title={user?.email ?? ''}
                >
                  {user?.email?.split('@')[0]}
                </span>
                <button
                  onClick={async () => {
                    await signOut();
                    router.push('/');
                  }}
                  className="font-mono text-[11px] uppercase tracking-widest text-ink-3 hover:text-wine transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="font-mono text-[11px] uppercase tracking-widest text-ink-2 hover:text-ink transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {eventTitle && (
          <div className="pb-3 -mt-1 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">
              Event
            </span>
            <span className="text-ink-3/50">/</span>
            <span className="font-display text-[15px] text-ink truncate">
              {eventTitle}
            </span>
          </div>
        )}
      </div>

      {/* Decorative double rule — letterhead bottom */}
      <div aria-hidden className="h-[3px] bg-paper">
        <div className="h-px bg-ink/55" />
        <div className="h-px" />
        <div className="h-px bg-ink/25" />
      </div>
    </header>
  );
}
