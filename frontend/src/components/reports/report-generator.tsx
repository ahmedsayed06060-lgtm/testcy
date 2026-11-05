'use client';

import { useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/input';
import { useGenerateReport } from '@/hooks/use-reports';
import { useToast } from '@/components/ui/toast';
import type { ApiReport } from '@/types/api';

export function ReportGenerator({ engagementId, onCreated }: { engagementId: string; onCreated?: (report: ApiReport) => void }) {
  const [reportType, setReportType] = useState<ApiReport['report_type']>('executive_summary');
  const [format, setFormat] = useState<ApiReport['format']>('pdf');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const mutation = useGenerateReport();
  const { toast } = useToast();
  const generate = async () => { try { const report = await mutation.mutateAsync({ engagement_id: engagementId, report_type: reportType, format, language }); onCreated?.(report); toast('Report queued', 'The worker will render sanitized, localized engagement data.'); } catch (error) { toast('Report could not be queued', error instanceof Error ? error.message : undefined, 'error'); } };
  return <div className="grid gap-4 sm:grid-cols-3"><Field label="Report type"><Select value={reportType} onChange={(event) => setReportType(event.target.value as ApiReport['report_type'])}><option value="executive_summary">Executive</option><option value="technical_report">Technical</option><option value="remediation_plan">Remediation plan</option><option value="full">Full</option></Select></Field><Field label="Format"><Select value={format} onChange={(event) => setFormat(event.target.value as ApiReport['format'])}><option value="pdf">PDF</option><option value="docx">DOCX</option></Select></Field><Field label="Language"><Select value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'ar')}><option value="en">English</option><option value="ar">العربية (RTL)</option></Select></Field><Button className="sm:col-span-3" loading={mutation.isPending} onClick={() => void generate()}><FileBarChart className="h-4 w-4" />Generate report</Button></div>;
}
