'use client';

import { ActivityTimeline } from './activity-timeline';
import { useAuditLog } from '@/hooks/use-audit-log';

export function RecentActivity() {
  const events = useAuditLog({ limit: 8 });
  if (events.isLoading) return <p className="p-5 text-xs text-muted">Loading immutable audit activity…</p>;
  return <div className="p-5"><ActivityTimeline events={events.data?.items ?? []} /></div>;
}
