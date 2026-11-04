'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowLeft, BriefcaseBusiness, Bug, Mail, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from './empty-state';
import { EngagementTable } from '@/components/engagements/engagement-table';
import { clients } from '@/lib/org-data';

export function ClientDetail({ id }: { id: string }) {
  const locale = useLocale();
  const client = clients.find((item) => item.id === id);
  if (!client) return <EmptyState title="Client not found" />;
  return <div className="space-y-6 animate-fade-up"><Link href={`/${locale}/clients`} className="inline-flex items-center gap-1.5 text-xs text-muted"><ArrowLeft className="h-3.5 w-3.5" />Back to clients</Link><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-4"><Avatar name={client.name} initials={client.initials} color={client.color} size="lg" className="h-14 w-14 rounded-xl" /><div><h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1><p className="mt-1 text-sm text-muted">{client.industry} · Client since {client.since}</p></div></div><Button>Edit client</Button></div><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><BriefcaseBusiness className="h-5 w-5 text-brand-600" /><p className="mt-3 text-2xl font-semibold">{client.engagements}</p><p className="text-xs text-muted">Total engagements</p></Card><Card className="p-5"><Bug className="h-5 w-5 text-orange-600" /><p className="mt-3 text-2xl font-semibold">{client.findings}</p><p className="text-xs text-muted">Open findings</p></Card><Card className="p-5"><ShieldCheck className="h-5 w-5 text-blue-600" /><p className="mt-3 text-2xl font-semibold">100%</p><p className="text-xs text-muted">Authorized engagements</p></Card></div><div className="grid items-start gap-6 xl:grid-cols-[1fr_300px]"><EngagementTable title="Client engagements" description={`Assessments associated with ${client.name}`} /><Card><CardHeader><CardTitle>Primary contact</CardTitle></CardHeader><CardContent><div className="flex items-center gap-3"><Avatar name={client.contact} size="md" className="rounded-full" /><div><p className="text-xs font-semibold">{client.contact}</p><p className="text-[10px] text-muted">Security contact</p></div></div><p className="mt-4 flex items-center gap-2 text-xs text-muted"><Mail className="h-4 w-4" />{client.email}</p><div className="mt-5 border-t border-line pt-4"><p className="text-[10px] font-semibold uppercase text-muted">Tenant isolation</p><p className="mt-2 text-[11px] leading-5 text-muted">Portal users can access only engagements and reports attached to {client.name}.</p></div></CardContent></Card></div></div>;
}
