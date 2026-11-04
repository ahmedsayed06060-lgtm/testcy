import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted/70 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:opacity-50', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('min-h-28 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted/70 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export function Field({ label, error, hint, children, required }: { label: string; error?: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return <label className="block space-y-1.5 text-sm font-medium text-ink"><span>{label}{required && <span className="ms-1 text-red-500">*</span>}</span>{children}{hint && !error && <span className="block text-xs font-normal text-muted">{hint}</span>}{error && <span role="alert" className="block text-xs font-normal text-red-600">{error}</span>}</label>;
}

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn('h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15', className)} {...props}>{children}</select>
));
Select.displayName = 'Select';
