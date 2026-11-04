'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Activity, Clock3, ScanLine, ShieldCheck } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { useOpsStore } from '@/stores/ops-store';

export function LiveOperations() {
  const locale = useLocale();
  const jobs = useOpsStore((state) => state.jobs).slice(0, 4);
  return <div className="divide-y divide-line">{jobs.map((job) => <Link href={`/${locale}/jobs/${job.id}`} key={job.id} className="block px-5 py-4 transition hover:bg-canvas/50"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-muted"><ScanLine className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-semibold">{job.type}</p><span className="text-[10px] font-medium tabular-nums text-muted">{job.progress}%</span></div><p className="mt-1 truncate font-mono text-[10px] text-muted">{job.target}</p><div className="mt-2 flex items-center gap-2"><Progress value={job.progress} className="flex-1" barClassName={job.status === 'validating' ? 'bg-amber-500' : job.status === 'queued' ? 'bg-slate-400' : 'bg-blue-500'} /><span className="flex items-center gap-1 text-[9px] text-muted">{job.status === 'running' ? <Activity className="h-3 w-3 text-blue-500" /> : <Clock3 className="h-3 w-3" />}{job.status}</span></div></div></div></Link>)}<div className="flex items-center gap-2 bg-canvas/40 px-5 py-3 text-[10px] text-muted"><ShieldCheck className="h-3.5 w-3.5 text-brand-600" />Worker revalidation enabled for every job</div></div>;
}
