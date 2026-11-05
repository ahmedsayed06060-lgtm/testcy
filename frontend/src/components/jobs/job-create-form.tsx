'use client';

import { useState } from 'react';
import { Play, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Select, Textarea } from '@/components/ui/input';
import { useUIStore } from '@/stores/ui-store';
import { useEngagements } from '@/hooks/use-engagements';
import { useCreateJob } from '@/hooks/use-jobs';
import { useToast } from '@/components/ui/toast';

export function JobCreateForm() {
  const { jobFormOpen, setJobFormOpen } = useUIStore();
  const engagements = useEngagements({ limit: 100 });
  const create = useCreateJob();
  const [engagementId, setEngagementId] = useState('');
  const [jobType, setJobType] = useState('nmap_scan');
  const [profile, setProfile] = useState<'light' | 'standard' | 'deep'>('standard');
  const [targets, setTargets] = useState('');
  const { toast } = useToast();
  const selectedId = engagementId || engagements.data?.items[0]?.id || '';
  const submit = async () => {
    const items = targets.split(/[\n,]/).map((target) => target.trim()).filter(Boolean);
    if (!selectedId || !items.length) return;
    try { await create.mutateAsync({ engagement_id: selectedId, job_type: jobType, targets: items, profile, parameters: {} }); toast('Job submitted for authorization', 'The API and worker independently revalidate every target before execution.'); setTargets(''); setJobFormOpen(false); }
    catch (error) { toast('Job rejected', error instanceof Error ? error.message : undefined, 'error'); }
  };
  return <Modal open={jobFormOpen} onClose={() => setJobFormOpen(false)} title="Create authorized scan" description="Only explicitly authorized, verified assets can be dispatched." size="lg"><div className="space-y-5 p-6"><Field label="Engagement" required><Select value={selectedId} onChange={(event) => setEngagementId(event.target.value)}><option value="">Select an engagement</option>{engagements.data?.items.map((engagement) => <option key={engagement.id} value={engagement.id}>{engagement.name} · {engagement.status}</option>)}</Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Tool" required><Select value={jobType} onChange={(event) => setJobType(event.target.value)}><option value="nmap_scan">Nmap service discovery</option><option value="nuclei_scan">Nuclei vulnerability scan</option><option value="zap_scan">OWASP ZAP web scan</option><option value="testssl_scan">testssl.sh TLS assessment</option><option value="osint_scan">Public OSINT assessment</option></Select></Field><Field label="Scan profile" required><Select value={profile} onChange={(event) => setProfile(event.target.value as typeof profile)}><option value="light">Light</option><option value="standard">Standard</option><option value="deep">Deep</option></Select></Field></div><Field label="Targets" hint="One target per line. Out-of-scope exclusions always take precedence." required><Textarea value={targets} onChange={(event) => setTargets(event.target.value)} className="font-mono text-xs" /></Field><div className="flex gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-950"><ShieldCheck className="h-5 w-5 shrink-0 text-brand-600" /><p className="text-[11px] leading-5">Submission is not an authorization override. The FastAPI gate and Celery worker independently validate the engagement, current time, document, scope, exclusions, ownership, and assignment.</p></div><div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setJobFormOpen(false)}>Cancel</Button><Button disabled={!selectedId || !targets.trim()} loading={create.isPending} onClick={() => void submit()}><Play className="h-4 w-4" />Submit for validation</Button></div></div></Modal>;
}
