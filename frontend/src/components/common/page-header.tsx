import { cn } from '@/lib/utils';

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode; className?: string }) {
  return <div className={cn('mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end', className)}><div>{eyebrow && <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-400">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>}</div>{actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}</div>;
}
