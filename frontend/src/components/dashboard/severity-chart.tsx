'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/use-dashboard';

const colors: Record<string, string> = { critical: '#e5484d', high: '#f97316', medium: '#eab308', low: '#3b82f6', informational: '#94a3b8' };
export function SeverityChart({ title, description }: { title: string; description: string }) {
  const stats = useDashboardStats();
  const data = Object.entries(stats.data?.severity ?? {}).map(([name, value]) => ({ name, value, color: colors[name] ?? '#94a3b8' }));
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return <Card><CardHeader><div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div></CardHeader><CardContent className="pt-1"><div className="relative mx-auto h-[178px] max-w-[260px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={57} outerRadius={77} paddingAngle={3} cornerRadius={4} stroke="none" startAngle={90} endAngle={-270}>{data.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold">{total}</span><span className="mt-1 text-[10px] text-muted">Recorded findings</span></div></div><div className="mt-3 space-y-2.5">{data.map((item) => <div key={item.name} className="flex items-center text-xs capitalize"><span className="me-2 h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} /><span className="flex-1 text-muted">{item.name}</span><span className="font-semibold">{item.value}</span><span className="ms-3 w-8 text-end text-[10px] text-muted">{total ? Math.round(item.value / total * 100) : 0}%</span></div>)}</div></CardContent></Card>;
}
