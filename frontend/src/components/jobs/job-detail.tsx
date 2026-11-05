'use client';

import { Octagon, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSkeleton } from '@/components/common/loading-skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { JobStatusBadge } from './job-status-badge';
import { JobOutputViewer } from './job-output-viewer';
import { useCancelJob, useJob } from '@/hooks/use-jobs';
import { useToast } from '@/components/ui/toast';

export function JobDetail({ id }: { id: string }) {
  const job = useJob(id);
  const cancel = useCancelJob(id);
  const { toast } = useToast();
  if (job.isLoading) return <LoadingSkeleton rows={6} />;
  if (!job.data) return <EmptyState title="Job unavailable" description="The job does not exist, is outside your authorized engagements, or the API is unavailable." />;
  const item = job.data;
  const active = ['pending', 'validating', 'running'].includes(item.status);
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow={`Authorized job / ${item.id}`} title={item.tool} description={`${item.job_type.replaceAll('_', ' ')} · ${item.profile} profile`} actions={<div className="flex gap-2"><JobStatusBadge status={item.status} />{active && <Button variant="danger" size="sm" loading={cancel.isPending} onClick={() => { void cancel.mutateAsync().then(() => toast('Job cancelled')).catch((error: unknown) => toast('Cancellation failed', error instanceof Error ? error.message : undefined, 'error')); }}><Octagon className="h-4 w-4" />Cancel job</Button>}</div>} /><div className="grid gap-4 sm:grid-cols-4">{[['Created', new Date(item.created_at).toLocaleString()], ['Started', item.started_at ? new Date(item.started_at).toLocaleString() : 'Not started'], ['Completed', item.completed_at ? new Date(item.completed_at).toLocaleString() : 'Not completed'], ['Duration', item.duration_seconds === null ? '—' : `${item.duration_seconds} seconds`]].map(([label, value]) => <Card key={label} className="p-4"><p className="text-[10px] text-muted">{label}</p><p className="mt-2 text-xs font-medium">{value}</p></Card>)}</div>{item.error_message && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{item.error_message}</div>}<div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]"><Card className="overflow-hidden"><JobOutputViewer jobId={id} available={Boolean(item.raw_output_path)} /></Card><div className="space-y-6"><Card><CardHeader><CardTitle>Authorized targets</CardTitle><CardDescription>Revalidated by the worker immediately before execution</CardDescription></CardHeader><CardContent><ul className="space-y-2">{item.targets.map((target) => <li key={target} className="break-all rounded-lg bg-canvas p-3 font-mono text-[11px]">{target}</li>)}</ul></CardContent></Card><Card><CardHeader><CardTitle>Execution parameters</CardTitle></CardHeader><CardContent><pre className="overflow-auto rounded-lg bg-canvas p-3 text-[10px]">{JSON.stringify(item.parameters, null, 2)}</pre><p className="mt-4 flex gap-2 text-[11px] leading-5 text-muted"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />Server-controlled image, entrypoint, network, and resource policy. Client parameters cannot override them.</p></CardContent></Card></div></div></div>;
}
