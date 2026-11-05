import Link from 'next/link';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import type { ApiEngagement } from '@/types/api';

export function EngagementCard({ engagement, locale }: { engagement: ApiEngagement; locale: string }) {
  return <Link href={`/${locale}/engagements/${engagement.id}`}><Card className="h-full p-5 transition hover:border-brand-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted">{engagement.type.replaceAll('_', ' ')}</p><h3 className="mt-1 font-semibold">{engagement.name}</h3></div><StatusBadge status={engagement.status} /></div><div className="mt-5 space-y-2 text-xs text-muted"><p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{engagement.start_date} — {engagement.end_date}</p><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />{engagement.testing_window_timezone} testing window</p></div><p className="mt-4 line-clamp-2 text-xs leading-5 text-muted">{engagement.rules_of_engagement}</p></Card></Link>;
}
