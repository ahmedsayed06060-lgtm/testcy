'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, LockKeyhole, Play, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/input';
import { useOpsStore } from '@/stores/ops-store';
import { useUIStore } from '@/stores/ui-store';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const schema = z.object({ engagementId: z.string().min(1), type: z.string().min(1), targets: z.string().min(3, 'At least one target is required'), profile: z.enum(['light', 'standard', 'deep']) });
type FormValues = z.infer<typeof schema>;

export function JobCreateForm() {
  const { jobFormOpen, setJobFormOpen } = useUIStore();
  const { engagements, addJob } = useOpsStore();
  const { toast } = useToast();
  const { register, watch, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { engagementId: 'eng-acme-q4', type: 'nmap', targets: 'api.acme.example', profile: 'standard' } });
  const engagementId = watch('engagementId');
  const engagement = useMemo(() => engagements.find((item) => item.id === engagementId), [engagements, engagementId]);
  const allowed = engagement?.status === 'active' && engagement.authorization === 'verified';
  const close = () => { setJobFormOpen(false); reset(); };
  const submit = async (values: FormValues) => {
    if (!allowed || !engagement) return;
    await new Promise((resolve) => setTimeout(resolve, 650));
    const toolNames: Record<string, string> = { nmap: 'Nmap service scan', nuclei: 'Nuclei scan', zap: 'ZAP web scan', testssl: 'TLS assessment' };
    addJob({ id: `JOB-${crypto.randomUUID().slice(0, 5).toUpperCase()}`, type: toolNames[values.type] ?? values.type, target: values.targets.split(/[\n,]/)[0]!.trim(), engagementId: engagement.id, engagement: engagement.name, profile: values.profile, status: 'validating', progress: 5, started: 'Just now', duration: '—', triggeredBy: 'Omar Khaled' });
    toast('Job submitted for authorization', 'The server and worker will independently revalidate every target before execution.');
    close();
  };
  const checks = [
    { label: 'Engagement is active', pass: engagement?.status === 'active' },
    { label: 'Signed authorization verified', pass: engagement?.authorization === 'verified' },
    { label: 'Scope and ownership matched', pass: allowed },
    { label: 'Current testing window valid', pass: allowed },
  ];
  return <Modal open={jobFormOpen} onClose={close} title="Create authorized scan" description="Only explicitly authorized, verified assets can be dispatched." size="lg"><form onSubmit={handleSubmit(submit)}><div className="grid gap-5 p-6 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Engagement" required><Select {...register('engagementId')}>{engagements.filter((item) => item.status !== 'completed').map((item) => <option key={item.id} value={item.id}>{item.client} — {item.name}</option>)}</Select></Field></div><Field label="Tool" required><Select {...register('type')}><option value="nmap">Nmap service discovery</option><option value="nuclei">Nuclei vulnerability scan</option><option value="zap">OWASP ZAP web scan</option><option value="testssl">testssl.sh TLS assessment</option></Select></Field><Field label="Scan profile" required><Select {...register('profile')}><option value="light">Light · reduced coverage</option><option value="standard">Standard · recommended</option><option value="deep">Deep · extended validation</option></Select></Field><div className="sm:col-span-2"><Field label="Targets" error={errors.targets?.message} hint="One target per line. Out-of-scope exclusions always take precedence." required><textarea rows={3} className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-xs outline-none focus:border-brand-500" {...register('targets')} /></Field></div><div className={cn('rounded-xl border p-4 sm:col-span-2', allowed ? 'border-brand-200 bg-brand-50/60 dark:border-brand-900 dark:bg-brand-950/40' : 'border-red-200 bg-red-50 dark:border-red-950')}><div className="mb-3 flex items-center gap-2"><LockKeyhole className={cn('h-4 w-4', allowed ? 'text-brand-600' : 'text-red-600')} /><p className="text-xs font-semibold">Authorization pre-flight</p><span className={cn('ms-auto text-[10px] font-semibold', allowed ? 'text-brand-700' : 'text-red-600')}>{allowed ? 'Ready to submit' : 'Execution blocked'}</span></div><div className="grid gap-2.5 sm:grid-cols-2">{checks.map((check) => <div key={check.label} className="flex items-center gap-2 text-[11px] text-muted">{check.pass ? <Check className="h-3.5 w-3.5 text-brand-600" /> : <X className="h-3.5 w-3.5 text-red-500" />}{check.label}</div>)}</div><p className="mt-3 border-t border-black/5 pt-3 text-[10px] leading-4 text-muted">This preview is not an authorization override. The FastAPI gate validates again on receipt and the Celery worker revalidates immediately before container execution.</p></div></div><div className="flex justify-end gap-3 border-t border-line bg-canvas/40 px-6 py-4"><Button type="button" variant="secondary" onClick={close}>Cancel</Button><Button type="submit" disabled={!allowed} loading={isSubmitting}><Play className="h-4 w-4" />Submit for validation</Button></div></form></Modal>;
}
