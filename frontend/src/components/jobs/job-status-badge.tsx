import { StatusBadge } from '@/components/ui/badge';

export function JobStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status === 'pending' ? 'queued' : status} />;
}
