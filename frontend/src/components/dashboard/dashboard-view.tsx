'use client';

import { useLocale, useTranslations } from 'next-intl';
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
import { RecentFindings } from './recent-findings';
import { EngagementTable } from '@/components/engagements/engagement-table';
import { useFindings } from '@/hooks/use-findings';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';

export function DashboardView() {
  const t = useTranslations('dashboard');
  const common = useTranslations('common');
  const locale = useLocale();
  const openEngagementForm = useUIStore((state) => state.setEngagementFormOpen);
  const findings = useFindings({ limit: 6 });
  const user = useAuthStore((state) => state.user);
  const labels = { activeEngagements: t('activeEngagements'), openFindings: t('openFindings'), criticalExposures: t('criticalExposures'), reportsGenerated: t('reportsGenerated') };
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow={t('eyebrow')} title={t('title', { name: user?.full_name.split(' ')[0] ?? (locale === 'ar' ? 'فريق الأمن' : 'security team') })} description={t('subtitle')} actions={<><div className="flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs text-muted"><CalendarDays className="h-4 w-4" />{t('period')}</div><Button onClick={() => openEngagementForm(true)}><Plus className="h-4 w-4" />{common('newEngagement')}</Button></>} /><AuthorizationBanner title={t('controls')} text={t('controlsText')} linkLabel={t('viewControls')} /><StatsCards labels={labels} /><div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.75fr)]"><TrendChart title={t('trends')} description={t('trendsText')} /><SeverityChart title={t('severity')} description={t('severityText')} /></div><div className="grid min-w-0 items-start gap-6 2xl:grid-cols-[minmax(0,1.75fr)_minmax(330px,.7fr)]"><EngagementTable compact title={t('engagementsTitle')} description={t('engagementsText')} /><Card className="overflow-hidden"><CardHeader><div><CardTitle>{t('operations')}</CardTitle><CardDescription>{t('operationsText')}</CardDescription></div></CardHeader><LiveOperations /></Card></div><div className="grid gap-6 xl:grid-cols-2"><Card className="overflow-hidden"><CardHeader><CardTitle>{t('activity')}</CardTitle></CardHeader><RecentActivity /></Card><Card className="overflow-hidden"><CardHeader><CardTitle>Recent findings</CardTitle></CardHeader><div className="px-5 pb-5"><RecentFindings findings={findings.data?.items ?? []} locale={locale} /></div></Card></div><Card className="border-navy-800 bg-navy-950 p-6 text-white"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-brand-400">Security posture</p><h2 className="mt-3 text-xl font-semibold">Keep evidence connected to every decision.</h2><p className="mt-3 max-w-3xl text-xs leading-6 text-slate-400">From signed scope to remediation, CyberOps Hub preserves a complete, immutable chain of authorization and action.</p></Card></div>;
}
