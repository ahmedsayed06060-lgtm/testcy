import { cn } from '@/lib/utils';

export function Progress({ value, className, barClassName, label }: { value: number; className?: string; barClassName?: string; label?: string }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue} aria-label={label ?? 'Progress'} className={cn('h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', className)}><div className={cn('h-full rounded-full bg-brand-500 transition-all duration-500', barClassName)} style={{ width: `${safeValue}%` }} /></div>;
}
