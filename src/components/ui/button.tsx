import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * Drafting-table button — paper, ink, blueprint, terracotta.
 * Type is monospaced and uppercase by default; the visual idiom is a
 * stamped key on a printed form. variant=link drops the stamp idiom for
 * inline use.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[3px] font-mono uppercase tracking-widest transition-[transform,background,box-shadow,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueprint/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-ink text-paper border border-ink shadow-[0_2px_0_rgb(var(--ink)/0.85)] hover:-translate-y-px active:translate-y-0 active:shadow-none',
        blueprint:
          'bg-blueprint text-paper border border-blueprint shadow-[0_2px_0_rgb(var(--blueprint)/0.6)] hover:-translate-y-px',
        terracotta:
          'bg-terracotta text-paper border border-terracotta shadow-[0_2px_0_rgb(var(--terracotta)/0.6)] hover:-translate-y-px',
        outline:
          'bg-paper text-ink border border-ink/55 hover:bg-paper-2 hover:border-ink',
        secondary:
          'bg-paper-2 text-ink border border-ink/25 hover:bg-paper-3',
        ghost:
          'border border-transparent text-ink-2 hover:bg-paper-2 hover:text-ink',
        destructive:
          'bg-wine text-paper border border-wine shadow-[0_2px_0_rgb(var(--wine)/0.6)] hover:-translate-y-px',
        link:
          'normal-case tracking-normal font-serif text-blueprint underline underline-offset-4 hover:text-ink',
      },
      size: {
        default: 'h-10 px-4 text-[12px]',
        sm: 'h-8 px-3 text-[11px]',
        lg: 'h-11 px-6 text-[12px]',
        xl: 'h-12 px-8 text-[13px]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
