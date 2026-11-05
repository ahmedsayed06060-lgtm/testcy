import { ExternalLink, ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';

export function ImpersonationResults({ findings }: { findings: Array<Record<string, unknown>> }) {
  if (!findings.length) return <EmptyState />;
  return <ul className="space-y-3">{findings.map((finding, index) => { const url = typeof finding.url === 'string' ? finding.url : ''; return <li key={`${url}-${index}`} className="flex items-start gap-3 rounded-lg border border-line p-4"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{String(finding.site ?? finding.domain ?? 'Public candidate')}</p>{url && <a href={url} target="_blank" rel="noreferrer nofollow" className="mt-1 flex items-center gap-1 truncate text-xs text-brand-600">{url}<ExternalLink className="h-3 w-3 shrink-0" /></a>}<p className="mt-2 text-[11px] text-muted">Public source: {String(finding.source ?? 'OSINT')} · analyst review required</p></div></li>; })}</ul>;
}
