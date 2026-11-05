'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowRight, Download, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SeverityBadge, StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSkeleton } from '@/components/common/loading-skeleton';
import { PageHeader } from '@/components/common/page-header';
import { FindingForm } from './finding-form';
import { useFindings } from '@/hooks/use-findings';
import { downloadText } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

function csvCell(value: string | number | null) { const text = String(value ?? ''); const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; return `"${safe.replaceAll('"', '""')}"`; }
export function FindingsView() {
  const locale = useLocale();
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const findings = useFindings({ page, limit: 20, search: search || undefined, severity: severity === 'all' ? undefined : severity, status: status === 'all' ? undefined : status });
  const { toast } = useToast();
  const items = findings.data?.items ?? [];
  const exportCsv = () => {
    if (!items.length) { toast('There are no findings on this page to export', undefined, 'error'); return; }
    const rows = [['ID', 'Title', 'Severity', 'Status', 'Affected asset', 'CVSS', 'CWE', 'Created'], ...items.map((finding) => [finding.id, finding.title, finding.severity, finding.status, finding.affected_asset, finding.cvss_score, finding.cwe_id, finding.created_at])];
    downloadText('cyberops-findings.csv', rows.map((row) => row.map((cell) => csvCell(cell)).join(',')).join('\n'));
  };
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow="Risk management" title="Findings" description="Validate, prioritize, and track vulnerabilities from discovery through remediation." actions={<><Button variant="secondary" onClick={exportCsv}><Download className="h-4 w-4" />Export page CSV</Button><Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" />New finding</Button></>} /><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{(['critical', 'high', 'medium', 'low', 'informational'] as const).map((item) => <button key={item} onClick={() => { setSeverity(severity === item ? 'all' : item); setPage(1); }} className={cn('card p-4 text-start', severity === item && 'border-brand-500 ring-2 ring-brand-500/10')}><span className="text-[11px] font-medium capitalize text-muted">{item}</span><p className="mt-2 text-2xl font-semibold">{items.filter((finding) => finding.severity === item).length}</p><span className="text-[9px] text-muted">on this page</span></button>)}</div><Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row"><div className="relative flex-1"><Search className="absolute start-3 top-2.5 h-4 w-4 text-muted" /><input aria-label="Search findings" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search finding titles…" className="h-9 w-full rounded-lg border border-line bg-canvas/40 ps-9 pe-3 text-xs outline-none" /></div><select aria-label="Severity filter" value={severity} onChange={(event) => { setSeverity(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-line bg-surface px-3 text-xs"><option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="informational">Informational</option></select><select aria-label="Status filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-line bg-surface px-3 text-xs"><option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="retest">Retest</option><option value="fixed">Fixed</option><option value="accepted_risk">Accepted risk</option></select></div>{findings.isLoading ? <div className="p-5"><LoadingSkeleton rows={6} /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr className="table-head">{['Finding', 'Severity', 'Status', 'Affected asset', 'CWE', 'Discovered'].map((header) => <th key={header} className="px-5 py-3 text-start">{header}</th>)}<th /></tr></thead><tbody className="divide-y divide-line">{items.map((finding) => <tr key={finding.id} className="group hover:bg-canvas/60"><td className="table-cell max-w-[330px]"><Link href={`/${locale}/findings/${finding.id}`}><span className="block truncate text-xs font-semibold group-hover:text-brand-700">{finding.title}</span><span className="mt-1.5 block font-mono text-[10px] text-muted">{finding.id}</span></Link></td><td className="table-cell"><SeverityBadge severity={finding.severity} score={finding.cvss_score ?? undefined} /></td><td className="table-cell"><StatusBadge status={finding.status} /></td><td className="table-cell"><span className="block max-w-[180px] truncate font-mono text-[11px]">{finding.affected_asset}</span></td><td className="table-cell text-[11px] text-muted">{finding.cwe_id ?? '—'}</td><td className="table-cell whitespace-nowrap text-[11px] text-muted">{new Date(finding.created_at).toLocaleDateString()}</td><td className="px-3"><Link href={`/${locale}/findings/${finding.id}`} className="icon-button h-8 w-8"><ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link></td></tr>)}</tbody></table>{!items.length && <EmptyState title="No findings found" description={findings.isError ? 'The findings API could not be reached or no findings are accessible to your role.' : 'Validated scanner and manual findings will appear here.'} />}</div>}<div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted"><span>{findings.data?.pagination?.total ?? items.length} total findings</span><div className="flex gap-2"><Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="self-center">Page {page} / {Math.max(1, findings.data?.pagination?.pages ?? 1)}</span><Button variant="ghost" size="sm" disabled={page >= (findings.data?.pagination?.pages ?? 1)} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div></Card><FindingForm open={formOpen} onClose={() => setFormOpen(false)} /></div>;
}
