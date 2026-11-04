import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
  {
    variants: {
      variant: {
        default: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
        secondary: 'border border-line bg-surface text-ink shadow-sm hover:bg-canvas',
        outline: 'border border-line bg-transparent text-ink hover:bg-canvas',
        ghost: 'text-muted hover:bg-canvas hover:text-ink',
        danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
        dark: 'bg-navy-900 text-white hover:bg-navy-850',
      },
      size: { default: 'h-10 px-4', sm: 'h-8 rounded-md px-3 text-xs', lg: 'h-11 px-5', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
export { buttonVariants };
