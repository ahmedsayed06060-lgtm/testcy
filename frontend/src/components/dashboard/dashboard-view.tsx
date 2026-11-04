'use client';

import { useTranslations } from 'next-intl';
import { CalendarDays, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/common/page-header';
import { StatsCards } from './stats-cards';
import { AuthorizationBanner } from './authorization-banner';
import { TrendChart } from './trend-chart';
import { SeverityChart } from './severity-chart';
import { LiveOperations } from './live-operations';
import { RecentActivity } from './recent-activity';
import { EngagementTable } from '@/components/engagements/engagement-table';
import { useUIStore } from '@/stores/ui-store';

export function DashboardView() {
  const t = useTranslations('dashboard');
  const common = useTranslations('common');
  const openEngagementForm = useUIStore((state) => state.setEngagementFormOpen);
  const labels = {
    activeEngagements: t('activeEngagements'), openFindings: t('openFindings'),
    criticalExposures: t('criticalExposures'), reportsGenerated: t('reportsGenerated'),
  };
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('subtitle')} actions={<><div className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-muted"><CalendarDays className="h-4 w-4" />{t('period')}</div><Button onClick={() => openEngagementForm(true)}><Plus className="h-4 w-4" />{common('newEngagement')}</Button></>} /><AuthorizationBanner title={t('controls')} text={t('controlsText')} linkLabel={t('viewControls')} /><StatsCards labels={labels} /><div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.75fr)]"><TrendChart title={t('trends')} description={t('trendsText')} /><SeverityChart title={t('severity')} description={t('severityText')} /></div><div className="grid min-w-0 items-start gap-6 2xl:grid-cols-[minmax(0,1.75fr)_minmax(330px,.7fr)]"><EngagementTable compact title={t('engagementsTitle')} description={t('engagementsText')} /><Card className="overflow-hidden"><CardHeader><div><CardTitle className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse-soft rounded-full bg-brand-500" />{t('operations')}</CardTitle><CardDescription>{t('operationsText')}</CardDescription></div></CardHeader><LiveOperations /></Card></div><div className="grid gap-6 xl:grid-cols-2"><Card className="overflow-hidden"><CardHeader><CardTitle>{t('activity')}</CardTitle></CardHeader><RecentActivity /></Card><Card className="relative overflow-hidden border-navy-800 bg-navy-950 p-6 text-white"><div className="absolute -end-12 -top-12 h-52 w-52 rounded-full bg-brand-500/10 blur-3xl" /><div className="relative flex h-full flex-col justify-between gap-6"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-brand-400">Security posture</p><h2 className="mt-3 text-xl font-semibold tracking-tight">Keep evidence connected<br />to every decision.</h2><p className="mt-3 max-w-md text-xs leading-6 text-slate-400">From signed scope to remediation, CyberOps Hub preserves a complete, immutable chain of authorization and action.</p></div><div className="grid grid-cols-3 gap-3">{[['100%', 'Jobs gated'], ['256-bit', 'Encryption'], ['24/7', 'Audit trail']].map(([value, label]) => <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3"><p className="text-base font-semibold text-brand-300">{value}</p><p className="mt-1 text-[9px] text-slate-500">{label}</p></div>)}</div></div></Card></div></div>;
}
