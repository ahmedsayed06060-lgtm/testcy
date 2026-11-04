'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bug } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { CVSSCalculator } from './cvss-calculator';
import { useOpsStore } from '@/stores/ops-store';
import { useToast } from '@/components/ui/toast';
import type { Severity } from '@/types';

const schema = z.object({ title: z.string().min(8, 'Use a descriptive title'), engagementId: z.string().min(1), asset: z.string().min(3), severity: z.enum(['critical', 'high', 'medium', 'low', 'informational']), cvss: z.coerce.number().min(0).max(10), cwe: z.string().max(20), description: z.string().min(20, 'Describe the vulnerability and its impact'), remediation: z.string().min(20, 'Provide actionable remediation guidance') });
type Values = z.infer<typeof schema>;

export function FindingForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { engagements, addFinding } = useOpsStore();
  const { toast } = useToast();
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: '', engagementId: 'eng-acme-q4', asset: '', severity: 'medium', cvss: 5, cwe: '', description: '', remediation: '' } });
  const submit = async (values: Values) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const engagement = engagements.find((item) => item.id === values.engagementId)!;
    addFinding({ id: `CO-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`, title: values.title, engagementId: engagement.id, engagement: engagement.name, client: engagement.client, severity: values.severity as Severity, status: 'open', asset: values.asset, cvss: values.cvss, cwe: values.cwe || 'CWE-Other', discovered: 'Just now', owner: 'Omar Khaled', description: values.description, remediation: values.remediation, evidence: 'Manual finding recorded by Omar Khaled. Supporting evidence is available in the protected evidence store.', tags: ['manual'] });
    toast('Finding recorded', 'The finding is now linked to the engagement audit trail.'); reset(); onClose();
  };
  return <Modal open={open} onClose={onClose} title="Record a manual finding" description="Document validated risk with actionable remediation guidance." size="xl"><form onSubmit={handleSubmit(submit)}><div className="grid max-h-[62vh] gap-5 overflow-y-auto p-6 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Finding title" error={errors.title?.message} required><Input placeholder="Clear, specific vulnerability title" {...register('title')} /></Field></div><Field label="Engagement" required><Select {...register('engagementId')}>{engagements.map((item) => <option key={item.id} value={item.id}>{item.client} — {item.name}</option>)}</Select></Field><Field label="Affected asset" error={errors.asset?.message} required><Input placeholder="app.client.example" {...register('asset')} /></Field><Field label="Severity" required><Select {...register('severity')}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="informational">Informational</option></Select></Field><Field label="CVSS score" error={errors.cvss?.message}><Input type="number" step="0.1" min="0" max="10" {...register('cvss')} /></Field><Field label="CWE identifier"><Input placeholder="CWE-79" {...register('cwe')} /></Field><div><label className="mb-1.5 block text-sm font-medium">Score validation</label><CVSSCalculator onCalculated={(score) => setValue('cvss', score)} /></div><div className="sm:col-span-2"><Field label="Description & business impact" error={errors.description?.message} required><Textarea {...register('description')} /></Field></div><div className="sm:col-span-2"><Field label="Remediation" error={errors.remediation?.message} required><Textarea {...register('remediation')} /></Field></div></div><div className="flex justify-end gap-3 border-t border-line bg-canvas/40 px-6 py-4"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={isSubmitting}><Bug className="h-4 w-4" />Save finding</Button></div></form></Modal>;
}
