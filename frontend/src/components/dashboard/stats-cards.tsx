'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { BriefcaseBusiness, Bug, FileBarChart, ShieldAlert } from 'lucide-react';
import { useDashboardStats } from '@/hooks/use-dashboard';
import { useReports } from '@/hooks/use-reports';
import { cn } from '@/lib/utils';

export function StatsCards({ labels }: { labels: Record<string, string> }) {
  const locale = useLocale();
  const stats = useDashboardStats();
  const reports = useReports();
  const items = [
    { key: 'activeEngagements', value: stats.data?.active_engagements, icon: BriefcaseBusiness, color: 'text-brand-600 bg-brand-50 dark:bg-brand-950', href: '/engagements' },
    { key: 'openFindings', value: stats.data?.open_findings, icon: Bug, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950', href: '/findings' },
    { key: 'criticalExposures', value: stats.data?.severity.critical, icon: ShieldAlert, color: 'text-red-600 bg-red-50 dark:bg-red-950', href: '/findings?severity=critical' },
    { key: 'reportsGenerated', value: reports.data?.pagination?.total, icon: FileBarChart, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950', href: '/reports' },
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <Link key={item.key} href={`/${locale}${item.href}`} className="card group p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"><span className={cn('flex h-10 w-10 items-center justify-center rounded-[10px]', item.color)}><item.icon className="h-[19px] w-[19px]" strokeWidth={1.8} /></span><p className="mt-4 text-[28px] font-semibold leading-none tracking-[-0.04em]">{item.value ?? '—'}</p><p className="mt-2 text-xs font-medium text-muted">{labels[item.key]}</p><p className="mt-3 border-t border-line pt-3 text-[10px] text-muted">Live tenant-scoped API data</p></Link>)}</div>;
}
