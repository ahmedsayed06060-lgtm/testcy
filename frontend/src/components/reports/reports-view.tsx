'use client';

import { useState } from 'react';
import { Download, FileBarChart, FileText, Globe2, Plus, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSkeleton } from '@/components/common/loading-skeleton';
import { ReportWizard } from './report-wizard';
import { useReports } from '@/hooks/use-reports';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

export function ReportsView({ initialEngagement = '', autoOpen = false }: { initialEngagement?: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const [search, setSearch] = useState('');
  const reports = useReports(initialEngagement || undefined);
  const { toast } = useToast();
  const filtered = (reports.data?.items ?? []).filter((report) => `${report.id} ${report.report_type} ${report.format}`.toLowerCase().includes(search.toLowerCase()));
  const download = async (id: string) => {
    try { const result = await api<{ download_url: string }>(`/reports/${id}/download`); window.open(result.download_url, '_blank', 'noopener,noreferrer'); }
    catch (error) { toast('Download unavailable', error instanceof Error ? error.message : undefined, 'error'); }
  };
  const items = reports.data?.items ?? [];
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow="Delivery & communication" title="Reports" description="Turn validated findings into localized executive, technical, and remediation deliverables." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Generate report</Button>} /><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><FileBarChart className="h-5 w-5 text-brand-600" /><p className="mt-3 text-2xl font-semibold">{reports.data?.pagination?.total ?? items.length}</p><p className="mt-1 text-xs text-muted">Persisted report artifacts</p></Card><Card className="p-5"><Globe2 className="h-5 w-5 text-violet-600" /><p className="mt-3 text-2xl font-semibold">{items.filter((item) => item.language === 'ar').length}</p><p className="mt-1 text-xs text-muted">Arabic RTL deliverables on this page</p></Card><Card className="p-5"><ShieldCheck className="h-5 w-5 text-blue-600" /><p className="mt-3 text-2xl font-semibold">Signed</p><p className="mt-1 text-xs text-muted">Short-lived authorized downloads</p></Card></div><Card className="overflow-hidden"><div className="flex items-center justify-between gap-4 border-b border-line p-4"><div><h2 className="text-sm font-semibold">Report library</h2><p className="mt-1 text-[11px] text-muted">Generated engagement deliverables</p></div><div className="relative w-full max-w-xs"><Search className="absolute start-3 top-2.5 h-4 w-4 text-muted" /><input aria-label="Search reports" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports…" className="h-9 w-full rounded-lg border border-line bg-canvas/40 ps-9 pe-3 text-xs outline-none focus:border-brand-500" /></div></div>{reports.isLoading ? <LoadingSkeleton rows={5} /> : <div className="divide-y divide-line">{filtered.map((report) => <div key={report.id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-canvas/50 sm:flex-row sm:items-center"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950"><FileText className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{report.report_type.replaceAll('_', ' ')}</p><p className="mt-1 font-mono text-[11px] text-muted">{report.id}</p></div><div className="flex items-center gap-2"><Badge variant={report.language === 'ar' ? 'purple' : 'info'}>{report.language === 'ar' ? 'العربية' : 'English'}</Badge><Badge>{report.format.toUpperCase()}</Badge></div><div className="min-w-[150px] text-[10px] text-muted"><p>{new Date(report.created_at).toLocaleString()}</p><p className="mt-1">{report.file_size ? `${(report.file_size / 1024).toFixed(1)} KB` : 'Rendering or unavailable'}</p></div><Button size="sm" variant="secondary" disabled={!report.file_path} onClick={() => void download(report.id)}><Download className="h-3.5 w-3.5" />Download</Button></div>)}{!filtered.length && <EmptyState title="No reports found" description={reports.isError ? 'The report service could not be reached. Check the API connection and your authorization.' : 'Generate a report from an authorized engagement to create a protected artifact.'} />}</div>}</Card><ReportWizard open={open} onClose={() => setOpen(false)} initialEngagement={initialEngagement} /></div>;
}
