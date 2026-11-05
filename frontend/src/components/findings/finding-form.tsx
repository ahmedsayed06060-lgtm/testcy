'use client';

import { useState } from 'react';
import { Bug } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { CVSSCalculator } from './cvss-calculator';
import { useEngagements } from '@/hooks/use-engagements';
import { useCreateFinding } from '@/hooks/use-findings';
import { useToast } from '@/components/ui/toast';

const initial = { title: '', engagementId: '', asset: '', severity: 'medium', cvss: '5.0', cvssVector: '', cwe: '', description: '', businessImpact: '', remediation: '', evidence: '' };
export function FindingForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [values, setValues] = useState(initial);
  const engagements = useEngagements({ limit: 100 });
  const create = useCreateFinding();
  const { toast } = useToast();
  const set = (key: keyof typeof initial, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const engagementId = values.engagementId || engagements.data?.items[0]?.id || '';
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const score = Number(values.cvss);
    if (!engagementId || !Number.isFinite(score) || score < 0 || score > 10) { toast('Check the engagement and CVSS score', undefined, 'error'); return; }
    try { await create.mutateAsync({ engagement_id: engagementId, title: values.title, affected_asset: values.asset, severity: values.severity, description: values.description, business_impact: values.businessImpact || undefined, remediation: values.remediation || undefined, evidence: values.evidence || undefined, cvss_score: score, cvss_vector: values.cvssVector || undefined, cwe_id: values.cwe || undefined, tags: ['manual'] }); toast('Finding recorded', 'Sanitized content is linked to the engagement audit trail.'); setValues(initial); onClose(); }
    catch (error) { toast('Finding could not be saved', error instanceof Error ? error.message : undefined, 'error'); }
  };
  return <Modal open={open} onClose={onClose} title="Record a manual finding" description="Document validated risk with actionable remediation guidance." size="xl"><form onSubmit={(event) => void submit(event)}><div className="grid max-h-[62vh] gap-5 overflow-y-auto p-6 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Finding title" required><Input required minLength={3} value={values.title} onChange={(event) => set('title', event.target.value)} /></Field></div><Field label="Engagement" required><Select required value={engagementId} onChange={(event) => set('engagementId', event.target.value)}><option value="">Select an engagement</option>{engagements.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Affected asset" required><Input required value={values.asset} onChange={(event) => set('asset', event.target.value)} /></Field><Field label="Severity" required><Select value={values.severity} onChange={(event) => set('severity', event.target.value)}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="informational">Informational</option></Select></Field><Field label="CVSS score"><Input required type="number" step="0.1" min="0" max="10" value={values.cvss} onChange={(event) => set('cvss', event.target.value)} /></Field><Field label="CWE identifier"><Input value={values.cwe} onChange={(event) => set('cwe', event.target.value)} placeholder="CWE-79" /></Field><Field label="CVSS vector"><Input className="font-mono text-xs" value={values.cvssVector} onChange={(event) => set('cvssVector', event.target.value)} /></Field><div className="sm:col-span-2"><CVSSCalculator initialVector={values.cvssVector || undefined} onCalculated={(score) => set('cvss', score.toFixed(1))} /></div><div className="sm:col-span-2"><Field label="Technical description" required><Textarea required minLength={3} value={values.description} onChange={(event) => set('description', event.target.value)} /></Field></div><div className="sm:col-span-2"><Field label="Business impact"><Textarea value={values.businessImpact} onChange={(event) => set('businessImpact', event.target.value)} /></Field></div><div className="sm:col-span-2"><Field label="Evidence summary"><Textarea value={values.evidence} onChange={(event) => set('evidence', event.target.value)} /></Field></div><div className="sm:col-span-2"><Field label="Remediation"><Textarea value={values.remediation} onChange={(event) => set('remediation', event.target.value)} /></Field></div></div><div className="flex justify-end gap-3 border-t border-line bg-canvas/40 px-6 py-4"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={create.isPending}><Bug className="h-4 w-4" />Save finding</Button></div></form></Modal>;
}
