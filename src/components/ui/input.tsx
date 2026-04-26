import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-[3px] border-[1.5px] border-ink/25 bg-paper px-3 py-2',
          'font-serif text-[16px] text-ink placeholder:text-ink-3/60',
          'transition-[border-color,box-shadow] duration-150',
          'focus-visible:outline-none focus-visible:border-blueprint',
          'focus-visible:shadow-[0_0_0_3px_rgb(var(--blueprint)/0.12)]',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
