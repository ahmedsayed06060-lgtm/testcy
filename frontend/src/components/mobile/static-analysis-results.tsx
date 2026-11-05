import { SeverityBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import type { ApiMobileAnalysis } from '@/types/api';

export function StaticAnalysisResults({ analysis }: { analysis: ApiMobileAnalysis }) {
  const results = analysis.static_results;
  if (!results) return <EmptyState />;
  const findings = Array.isArray(results.findings) ? results.findings as Array<Record<string, unknown>> : [];
  return <div className="space-y-4"><div className="rounded-lg border border-line bg-canvas/40 p-4 text-xs"><p><span className="text-muted">Package:</span> <span className="font-mono">{analysis.package_name}</span></p><p className="mt-2"><span className="text-muted">SHA-256:</span> <span className="break-all font-mono">{analysis.file_hash_sha256}</span></p></div>{findings.length ? findings.map((finding, index) => <div key={index} className="rounded-lg border border-line p-4"><SeverityBadge severity={String(finding.severity ?? 'informational')} /><h3 className="mt-2 text-sm font-semibold">{String(finding.title ?? 'Mobile finding')}</h3><p className="mt-2 text-xs leading-5 text-muted">{String(finding.description ?? '')}</p></div>) : <p className="text-xs text-muted">Static analysis completed. Review the protected MobSF report for platform-specific evidence.</p>}</div>;
}
