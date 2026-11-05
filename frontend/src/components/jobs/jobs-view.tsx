'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Activity, ArrowRight, CheckCircle2, Clock3, Octagon, Plus, Search, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSkeleton } from '@/components/common/loading-skeleton';
import { JobStatusBadge } from './job-status-badge';
import { useCancelJob, useJobs, useKillSwitch } from '@/hooks/use-jobs';
import { useUIStore } from '@/stores/ui-store';
import { useToast } from '@/components/ui/toast';
import { downloadText } from '@/lib/utils';
import type { ApiJob } from '@/types/api';

function JobRow({ job, locale }: { job: ApiJob; locale: string }) {
  const cancel = useCancelJob(job.id);
  const { toast } = useToast();
  const active = ['pending', 'validating', 'running'].includes(job.status);
  return <tr className="group hover:bg-canvas/60"><td className="table-cell"><Link href={`/${locale}/jobs/${job.id}`}><span className="text-xs font-semibold">{job.tool}</span><span className="mt-1 block font-mono text-[10px] text-muted">{job.id} · {job.profile}</span></Link></td><td className="table-cell"><span className="block max-w-[220px] truncate font-mono text-[11px]">{job.targets.join(', ')}</span></td><td className="table-cell"><JobStatusBadge status={job.status} /></td><td className="table-cell whitespace-nowrap text-[11px] text-muted">{job.started_at ? new Date(job.started_at).toLocaleString() : 'Not started'}</td><td className="table-cell text-[11px] text-muted">{job.duration_seconds === null ? '—' : `${job.duration_seconds}s`}</td><td className="px-3"><div className="flex"><Link aria-label={`Open ${job.id}`} className="icon-button h-8 w-8" href={`/${locale}/jobs/${job.id}`}><ArrowRight className="h-4 w-4" /></Link>{active && <button className="icon-button h-8 w-8 hover:text-red-600" title="Cancel job" disabled={cancel.isPending} onClick={() => { void cancel.mutateAsync().then(() => toast('Job cancelled')).catch((error: unknown) => toast('Cancellation failed', error instanceof Error ? error.message : undefined, 'error')); }}><XCircle className="h-4 w-4" /></button>}</div></td></tr>;
}

export function JobsView() {
  const locale = useLocale();
  const openJobForm = useUIStore((state) => state.setJobFormOpen);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [killOpen, setKillOpen] = useState(false);
  const jobs = useJobs({ page, limit: 20, status: status === 'all' ? undefined : status });
  const killSwitch = useKillSwitch();
  const { toast } = useToast();
  const items = (jobs.data?.items ?? []).filter((job) => `${job.id} ${job.tool} ${job.targets.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const running = items.filter((job) => ['running', 'validating', 'pending'].includes(job.status));
  const killAll = async () => { try { const result = await killSwitch.mutateAsync(); setKillOpen(false); toast('Kill switch activated', `${result.cancelled_jobs} running jobs were cancelled.`); } catch (error) { toast('Kill switch failed', error instanceof Error ? error.message : 'Administrator access is required.', 'error'); } };
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow="Authorized execution" title="Scan jobs" description="Monitor isolated tool execution with authorization revalidation at every dispatch." actions={<><Button variant="secondary" className="text-red-600" onClick={() => setKillOpen(true)}><Octagon className="h-4 w-4" />Kill switch</Button><Button onClick={() => openJobForm(true)}><Plus className="h-4 w-4" />New scan</Button></>} /><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><Activity className="h-5 w-5 text-blue-600" /><p className="mt-3 text-2xl font-semibold">{running.length}</p><p className="text-xs text-muted">Active operations on this page</p></Card><Card className="p-5"><CheckCircle2 className="h-5 w-5 text-brand-600" /><p className="mt-3 text-2xl font-semibold">{items.filter((job) => job.status === 'completed').length}</p><p className="text-xs text-muted">Completed on this page</p></Card><Card className="p-5"><Clock3 className="h-5 w-5 text-amber-600" /><p className="mt-3 text-2xl font-semibold">{jobs.data?.pagination?.total ?? items.length}</p><p className="text-xs text-muted">Total accessible jobs</p></Card></div><Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute start-3 top-2.5 h-4 w-4 text-muted" /><input aria-label="Search jobs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs or targets…" className="h-9 w-full rounded-lg border border-line bg-canvas/40 ps-9 pe-3 text-xs outline-none" /></div><select aria-label="Job status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-line bg-surface px-3 text-xs"><option value="all">All statuses</option><option value="pending">Pending</option><option value="running">Running</option><option value="validating">Validating</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select></div>{jobs.isLoading ? <div className="p-5"><LoadingSkeleton rows={6} /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr className="table-head">{['Job', 'Target', 'Status', 'Started', 'Duration'].map((header) => <th key={header} className="px-5 py-3 text-start">{header}</th>)}<th /></tr></thead><tbody className="divide-y divide-line">{items.map((job) => <JobRow key={job.id} job={job} locale={locale} />)}</tbody></table>{!items.length && <EmptyState title="No jobs found" description={jobs.isError ? 'The jobs API could not be reached or no jobs are accessible to your role.' : 'Submit an authorized scan to create a job.'} />}</div>}<div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted"><span>Page {page} of {Math.max(1, jobs.data?.pagination?.pages ?? 1)}</span><div className="flex gap-2"><Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="ghost" size="sm" disabled={page >= (jobs.data?.pagination?.pages ?? 1)} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div></Card><div className="flex items-center justify-between rounded-xl border border-line bg-surface px-5 py-4"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-brand-600" /><div><p className="text-xs font-semibold">Sandboxed execution policy</p><p className="mt-1 text-[10px] text-muted">Read-only filesystem · dropped capabilities · configured resource limits · controlled egress</p></div></div><Button size="sm" variant="ghost" onClick={() => downloadText('cyberops-execution-policy.txt', 'CyberOps Hub execution policy\nRead-only root filesystem\nCapabilities: none\nAuthorization: mandatory\nWorker revalidation: mandatory')}>Export policy</Button></div><Modal open={killOpen} onClose={() => setKillOpen(false)} title="Activate global kill switch?" description="Administrator-only action that cancels all running jobs." size="sm"><div className="p-6 text-xs leading-6 text-red-800">This action is written to the immutable audit log. Use it only during an operational or authorization emergency.</div><div className="flex justify-end gap-3 border-t border-line px-6 py-4"><Button variant="secondary" onClick={() => setKillOpen(false)}>Keep jobs running</Button><Button variant="danger" loading={killSwitch.isPending} onClick={() => void killAll()}><Octagon className="h-4 w-4" />Cancel all jobs</Button></div></Modal></div>;
}
