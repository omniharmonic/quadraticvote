/**
 * Civic Drafting Studio — schematic primitives
 *
 * Tiny, composable pieces that carry the drafting-table-meets-kitchen-table
 * vocabulary: graph-paper backgrounds, monospaced section labels, corner
 * dimension ticks, stamps, the √ glyph, dimension lines.
 */

import { cn } from '@/lib/utils';

/* -------- backgrounds -------- */

export function GraphPaper({
  className,
  fine,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { fine?: boolean }) {
  return (
    <div
      className={cn(
        'relative',
        fine ? 'bg-graph-fine' : 'bg-graph',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------- section label  ( § 02 · CIVIC DECISIONS ) -------- */

export function SectionLabel({
  number,
  children,
  className,
}: {
  number?: string | number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-widest text-ink-3',
        className
      )}
    >
      <span className="text-blueprint">§</span>
      {number !== undefined && (
        <span className="text-ink/70">
          {String(number).padStart(2, '0')}
        </span>
      )}
      <span className="text-ink-3/70">·</span>
      <span>{children}</span>
    </span>
  );
}

/* -------- schematic card with corner ticks -------- */

export function SchematicCard({
  className,
  accent,
  ticks = true,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { accent?: boolean; ticks?: boolean }) {
  return (
    <div
      className={cn(
        'schematic',
        accent && 'schematic--accent',
        ticks && 'schematic-tick',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------- stamp ( like a rubber stamp on a document ) -------- */

export function Stamp({
  tone = 'ink',
  rotate = -1.5,
  children,
  className,
}: {
  tone?: 'ink' | 'sage' | 'wine' | 'blueprint' | 'terracotta' | 'gold';
  rotate?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const toneClass = {
    ink: 'text-ink',
    sage: 'text-sage',
    wine: 'text-wine',
    blueprint: 'text-blueprint',
    terracotta: 'text-terracotta',
    gold: 'text-gold',
  }[tone];

  return (
    <span
      className={cn('stamp', toneClass, className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}

/* -------- dimension line — used like architectural drawings -------- */

export function DimLine({
  className,
  vertical,
}: {
  className?: string;
  vertical?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        vertical ? 'construction-line-v block' : 'dim-line block',
        className
      )}
    />
  );
}

/* -------- big √ glyph as a hero motif -------- */

export function Sqrt({
  size = 'lg',
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeClass = {
    sm: 'text-4xl',
    md: 'text-7xl',
    lg: 'text-[120px]',
    xl: 'text-[200px]',
  }[size];

  return (
    <span aria-hidden className={cn('glyph-sqrt select-none', sizeClass, className)}>
      √
    </span>
  );
}

/* -------- callout — small annotation like on engineering drawings -------- */

export function Callout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn('callout', className)}>{children}</span>;
}

/* -------- ink rule — section divider -------- */

export function InkRule({
  double,
  className,
}: {
  double?: boolean;
  className?: string;
}) {
  return (
    <hr
      className={cn(double ? 'ink-rule-double' : 'ink-rule', className)}
    />
  );
}

/* -------- equation — formatted display of a formula -------- */

export function Equation({
  lhs,
  rhs,
  note,
  className,
}: {
  lhs: React.ReactNode;
  rhs: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex flex-col items-start gap-1 font-display',
        className
      )}
    >
      <div className="flex items-baseline gap-3 text-2xl">
        <span>{lhs}</span>
        <span className="text-ink-3">=</span>
        <span className="text-blueprint">{rhs}</span>
      </div>
      {note && (
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
          {note}
        </span>
      )}
    </div>
  );
}

/* -------- numbered marker — the #1 / #2 / #3 chip on options -------- */

export function NumberMarker({
  n,
  className,
}: {
  n: number | string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center',
        'rounded-full border border-ink/30 bg-paper-2',
        'font-mono text-[11px] tracking-wider text-ink-2',
        className
      )}
    >
      {String(n).padStart(2, '0')}
    </span>
  );
}

/* -------- spec row — KEY ····· VALUE  like a drawing legend -------- */

export function SpecRow({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline gap-3 py-1.5',
        className
      )}
    >
      <span className="font-mono text-[11px] uppercase tracking-widest text-ink-3 shrink-0">
        {label}
      </span>
      <span className="flex-1 border-b border-dashed border-ink/15" />
      <span className="font-display text-base text-ink">{value}</span>
    </div>
  );
}

/* -------- page header — letterhead-style title block -------- */

export function PageHeader({
  eyebrow,
  title,
  lede,
  meta,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('relative', className)}>
      {eyebrow && <div className="mb-4">{eyebrow}</div>}
      <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-balance leading-[1.05] text-ink anim-ink">
        {title}
      </h1>
      {lede && (
        <p className="mt-5 max-w-2xl text-lg md:text-xl text-ink-2 text-pretty leading-snug font-serif anim-ink [animation-delay:120ms]">
          {lede}
        </p>
      )}
      {meta && (
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 anim-ink [animation-delay:240ms]">
          {meta}
        </div>
      )}
    </header>
  );
}
