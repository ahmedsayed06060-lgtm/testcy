'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { CalendarDays, Download, FileText, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, SeverityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from './page-header';
import { ErrorState } from './query-state';
import { useEngagement, useEngagements } from '@/hooks/use-engagements';
import { useFindings } from '@/hooks/use-findings';
import { downloadReport, useReports } from '@/hooks/use-reports';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

function PortalEngagementDetail({ id }: { id: string }) {
  const engagement = useEngagement(id); const findings = useFindings({ engagement_id: id, limit: 100 });
  if (!engagement.data) return <><ErrorState error={engagement.error} /><p className="text-sm text-muted">{engagement.isLoading ? 'Loading engagement…' : 'Engagement not found or not assigned to your client.'}</p></>;
  const item = engagement.data;
  return <div className="space-y-6"><PageHeader title={item.name} description={'Authorized security assessment'} actions={<StatusBadge status={item.status} />} /><Card><CardContent><div className="grid gap-4 sm:grid-cols-3"><div><CalendarDays className="h-4 w-4 text-muted" /><p className="mt-2 text-xs font-semibold">{formatDate(item.start_date)}</p><p className="text-[10px] text-muted">Testing started</p></div><div><CalendarDays className="h-4 w-4 text-muted" /><p className="mt-2 text-xs font-semibold">{formatDate(item.end_date)}</p><p className="text-[10px] text-muted">Testing ends</p></div><div><ShieldCheck className="h-4 w-4 text-brand-600" /><p className="mt-2 text-xs font-semibold">Server authorized</p><p className="text-[10px] text-muted">Client-safe engagement view</p></div></div></CardContent></Card><Card><CardContent><h2 className="text-sm font-semibold">Findings summary</h2><p className="mt-1 text-xs text-muted">Detailed evidence and raw tool output are never exposed to client accounts.</p><ErrorState error={findings.error} /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{Object.entries((findings.data?.items ?? []).reduce<Record<string, number>>((counts, finding) => { counts[finding.severity] = (counts[finding.severity] ?? 0) + 1; return counts; }, {})).map(([severity, count]) => <div key={severity} className="rounded-lg border border-line p-3"><SeverityBadge severity={severity} /><p className="mt-2 text-xl font-semibold">{count}</p></div>)}</div></CardContent></Card></div>;
}

export function ClientPortalView({ section = 'engagements', id }: { section?: 'engagements' | 'reports'; id?: string }) {
  const locale = useLocale(); const user = useAuthStore((state) => state.user); const engagements = useEngagements({ limit: 100 }); const reports = useReports(); const findings = useFindings({ limit: 100 });
  if (id) return <PortalEngagementDetail id={id} />;
  const items = engagements.data?.items ?? [];
  return <div className="space-y-6"><PageHeader eyebrow={user?.client_id ? `Client ${user.client_id}` : 'Client workspace'} title={section === 'reports' ? 'Your security reports' : 'Your security engagements'} description="Track authorized assessments, risk summaries, and final deliverables." /><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><p className="text-2xl font-semibold">{engagements.data?.pagination?.total ?? 0}</p><p className="mt-1 text-xs text-muted">Total engagements</p></Card><Card className="p-5"><p className="text-2xl font-semibold">{findings.data?.items.filter((item) => !['verified_fixed', 'closed', 'accepted_risk'].includes(item.status)).length ?? 0}</p><p className="mt-1 text-xs text-muted">Open findings in loaded results</p></Card><Card className="p-5"><p className="text-2xl font-semibold">{reports.data?.pagination?.total ?? 0}</p><p className="mt-1 text-xs text-muted">Available reports</p></Card></div><ErrorState error={engagements.error || reports.error || findings.error} />{section === 'engagements' ? <div className="space-y-4">{items.map((engagement) => <Link key={engagement.id} href={`/${locale}/client-portal/engagements/${engagement.id}`}><Card className="p-5 transition hover:border-brand-300"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">{engagement.name}</h2><p className="mt-1 text-xs text-muted">{engagement.type.replace('_', ' ')}</p></div><StatusBadge status={engagement.status} /></div><div className="mt-3 flex justify-between text-[10px] text-muted"><span>{formatDate(engagement.start_date)} — {formatDate(engagement.end_date)}</span><span>{engagement.emergency_contact_name}</span></div></Card></Link>)}</div> : <Card className="overflow-hidden"><div className="divide-y divide-line">{reports.data?.items.map((report) => <div key={report.id} className="flex items-center gap-4 p-5"><FileText className="h-6 w-6 text-red-500" /><div className="flex-1"><p className="text-xs font-semibold">{report.report_type.replaceAll('_', ' ')}</p><p className="mt-1 text-[10px] text-muted">{formatDate(report.created_at)} · {report.language.toUpperCase()} · {report.format.toUpperCase()}</p></div><Button size="sm" variant="secondary" onClick={() => void downloadReport(report)}><Download className="h-3.5 w-3.5" />Download</Button></div>)}</div></Card>}</div>;
}
