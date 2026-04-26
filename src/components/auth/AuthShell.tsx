'use client';

import Link from 'next/link';
import { GraphPaper, SectionLabel, Sqrt, InkRule, Stamp } from '@/components/schematic';
import { cn } from '@/lib/utils/cn';

/**
 * Letterhead-style auth layout — drafting paper on the left with the
 * brand "letterhead", form on the right. Single visual idea, kept calm.
 */
export function AuthShell({
  eyebrow,
  title,
  lede,
  footnote,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  footnote?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-stretch bg-paper text-ink">
      {/* Letterhead column */}
      <aside className="hidden lg:flex relative w-[42%] xl:w-[40%] bg-paper-2 border-r border-ink/15 overflow-hidden">
        <GraphPaper aria-hidden className="absolute inset-0 opacity-70" />
        <div
          aria-hidden
          className="absolute left-12 top-0 bottom-0 w-px bg-terracotta/40"
        />

        <div className="relative flex flex-col justify-between p-12 xl:p-16 w-full">
          <div>
            <Link
              href="/"
              className="inline-flex items-baseline gap-2 select-none group"
            >
              <span className="font-display text-[26px] leading-none text-ink tracking-tight">
                quadratic
                <span className="mx-1 text-terracotta">·</span>
                vote
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3">
                .xyz
              </span>
            </Link>

            <hr className="ink-rule mt-8" />

            <p className="font-display italic text-[22px] text-ink leading-snug max-w-[26ch] text-balance">
              A drafting table for civic decisions — measured, lit, and warm.
            </p>

            <p className="mt-6 font-serif text-[15px] text-ink-2 leading-relaxed max-w-[34ch]">
              Allocate credits. Count by <span className="font-display italic">√</span>. Turn
              opinion into outcome without letting the loudest voice drown the rest.
            </p>
          </div>

          <div className="relative">
            <Sqrt size="xl" className="text-blueprint/15" />
            <Stamp tone="terracotta" rotate={-3} className="absolute top-0 right-4">
              FORM · {String(new Date().getFullYear()).slice(-2)} / 01
            </Stamp>
          </div>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex-1 flex items-center justify-center px-5 sm:px-8 py-16">
        <div className="w-full max-w-[440px]">
          {/* small wordmark on mobile */}
          <Link
            href="/"
            className="lg:hidden mb-10 inline-flex items-baseline gap-2 select-none"
          >
            <span className="font-display text-[22px] leading-none text-ink tracking-tight">
              quadratic
              <span className="mx-1 text-terracotta">·</span>
              vote
            </span>
          </Link>

          {eyebrow && <SectionLabel>{eyebrow}</SectionLabel>}
          <h1
            className={cn(
              'mt-3 font-display text-[40px] sm:text-[44px] leading-[1.05] tracking-[-0.018em] text-ink anim-ink',
              'text-balance'
            )}
          >
            {title}
          </h1>
          {lede && (
            <p className="mt-4 font-serif text-[16.5px] text-ink-2 leading-snug max-w-[44ch] anim-ink [animation-delay:120ms]">
              {lede}
            </p>
          )}

          <div className="mt-9 anim-ink [animation-delay:200ms]">
            {children}
          </div>

          {footnote && (
            <div className="mt-10 font-serif text-[14.5px] text-ink-2">
              {footnote}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export function FieldRow({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={htmlFor}
          className="font-mono text-[10.5px] uppercase tracking-widest text-ink-3"
        >
          {label}
        </label>
        {hint && (
          <span className="font-mono text-[10.5px] uppercase tracking-widest text-ink-4">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <p className="font-mono text-[10.5px] uppercase tracking-widest text-wine pt-1">
          {error}
        </p>
      )}
    </div>
  );
}
