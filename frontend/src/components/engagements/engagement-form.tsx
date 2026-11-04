'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { useUIStore } from '@/stores/ui-store';
import { useOpsStore } from '@/stores/ops-store';
import { useToast } from '@/components/ui/toast';

const schema = z.object({
  name: z.string().min(4, 'Enter a descriptive engagement name').max(255),
  client: z.string().min(2, 'Select a client'),
  type: z.string().min(2),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  rules: z.string().min(20, 'Rules of engagement must contain at least 20 characters'),
  emergencyContact: z.string().min(3, 'Emergency contact is required'),
}).refine((value) => value.endDate >= value.startDate, { message: 'End date must be after the start date', path: ['endDate'] });
type FormValues = z.infer<typeof schema>;

export function EngagementForm() {
  const { engagementFormOpen, setEngagementFormOpen } = useUIStore();
  const addEngagement = useOpsStore((state) => state.addEngagement);
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', client: '', type: 'pentest', startDate: '2026-11-10', endDate: '2026-11-30', rules: '', emergencyContact: '' },
  });
  const close = () => { setEngagementFormOpen(false); reset(); };
  const submit = async (values: FormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const clientNames: Record<string, string> = { acme: 'Acme Corporation', northstar: 'Northstar Financial', helix: 'Helix Health', vertex: 'Vertex Logistics', oasis: 'Oasis Retail Group' };
    const client = clientNames[values.client] ?? values.client;
    addEngagement({
      id: `eng-${crypto.randomUUID().slice(0, 8)}`, name: values.name, client, initials: client.split(' ').map((word) => word[0]).join('').slice(0, 2),
      color: '#0ea5a4', type: values.type.replaceAll('_', ' '), status: 'draft', progress: 0,
      findings: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 }, scopeCount: 0,
      startDate: values.startDate, endDate: values.endDate, owner: { name: 'Omar Khaled', initials: 'OK' }, authorization: 'pending', description: values.rules,
    });
    toast('Engagement created', 'The draft is ready for scope and authorization documents.');
    close();
  };
  return <Modal open={engagementFormOpen} onClose={close} title="Create a new engagement" description="Define the assessment details. Execution remains disabled until all authorization checks pass." size="lg"><form onSubmit={handleSubmit(submit)}><div className="grid gap-5 p-6 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Engagement name" error={errors.name?.message} required><Input placeholder="e.g. External Infrastructure Review" {...register('name')} /></Field></div><Field label="Client" error={errors.client?.message} required><Select {...register('client')}><option value="">Select client…</option><option value="acme">Acme Corporation</option><option value="northstar">Northstar Financial</option><option value="helix">Helix Health</option><option value="vertex">Vertex Logistics</option><option value="oasis">Oasis Retail Group</option></Select></Field><Field label="Assessment type" required><Select {...register('type')}><option value="pentest">Penetration test</option><option value="web_app_test">Web application test</option><option value="vuln_assessment">Vulnerability assessment</option><option value="mobile_test">Mobile security test</option><option value="social_media_assessment">Social media assessment</option><option value="comprehensive">Comprehensive</option></Select></Field><Field label="Testing starts" error={errors.startDate?.message} required><Input type="date" {...register('startDate')} /></Field><Field label="Testing ends" error={errors.endDate?.message} required><Input type="date" {...register('endDate')} /></Field><div className="sm:col-span-2"><Field label="Rules of engagement" error={errors.rules?.message} hint="Include prohibited techniques, traffic limits, and escalation requirements." required><Textarea placeholder="Describe permitted testing methods and operational constraints…" {...register('rules')} /></Field></div><div className="sm:col-span-2"><Field label="Emergency contact" error={errors.emergencyContact?.message} required><Input placeholder="Name · phone · email" {...register('emergencyContact')} /></Field></div><div className="flex gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-brand-900 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200 sm:col-span-2"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /><div><p className="text-xs font-semibold">Authorization-first by design</p><p className="mt-1 text-xs leading-5 opacity-75">A verified authorization document, approved scope, and ownership evidence are required before any scan can run.</p></div></div></div><div className="flex justify-end gap-3 border-t border-line bg-canvas/40 px-6 py-4"><Button type="button" variant="secondary" onClick={close}>Cancel</Button><Button type="submit" loading={isSubmitting}><CalendarDays className="h-4 w-4" />Create draft engagement</Button></div></form></Modal>;
}
