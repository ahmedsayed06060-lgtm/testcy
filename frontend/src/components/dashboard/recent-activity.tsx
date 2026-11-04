import { Bug, FileBarChart, ScanLine, ShieldCheck } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { activities } from '@/lib/demo-data';

const icons = { finding: Bug, job: ScanLine, report: FileBarChart, authorization: ShieldCheck };

export function RecentActivity() {
  return <div className="divide-y divide-line">{activities.map((activity) => { const Icon = icons[activity.kind]; return <div key={activity.id} className="flex gap-3 px-5 py-4"><div className="relative"><Avatar name={activity.actor} initials={activity.initials} size="sm" className="rounded-full" /><span className="absolute -bottom-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-canvas text-brand-600"><Icon className="h-2.5 w-2.5" /></span></div><div className="min-w-0 flex-1"><p className="text-xs leading-5 text-muted"><span className="font-semibold text-ink">{activity.actor}</span> {activity.action} <span className="font-medium text-ink">{activity.subject}</span></p><p className="mt-1 text-[10px] text-muted/70">{activity.time}</p></div></div>; })}</div>;
}
