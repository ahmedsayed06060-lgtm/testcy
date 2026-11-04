import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-5', {
  variants: {
    variant: {
      default: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400',
      warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400',
      danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400',
      info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400',
      purple: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-400',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'default'; dot?: boolean }> = {
    active: { label: 'Active', variant: 'success', dot: true }, running: { label: 'Running', variant: 'info', dot: true },
    completed: { label: 'Completed', variant: 'success' }, fixed: { label: 'Fixed', variant: 'success' },
    pending_approval: { label: 'Pending approval', variant: 'warning', dot: true }, validating: { label: 'Validating', variant: 'warning', dot: true },
    queued: { label: 'Queued', variant: 'default', dot: true }, paused: { label: 'Paused', variant: 'warning' },
    open: { label: 'Open', variant: 'danger', dot: true }, in_progress: { label: 'In progress', variant: 'info', dot: true },
    retest: { label: 'Retest', variant: 'purple' }, cancelled: { label: 'Cancelled', variant: 'default' },
    failed: { label: 'Failed', variant: 'danger' }, draft: { label: 'Draft', variant: 'default' }, accepted_risk: { label: 'Accepted risk', variant: 'warning' },
  };
  const item = config[status] ?? { label: status.replaceAll('_', ' '), variant: 'default' as const };
  return <Badge variant={item.variant} className="capitalize">{item.dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{item.label}</Badge>;
}

export function SeverityBadge({ severity, score }: { severity: string; score?: number }) {
  const variant = severity === 'critical' ? 'danger' : severity === 'high' ? 'warning' : severity === 'medium' ? 'warning' : severity === 'low' ? 'info' : 'default';
  return <Badge variant={variant} className="capitalize"><span className={cn('h-1.5 w-1.5 rounded-full', severity === 'critical' ? 'bg-red-500' : severity === 'high' ? 'bg-orange-500' : severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500')} />{severity}{score !== undefined && <span className="text-opacity-70">· {score.toFixed(1)}</span>}</Badge>;
}
