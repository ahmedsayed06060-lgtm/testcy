'use client';

import { useState } from 'react';
import { Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { useCreateCampaign, useLaunchCampaign } from '@/hooks/use-social';
import { useToast } from '@/components/ui/toast';

const safeTemplate = '<main><h1>Security awareness review</h1><p>This is an authorized simulation. Review the message and report suspicious requests to your security team.</p></main>';
const safeTraining = '<section><h2>Awareness guidance</h2><p>Verify unexpected requests through a trusted channel. This exercise never asks for a password or other credentials.</p></section>';

export function CampaignWizard({ engagementId }: { engagementId: string }) {
  const [step, setStep] = useState(1);
  const [campaignId, setCampaignId] = useState('');
  const [form, setForm] = useState({ name: '', approval_doc_id: '', subject_line: '', sender_name: '', sender_email: '', recipients: '', template_html: safeTemplate });
  const create = useCreateCampaign();
  const launch = useLaunchCampaign(campaignId);
  const { toast } = useToast();
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    const targets = form.recipients.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => { const [email, department] = line.split(',').map((value) => value.trim()); return { email: email!, department: department || 'Unassigned' }; });
    try { const campaign = await create.mutateAsync({ engagement_id: engagementId, name: form.name, approval_doc_id: form.approval_doc_id, targets, subject_line: form.subject_line, sender_name: form.sender_name, sender_email: form.sender_email, template_html: form.template_html, landing_page_html: safeTraining, training_page_html: safeTraining }); setCampaignId(campaign.id); setStep(3); }
    catch (error) { toast('Campaign could not be created', error instanceof Error ? error.message : undefined, 'error'); }
  };
  const start = async () => { try { await launch.mutateAsync(); toast('Campaign queued', 'The worker revalidates authorization and recipient eligibility before delivery.'); } catch (error) { toast('Campaign could not launch', error instanceof Error ? error.message : undefined, 'error'); } };
  return <div className="space-y-5"><ol className="flex gap-2 text-xs">{['Configuration', 'Recipients', 'Review'].map((label, index) => <li key={label} className={`rounded-full px-3 py-1 ${step === index + 1 ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950' : 'text-muted'}`}>{index + 1}. {label}</li>)}</ol>{step === 1 && <div className="grid gap-4 sm:grid-cols-2"><Field label="Campaign name" required><Input required value={form.name} onChange={(event) => set('name', event.target.value)} /></Field><Field label="Approved phishing document ID" required><Input required value={form.approval_doc_id} onChange={(event) => set('approval_doc_id', event.target.value)} /></Field><Field label="Subject" required><Input required value={form.subject_line} onChange={(event) => set('subject_line', event.target.value)} /></Field><Field label="Sender name" required><Input required value={form.sender_name} onChange={(event) => set('sender_name', event.target.value)} /></Field><div className="sm:col-span-2"><Field label="Authorized sender email" required hint="The backend validates this address against the approved employee/email scope."><Input required type="email" value={form.sender_email} onChange={(event) => set('sender_email', event.target.value)} /></Field></div><div className="sm:col-span-2"><Field label="Awareness email HTML" required hint="Forms, password fields, and credential collection are rejected by the server."><Textarea required className="font-mono text-xs" value={form.template_html} onChange={(event) => set('template_html', event.target.value)} /></Field></div><Button className="sm:col-span-2" disabled={!form.name || !form.approval_doc_id || !form.subject_line || !form.sender_email} onClick={() => setStep(2)}>Continue</Button></div>}{step === 2 && <div className="space-y-4"><Field label="Authorized recipients" required hint="CSV rows: email, department. Every address must pass employee/contractor authorization."><Textarea required value={form.recipients} onChange={(event) => set('recipients', event.target.value)} placeholder="person@example.com,Engineering" /></Field><div className="flex justify-between"><Button variant="secondary" onClick={() => setStep(1)}>Back</Button><Button disabled={!form.recipients.trim()} loading={create.isPending} onClick={() => void save()}>Validate and create campaign</Button></div></div>}{step === 3 && <div className="space-y-4"><div className="flex gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-xs leading-5 dark:border-brand-900 dark:bg-brand-950"><ShieldCheck className="h-5 w-5 shrink-0 text-brand-600" />This simulation provides awareness and reporting education. It never collects passwords or other credentials. API and worker authorization checks remain mandatory.</div><Button loading={launch.isPending} onClick={() => void start()}><Send className="h-4 w-4" />Launch authorized simulation</Button></div>}</div>;
}
