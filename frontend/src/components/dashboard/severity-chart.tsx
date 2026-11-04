'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { severityData } from '@/lib/demo-data';

export function SeverityChart({ title, description }: { title: string; description: string }) {
  const total = severityData.reduce((sum, item) => sum + item.value, 0);
  return <Card><CardHeader><div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div></CardHeader><CardContent className="pt-1"><div className="relative mx-auto h-[178px] max-w-[260px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={severityData} dataKey="value" nameKey="name" innerRadius={57} outerRadius={77} paddingAngle={3} cornerRadius={4} stroke="none" startAngle={90} endAngle={-270}>{severityData.map((item) => <Cell key={item.key} fill={item.color} />)}</Pie><Tooltip contentStyle={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: '10px', fontSize: '11px' }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold tracking-[-0.05em]">{total}</span><span className="mt-1 text-[10px] text-muted">Open findings</span></div></div><div className="mt-3 space-y-2.5">{severityData.map((item) => <div key={item.key} className="flex items-center text-xs"><span className="me-2 h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} /><span className="flex-1 text-muted">{item.name}</span><span className="font-semibold tabular-nums">{item.value}</span><span className="ms-3 w-8 text-end text-[10px] text-muted">{Math.round(item.value / total * 100)}%</span></div>)}</div></CardContent></Card>;
}
