'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowLeft, BriefcaseBusiness, Mail, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from './empty-state';
import { ErrorState } from './query-state';
import { EngagementTable } from '@/components/engagements/engagement-table';
import { useClient } from '@/hooks/use-clients';
import { useClientStats } from '@/hooks/use-dashboard';
import { formatDate } from '@/lib/utils';

export function ClientDetail({ id }: { id: string }) {
  const locale = useLocale(); const client = useClient(id); const stats = useClientStats(id);
  if (client.isLoading) return <div className="h-64 animate-pulse rounded-xl bg-surface" />;
  if (!client.data) return <EmptyState title="Client not found" />;
  const item = client.data;
  return <div className="space-y-6 animate-fade-up"><Link href={`/${locale}/clients`} className="inline-flex items-center gap-1.5 text-xs text-muted"><ArrowLeft className="h-3.5 w-3.5" />Back to clients</Link><div className="flex items-center gap-4"><Avatar name={item.company_name} size="lg" className="h-14 w-14 rounded-xl" /><div><h1 className="text-2xl font-semibold tracking-tight">{item.company_name}</h1><p className="mt-1 text-sm text-muted">{item.industry || 'Industry not provided'} · Client since {formatDate(item.created_at)}</p></div></div><ErrorState error={stats.error} /><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><BriefcaseBusiness className="h-5 w-5 text-brand-600" /><p className="mt-3 text-2xl font-semibold">{stats.data?.engagements ?? '—'}</p><p className="text-xs text-muted">Total engagements</p></Card><Card className="p-5"><ShieldCheck className="h-5 w-5 text-blue-600" /><p className="mt-3 text-2xl font-semibold">{stats.data?.findings.critical ?? '—'}</p><p className="text-xs text-muted">Critical findings</p></Card><Card className="p-5"><ShieldCheck className="h-5 w-5 text-brand-600" /><p className="mt-3 text-2xl font-semibold">{stats.data?.findings.high ?? '—'}</p><p className="text-xs text-muted">High findings</p></Card></div><div className="grid items-start gap-6 xl:grid-cols-[1fr_300px]"><EngagementTable title="Client engagements" description={`Assessments associated with ${item.company_name}`} clientId={id} /><Card><CardHeader><CardTitle>Primary contact</CardTitle></CardHeader><CardContent><div className="flex items-center gap-3"><Avatar name={item.contact_name || item.company_name} size="md" className="rounded-full" /><div><p className="text-xs font-semibold">{item.contact_name || 'No primary contact'}</p><p className="text-[10px] text-muted">Security contact</p></div></div><p className="mt-4 flex items-center gap-2 text-xs text-muted"><Mail className="h-4 w-4" />{item.contact_email || 'No email provided'}</p><div className="mt-5 border-t border-line pt-4"><p className="text-[10px] font-semibold uppercase text-muted">Tenant isolation</p><p className="mt-2 text-[11px] leading-5 text-muted">Portal users can access only engagements and reports attached to {item.company_name}. PostgreSQL row-level security enforces this boundary.</p></div></CardContent></Card></div></div>;
}
