'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFindingsTrend } from '@/hooks/use-dashboard';
import { cn } from '@/lib/utils';

export function TrendChart({ title, description }: { title: string; description: string }) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const trend = useFindingsTrend(period);
  const [visible, setVisible] = useState({ critical: true, high: true, medium: true });
  const series = [{ key: 'critical' as const, color: '#e5484d' }, { key: 'high' as const, color: '#f97316' }, { key: 'medium' as const, color: '#eab308' }];
  return <Card className="min-w-0"><CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center"><div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div><div className="flex rounded-lg border border-line bg-canvas p-0.5">{(['7d', '30d', '90d'] as const).map((days) => <button key={days} onClick={() => setPeriod(days)} className={cn('rounded-md px-2.5 py-1 text-[10px] font-semibold', period === days ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>{days}</button>)}</div></CardHeader><CardContent className="pb-4 pt-3"><div className="mb-3 flex gap-4">{series.map((item) => <button key={item.key} onClick={() => setVisible((state) => ({ ...state, [item.key]: !state[item.key] }))} className={cn('flex items-center gap-1.5 text-[11px] capitalize', !visible[item.key] && 'opacity-40 line-through')}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.key}</button>)}</div><div className="h-[246px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend.data ?? []} margin={{ top: 8, right: 8, bottom: 0, left: -25 }}><CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 4" /><XAxis dataKey="date" axisLine={false} tickLine={false} dy={9} /><YAxis axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip />{series.map((item) => visible[item.key] && <Area key={item.key} type="monotone" dataKey={item.key} stroke={item.color} strokeWidth={2} fill={item.color} fillOpacity={0.08} />)}</AreaChart></ResponsiveContainer>{!trend.isLoading && !trend.data?.length && <p className="-mt-24 text-center text-xs text-muted">No findings were recorded in this period.</p>}</div></CardContent></Card>;
}
