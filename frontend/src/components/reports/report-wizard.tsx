'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileBarChart, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/input';
import { useEngagements } from '@/hooks/use-engagements';
import { useGenerateReport } from '@/hooks/use-reports';
import { useToast } from '@/components/ui/toast';
import type { ApiReport } from '@/types/api';
import { cn } from '@/lib/utils';

export function ReportWizard({ open, onClose, initialEngagement = '' }: { open: boolean; onClose: () => void; initialEngagement?: string }) {
  const engagements = useEngagements({ limit: 100 });
  const generateReport = useGenerateReport();
  const [step, setStep] = useState(1);
  const [engagementId, setEngagementId] = useState(initialEngagement);
  const [reportType, setReportType] = useState<ApiReport['report_type']>('technical_report');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const { toast } = useToast();
  const selectedId = engagementId || engagements.data?.items[0]?.id || '';
  const close = () => { setStep(1); onClose(); };
  const generate = async () => {
    if (!selectedId) return;
    try { await generateReport.mutateAsync({ engagement_id: selectedId, report_type: reportType, language, format }); toast('Report queued successfully', 'The rendering worker will sanitize findings and store the protected artifact.'); close(); }
    catch (error) { toast('Report could not be queued', error instanceof Error ? error.message : undefined, 'error'); }
  };
  return <Modal open={open} onClose={close} title="Generate security report" description="Create a localized deliverable from persisted engagement data." size="lg"><div className="border-b border-line px-6 py-4"><div className="flex items-center">{[1, 2, 3].map((number) => <div key={number} className="flex flex-1 items-center last:flex-none"><span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold', step >= number ? 'bg-brand-600 text-white' : 'bg-canvas text-muted')}>{step > number ? <Check className="h-3.5 w-3.5" /> : number}</span><span className="ms-2 text-[11px] font-medium">{number === 1 ? 'Content' : number === 2 ? 'Format' : 'Review'}</span>{number < 3 && <span className="mx-3 h-px flex-1 bg-line" />}</div>)}</div></div><div className="min-h-[300px] space-y-5 p-6">{step === 1 && <><Field label="Source engagement" required><Select value={selectedId} onChange={(event) => setEngagementId(event.target.value)}><option value="">Select an engagement</option>{engagements.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Report type"><Select value={reportType} onChange={(event) => setReportType(event.target.value as ApiReport['report_type'])}><option value="executive_summary">Executive summary</option><option value="technical_report">Technical report</option><option value="remediation_plan">Remediation plan</option><option value="full">Full report</option></Select></Field></>}{step === 2 && <div className="grid gap-4 sm:grid-cols-2"><Field label="Language and direction"><Select value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'ar')}><option value="en">English · LTR</option><option value="ar">العربية · RTL</option></Select></Field><Field label="Output format"><Select value={format} onChange={(event) => setFormat(event.target.value as 'pdf' | 'docx')}><option value="pdf">PDF · print-ready</option><option value="docx">DOCX · editable</option></Select></Field></div>}{step === 3 && <div><dl className="grid gap-4 rounded-xl border border-line bg-canvas/40 p-5 text-xs sm:grid-cols-2"><div><dt className="text-muted">Engagement</dt><dd className="mt-1 font-semibold">{engagements.data?.items.find((item) => item.id === selectedId)?.name}</dd></div><div><dt className="text-muted">Type</dt><dd className="mt-1 font-semibold">{reportType.replaceAll('_', ' ')}</dd></div><div><dt className="text-muted">Language</dt><dd className="mt-1 font-semibold">{language === 'ar' ? 'Arabic · RTL' : 'English'}</dd></div><div><dt className="text-muted">Format</dt><dd className="mt-1 font-semibold uppercase">{format}</dd></div></dl><div className="mt-5 flex gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-950"><ShieldCheck className="h-5 w-5 shrink-0 text-brand-600" /><p className="text-[11px] leading-5">Evidence is sanitized before rendering. Downloads use short-lived signed URLs and client-safe authorization.</p></div></div>}</div><div className="flex justify-between border-t border-line bg-canvas/40 px-6 py-4"><Button variant="ghost" onClick={step === 1 ? close : () => setStep(step - 1)}>{step > 1 && <ArrowLeft className="h-4 w-4" />}{step === 1 ? 'Cancel' : 'Back'}</Button>{step < 3 ? <Button disabled={!selectedId} onClick={() => setStep(step + 1)}>Continue<ArrowRight className="h-4 w-4" /></Button> : <Button loading={generateReport.isPending} onClick={() => void generate()}><FileBarChart className="h-4 w-4" />Generate {format.toUpperCase()}</Button>}</div></Modal>;
}
