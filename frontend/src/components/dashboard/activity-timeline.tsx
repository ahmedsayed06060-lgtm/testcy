import { Activity } from 'lucide-react';
import type { ApiAuditLog } from '@/types/api';

export function ActivityTimeline({ events }: { events: ApiAuditLog[] }) {
  if (!events.length) return <p className="py-8 text-center text-xs text-muted">No recent tenant activity.</p>;
  return <ol className="space-y-4">{events.map((event) => <li key={event.id} className="flex gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950"><Activity className="h-3.5 w-3.5" /></span><div className="min-w-0 flex-1"><p className="text-xs"><span className="font-semibold">{event.user_id ?? 'System'}</span> <span className="text-muted">{event.action} {event.resource_type}</span></p><p className="mt-1 text-[10px] text-muted">{new Date(event.timestamp).toLocaleString()} · resource {event.resource_id ?? 'n/a'}</p></div></li>)}</ol>;
}
