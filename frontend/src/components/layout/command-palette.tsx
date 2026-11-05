'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { BriefcaseBusiness, Bug, FileBarChart, LayoutDashboard, Search, ScanSearch, X } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useEngagements } from '@/hooks/use-engagements';
import { useFindings } from '@/hooks/use-findings';

const pages = [
  { title: 'Security overview', href: '/dashboard', icon: LayoutDashboard, keywords: 'home dashboard stats' },
  { title: 'All engagements', href: '/engagements', icon: BriefcaseBusiness, keywords: 'clients projects' },
  { title: 'All findings', href: '/findings', icon: Bug, keywords: 'vulnerabilities issues' },
  { title: 'Authorized scan jobs', href: '/jobs', icon: ScanSearch, keywords: 'nmap nuclei zap' },
  { title: 'Reports', href: '/reports', icon: FileBarChart, keywords: 'pdf executive' },
];

export function CommandPalette() {
  const locale = useLocale();
  const { commandOpen, setCommandOpen } = useUIStore();
  const engagementsQuery = useEngagements({ limit: 100 });
  const findingsQuery = useFindings({ limit: 100 });
  const engagements = useMemo(() => engagementsQuery.data?.items ?? [], [engagementsQuery.data]);
  const findings = useMemo(() => findingsQuery.data?.items ?? [], [findingsQuery.data]);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(!commandOpen); }
      if (event.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [commandOpen, setCommandOpen]);
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const pageResults = pages.filter((page) => !q || `${page.title} ${page.keywords}`.toLowerCase().includes(q)).map((page) => ({ ...page, subtitle: 'Page' }));
    if (!q) return pageResults;
    const engagementResults = engagements.filter((item) => `${item.name} ${item.type}`.toLowerCase().includes(q)).slice(0, 4).map((item) => ({ title: item.name, subtitle: item.type.replaceAll('_', ' '), href: `/engagements/${item.id}`, icon: BriefcaseBusiness }));
    const findingResults = findings.filter((item) => `${item.id} ${item.title} ${item.affected_asset}`.toLowerCase().includes(q)).slice(0, 4).map((item) => ({ title: item.title, subtitle: `${item.id} · ${item.affected_asset}`, href: `/findings/${item.id}`, icon: Bug }));
    return [...pageResults, ...engagementResults, ...findingResults];
  }, [query, engagements, findings]);
  if (!commandOpen) return null;
  return <div className="fixed inset-0 z-[90] flex items-start justify-center bg-navy-950/45 px-4 pt-[12vh] backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}><div role="dialog" aria-modal="true" aria-label="Global search" className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-lift animate-fade-up"><div className="flex items-center gap-3 border-b border-line px-4"><Search className="h-5 w-5 text-muted" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages, engagements, findings…" className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" /><button className="icon-button h-7 w-7" onClick={() => setCommandOpen(false)}><X className="h-4 w-4" /></button></div><div className="max-h-[420px] overflow-y-auto p-2">{results.length ? results.map((result, index) => <Link key={`${result.href}-${index}`} href={`/${locale}${result.href}`} onClick={() => setCommandOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-canvas"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted"><result.icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-medium">{result.title}</span><span className="mt-0.5 block truncate text-xs text-muted">{result.subtitle}</span></span></Link>) : <div className="px-4 py-12 text-center"><Search className="mx-auto h-7 w-7 text-muted/50" /><p className="mt-3 text-sm font-medium">No results found</p><p className="mt-1 text-xs text-muted">Try a client name, finding ID, or page.</p></div>}</div><div className="flex items-center gap-4 border-t border-line bg-canvas/50 px-4 py-2.5 text-[10px] text-muted"><span><kbd className="me-1 rounded border bg-surface px-1">↵</kbd>Open</span><span><kbd className="me-1 rounded border bg-surface px-1">esc</kbd>Close</span></div></div></div>;
}
