import Link from 'next/link';
import { SeverityBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import type { ApiFinding } from '@/types/api';

export function RecentFindings({ findings, locale }: { findings: ApiFinding[]; locale: string }) {
  if (!findings.length) return <EmptyState />;
  return <div className="divide-y divide-line">{findings.slice(0, 6).map((finding) => <Link key={finding.id} href={`/${locale}/findings/${finding.id}`} className="flex items-center gap-4 py-3 hover:bg-canvas/50"><SeverityBadge severity={finding.severity} score={finding.cvss_score ?? undefined} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{finding.title}</p><p className="mt-1 truncate text-[11px] text-muted">{finding.affected_asset}</p></div><time className="text-[10px] text-muted">{new Date(finding.created_at).toLocaleDateString()}</time></Link>)}</div>;
}
