import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowDownRight, ArrowUpRight, BriefcaseBusiness, Bug, FileBarChart, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { key: 'activeEngagements', value: '12', change: '+2', note: 'this month', trend: 'up', icon: BriefcaseBusiness, color: 'text-brand-600 bg-brand-50 dark:bg-brand-950', href: '/engagements', path: 'M0 25 C8 24,9 18,17 19 S29 23,35 16 S46 11,51 14 S63 9,72 5' },
  { key: 'openFindings', value: '148', change: '+8.2%', note: 'vs last week', trend: 'up', icon: Bug, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950', href: '/findings', path: 'M0 25 C8 24,10 21,17 22 S27 14,35 18 S46 8,53 12 S65 6,72 8' },
  { key: 'criticalExposures', value: '7', change: '-3', note: 'resolved this week', trend: 'down', icon: ShieldAlert, color: 'text-red-600 bg-red-50 dark:bg-red-950', href: '/findings?severity=critical', path: 'M0 7 C8 8,11 5,18 11 S29 12,35 17 S47 15,53 21 S64 21,72 25' },
  { key: 'reportsGenerated', value: '24', change: '+5', note: 'this week', trend: 'up', icon: FileBarChart, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950', href: '/reports', path: 'M0 24 C7 22,10 24,17 19 S29 22,36 14 S45 17,52 10 S64 13,72 4' },
];

export function StatsCards({ labels }: { labels: Record<string, string> }) {
  const locale = useLocale();
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map((item, index) => <Link key={item.key} href={`/${locale}${item.href}`} className="card group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift" style={{ animationDelay: `${index * 50}ms` }}><div className="flex items-start justify-between"><span className={cn('flex h-10 w-10 items-center justify-center rounded-[10px]', item.color)}><item.icon className="h-[19px] w-[19px]" strokeWidth={1.8} /></span><span className={cn('flex items-center gap-0.5 text-[11px] font-semibold', item.trend === 'down' ? 'text-emerald-600' : item.key === 'openFindings' ? 'text-orange-600' : 'text-emerald-600')}>{item.trend === 'down' ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}{item.change}</span></div><div className="mt-4 flex items-end justify-between gap-2"><div><p className="text-[28px] font-semibold leading-none tracking-[-0.04em]">{item.value}</p><p className="mt-2 text-xs font-medium text-muted">{labels[item.key]}</p></div><svg viewBox="0 0 72 30" className={cn('h-8 w-[72px] overflow-visible', item.key === 'criticalExposures' ? 'text-red-400' : 'text-brand-500')} fill="none" aria-hidden="true"><path d={`${item.path} L72 30 L0 30 Z`} fill="currentColor" opacity=".07" /><path d={item.path} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></div><p className="mt-2 text-[10px] text-muted/80">{item.note}</p></Link>)}</div>;
}
