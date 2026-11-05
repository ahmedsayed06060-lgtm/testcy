'use client';

import { useState } from 'react';
import { Play, ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Select, Textarea } from '@/components/ui/input';
import { useCreateJob } from '@/hooks/use-jobs';
import { useToast } from '@/components/ui/toast';

export function CreateJobDialog({ engagementId, open, onClose }: { engagementId: string; open: boolean; onClose: () => void }) {
  const [jobType, setJobType] = useState('nmap_scan');
  const [profile, setProfile] = useState<'light' | 'standard' | 'deep'>('standard');
  const [targets, setTargets] = useState('');
  const mutation = useCreateJob();
  const { toast } = useToast();
  const submit = async () => {
    const items = targets.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
    if (!items.length) return;
    try { await mutation.mutateAsync({ engagement_id: engagementId, job_type: jobType, targets: items, profile, parameters: {} }); toast('Job queued for authorization', 'The API and worker independently revalidate scope, time, assignment, and ownership.'); setTargets(''); onClose(); }
    catch (error) { toast('Job rejected', error instanceof Error ? error.message : undefined, 'error'); }
  };
  return <Modal open={open} onClose={onClose} title="Create authorized scan job" description="Only in-scope, owned, approved targets within the testing window can execute." size="md"><div className="space-y-5 p-6"><Field label="Security tool" required><Select value={jobType} onChange={(event) => setJobType(event.target.value)}><option value="nmap_scan">Nmap</option><option value="nuclei_scan">Nuclei</option><option value="zap_scan">OWASP ZAP</option><option value="testssl_scan">testssl.sh</option><option value="osint_scan">OSINT</option></Select></Field><Field label="Scan profile"><Select value={profile} onChange={(event) => setProfile(event.target.value as typeof profile)}><option value="light">Light</option><option value="standard">Standard</option><option value="deep">Deep</option></Select></Field><Field label="Targets" required hint="One exact authorized hostname, URL, IP, or network per line. Wildcards require verified ownership."><Textarea required value={targets} onChange={(event) => setTargets(event.target.value)} placeholder="https://app.example.com" /></Field><div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950"><ShieldAlert className="h-4 w-4 shrink-0" />Job creation does not bypass the authorization gate. Ownership and exclusions are checked again immediately before execution.</div><div className="flex justify-end gap-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!targets.trim()} loading={mutation.isPending} onClick={() => void submit()}><Play className="h-4 w-4" />Queue authorized job</Button></div></div></Modal>;
}
