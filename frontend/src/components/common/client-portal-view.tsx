'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { CalendarDays, Download, FileText, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, SeverityBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { PageHeader } from './page-header';
import { useOpsStore } from '@/stores/ops-store';
import { downloadText } from '@/lib/utils';

export function ClientPortalView({ section = 'engagements', id }: { section?: 'engagements' | 'reports'; id?: string }) {
  const locale = useLocale();
  const { engagements, reports } = useOpsStore();
  const clientEngagements = engagements.filter((item) => item.client === 'Acme Corporation');
  const clientReports = reports.filter((item) => item.client === 'Acme Corporation');
  if (id) {
    const engagement = clientEngagements.find((item) => item.id === id);
    if (!engagement) return <p>Engagement not found.</p>;
    return <div className="space-y-6"><PageHeader title={engagement.name} description={engagement.description} actions={<StatusBadge status={engagement.status} />} /><Card><CardContent><div className="flex justify-between text-xs"><span className="font-medium">Assessment progress</span><span>{engagement.progress}%</span></div><Progress value={engagement.progress} className="mt-3" /><div className="mt-6 grid gap-4 sm:grid-cols-3"><div><CalendarDays className="h-4 w-4 text-muted" /><p className="mt-2 text-xs font-semibold">{engagement.startDate}</p><p className="text-[10px] text-muted">Testing started</p></div><div><CalendarDays className="h-4 w-4 text-muted" /><p className="mt-2 text-xs font-semibold">{engagement.endDate}</p><p className="text-[10px] text-muted">Testing ends</p></div><div><ShieldCheck className="h-4 w-4 text-brand-600" /><p className="mt-2 text-xs font-semibold">Verified</p><p className="text-[10px] text-muted">Authorization status</p></div></div></CardContent></Card><Card><CardContent><h2 className="text-sm font-semibold">Findings summary</h2><p className="mt-1 text-xs text-muted">Detailed evidence and raw tool output are available to your security contact.</p><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{Object.entries(engagement.findings).map(([severity, count]) => <div key={severity} className="rounded-lg border border-line p-3"><SeverityBadge severity={severity} /><p className="mt-2 text-xl font-semibold">{count}</p></div>)}</div></CardContent></Card></div>;
  }
  return <div className="space-y-6"><PageHeader eyebrow="Acme Corporation" title={section === 'reports' ? 'Your security reports' : 'Your security engagements'} description="Track authorized assessments, risk summaries, and final deliverables." /><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><p className="text-2xl font-semibold">{clientEngagements.length}</p><p className="mt-1 text-xs text-muted">Total engagements</p></Card><Card className="p-5"><p className="text-2xl font-semibold">28</p><p className="mt-1 text-xs text-muted">Open findings</p></Card><Card className="p-5"><p className="text-2xl font-semibold">{clientReports.length}</p><p className="mt-1 text-xs text-muted">Available reports</p></Card></div>{section === 'engagements' ? <div className="space-y-4">{clientEngagements.map((engagement) => <Link key={engagement.id} href={`/${locale}/client-portal/engagements/${engagement.id}`}><Card className="p-5 transition hover:border-brand-300"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">{engagement.name}</h2><p className="mt-1 text-xs text-muted">{engagement.type} · {engagement.scopeCount} authorized assets</p></div><StatusBadge status={engagement.status} /></div><Progress value={engagement.progress} className="mt-4" /><div className="mt-3 flex justify-between text-[10px] text-muted"><span>{engagement.startDate} — {engagement.endDate}</span><span>{engagement.progress}% complete</span></div></Card></Link>)}</div> : <Card className="overflow-hidden"><div className="divide-y divide-line">{clientReports.map((report) => <div key={report.id} className="flex items-center gap-4 p-5"><FileText className="h-6 w-6 text-red-500" /><div className="flex-1"><p className="text-xs font-semibold">{report.name}</p><p className="mt-1 text-[10px] text-muted">{report.created} · {report.format} · {report.size}</p></div><Button size="sm" variant="secondary" onClick={() => downloadText(`${report.id}.txt`, `${report.name}\n${report.client}\n${report.type}`)}><Download className="h-3.5 w-3.5" />Download</Button></div>)}</div></Card>}</div>;
}
