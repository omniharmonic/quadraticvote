import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[96px] w-full rounded-[3px] border-[1.5px] border-ink/25 bg-paper px-3 py-2',
          'font-serif text-[16px] text-ink placeholder:text-ink-3/60 leading-snug',
          'transition-[border-color,box-shadow] duration-150',
          'focus-visible:outline-none focus-visible:border-blueprint',
          'focus-visible:shadow-[0_0_0_3px_rgb(var(--blueprint)/0.12)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
