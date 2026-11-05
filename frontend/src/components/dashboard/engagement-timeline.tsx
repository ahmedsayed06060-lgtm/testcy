import { CalendarRange } from 'lucide-react';
import { StatusBadge } from '@/components/ui/badge';
import type { ApiEngagement } from '@/types/api';

export function EngagementTimeline({ engagements }: { engagements: ApiEngagement[] }) {
  const ordered = [...engagements].sort((a, b) => a.start_date.localeCompare(b.start_date));
  return <ol className="relative ms-3 border-s border-line">{ordered.map((engagement) => <li key={engagement.id} className="mb-6 ms-5"><span className="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-brand-600"><CalendarRange className="h-3 w-3" /></span><div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-semibold">{engagement.name}</h3><StatusBadge status={engagement.status} /></div><p className="mt-1 text-[11px] text-muted">{engagement.start_date} — {engagement.end_date}</p></li>)}</ol>;
}
