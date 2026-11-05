'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowRight, TerminalSquare } from 'lucide-react';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { EmptyState } from '@/components/common/empty-state';
import { useJobs } from '@/hooks/use-jobs';

export function LiveOperations() {
  const locale = useLocale();
  const jobs = useJobs({ limit: 8 });
  if (jobs.isLoading) return <p className="p-5 text-xs text-muted">Loading authorized operations…</p>;
  if (!jobs.data?.items.length) return <EmptyState title="No operations found" description="Authorized jobs will appear here after dispatch." />;
  return <div className="divide-y divide-line">{jobs.data.items.map((job) => <Link key={job.id} href={`/${locale}/jobs/${job.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-canvas/50"><TerminalSquare className="h-4 w-4 shrink-0 text-brand-600" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{job.tool}</p><p className="mt-1 truncate font-mono text-[10px] text-muted">{job.targets.join(', ')}</p></div><JobStatusBadge status={job.status} /><ArrowRight className="h-3.5 w-3.5 text-muted rtl:rotate-180" /></Link>)}</div>;
}
