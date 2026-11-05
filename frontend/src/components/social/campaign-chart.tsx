import type { ApiCampaignMetrics } from '@/types/api';

export function CampaignChart({ metrics }: { metrics: ApiCampaignMetrics }) {
  const rows = [{ label: 'Sent', value: metrics.sent, color: 'bg-slate-400' }, { label: 'Opened', value: metrics.opened, color: 'bg-blue-500' }, { label: 'Clicked', value: metrics.clicked, color: 'bg-amber-500' }, { label: 'Reported', value: metrics.reported, color: 'bg-emerald-600' }];
  const max = Math.max(metrics.sent, 1);
  return <div className="space-y-4">{rows.map((row) => <div key={row.label}><div className="mb-1.5 flex justify-between text-xs"><span>{row.label}</span><span className="font-semibold">{row.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-canvas"><div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.min(100, row.value / max * 100)}%` }} /></div></div>)}<p className="text-[10px] leading-4 text-muted">Department-level aggregate metrics only; individual recipient tracking is disabled.</p></div>;
}
