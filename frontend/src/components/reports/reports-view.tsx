'use client';

import { useEffect, useState } from 'react';
import { FileBarChart, FileText, Globe2, Plus, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/page-header';
import { ReportWizard } from './report-wizard';
import { useOpsStore } from '@/stores/ops-store';
import { downloadText } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

export function ReportsView({ initialEngagement, autoOpen = false }: { initialEngagement?: string; autoOpen?: boolean }) {
  const reports = useOpsStore((state) => state.reports);
  const [open, setOpen] = useState(autoOpen);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  useEffect(() => { if (autoOpen) setOpen(true); }, [autoOpen]);
  const filtered = reports.filter((report) => `${report.name} ${report.client} ${report.id}`.toLowerCase().includes(search.toLowerCase()));
  const download = (report: typeof reports[number]) => {
    const html = `<!doctype html><html lang="${report.language === 'Arabic' ? 'ar' : 'en'}" dir="${report.language === 'Arabic' ? 'rtl' : 'ltr'}"><meta charset="utf-8"><title>${report.name}</title><style>body{font-family:system-ui;max-width:800px;margin:60px auto;color:#142235}h1{color:#0b8674}section{border-top:1px solid #ddd;padding:20px 0}</style><h1>${report.name}</h1><p>${report.client} · ${report.type}</p><section><h2>Security summary</h2><p>This demonstration artifact was generated from the local CyberOps Hub workspace. Connect the FastAPI reporting worker for signed PDF and DOCX production artifacts.</p></section><section><h2>Authorization</h2><p>All included evidence originated from an approved engagement and verified scope.</p></section></html>`;
    downloadText(`${report.id}.html`, html, 'text/html'); toast('Demonstration report downloaded', 'Production PDF/DOCX rendering is provided by the backend reporting worker.');
  };
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow="Delivery & communication" title="Reports" description="Turn validated findings into clear executive, technical, and remediation deliverables." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Generate report</Button>} /><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><FileBarChart className="h-5 w-5 text-brand-600" /><p className="mt-3 text-2xl font-semibold">24</p><p className="mt-1 text-xs text-muted">Reports generated this month</p></Card><Card className="p-5"><Globe2 className="h-5 w-5 text-violet-600" /><p className="mt-3 text-2xl font-semibold">8</p><p className="mt-1 text-xs text-muted">Arabic RTL deliverables</p></Card><Card className="p-5"><ShieldCheck className="h-5 w-5 text-blue-600" /><p className="mt-3 text-2xl font-semibold">100%</p><p className="mt-1 text-xs text-muted">Protected by signed download URLs</p></Card></div><Card className="overflow-hidden"><div className="flex items-center justify-between gap-4 border-b border-line p-4"><div><h2 className="text-sm font-semibold">Report library</h2><p className="mt-1 text-[11px] text-muted">Generated engagement deliverables</p></div><div className="relative w-full max-w-xs"><Search className="absolute start-3 top-2.5 h-4 w-4 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports…" className="h-9 w-full rounded-lg border border-line bg-canvas/40 ps-9 pe-3 text-xs outline-none focus:border-brand-500" /></div></div><div className="divide-y divide-line">{filtered.map((report) => <div key={report.id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-canvas/50 sm:flex-row sm:items-center"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950"><FileText className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{report.name}</p><p className="mt-1 text-[11px] text-muted">{report.client} · {report.id}</p></div><div className="hidden xl:block"><Badge>{report.type}</Badge></div><div className="flex items-center gap-2"><Badge variant={report.language === 'Arabic' ? 'purple' : 'info'}>{report.language}</Badge><Badge>{report.format}</Badge></div><div className="min-w-[150px] text-[10px] text-muted"><p>{report.created}</p><p className="mt-1">{report.size} · {report.author}</p></div><Button size="sm" variant="secondary" onClick={() => download(report)}>Download</Button></div>)}</div></Card><ReportWizard open={open} onClose={() => setOpen(false)} initialEngagement={initialEngagement} /></div>;
}
