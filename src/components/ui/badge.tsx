import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * Engineering tag — small monospace label with a thin border.
 * Used for framework type, status, role, etc.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-widest transition-colors',
  {
    variants: {
      variant: {
        default: 'border-ink/35 bg-paper-2 text-ink-2',
        outline: 'border-ink/55 bg-paper text-ink',
        blueprint: 'border-blueprint/40 bg-blueprint/10 text-blueprint',
        terracotta: 'border-terracotta/40 bg-terracotta/10 text-terracotta',
        sage: 'border-sage/40 bg-sage/10 text-sage',
        wine: 'border-wine/40 bg-wine/10 text-wine',
        gold: 'border-gold/40 bg-gold/10 text-gold',
        secondary: 'border-ink/20 bg-paper-3 text-ink-2',
        destructive: 'border-wine/40 bg-wine/10 text-wine',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
