'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trendData } from '@/lib/demo-data';
import { cn } from '@/lib/utils';

export function TrendChart({ title, description }: { title: string; description: string }) {
  const [period, setPeriod] = useState(12);
  const [visible, setVisible] = useState({ critical: true, high: true, medium: true });
  const data = useMemo(() => period === 12 ? trendData : Array.from({ length: period }, (_, index) => {
    const base = trendData[index % trendData.length]!;
    return { ...base, day: `${index + 1}`, medium: Math.max(4, base.medium - (period - index) % 8), low: base.low };
  }), [period]);
  const series = [
    { key: 'critical' as const, label: 'Critical', color: '#e5484d' },
    { key: 'high' as const, label: 'High', color: '#f97316' },
    { key: 'medium' as const, label: 'Medium', color: '#eab308' },
  ];
  return <Card className="min-w-0"><CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center"><div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div><div className="flex rounded-lg border border-line bg-canvas p-0.5">{[12, 30, 90].map((days) => <button key={days} onClick={() => setPeriod(days)} className={cn('rounded-md px-2.5 py-1 text-[10px] font-semibold transition', period === days ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}>{days}D</button>)}</div></CardHeader><CardContent className="pb-4 pt-3"><div className="mb-3 flex items-center gap-4">{series.map((item) => <button key={item.key} onClick={() => setVisible((state) => ({ ...state, [item.key]: !state[item.key] }))} className={cn('flex items-center gap-1.5 text-[11px] font-medium transition', visible[item.key] ? 'text-muted' : 'text-muted/40 line-through')}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</button>)}</div><div className="h-[246px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -25 }}><defs>{series.map((item) => <linearGradient key={item.key} id={`gradient-${item.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={item.color} stopOpacity={0.15} /><stop offset="100%" stopColor={item.color} stopOpacity={0} /></linearGradient>)}</defs><CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="3 4" /><XAxis dataKey="day" axisLine={false} tickLine={false} dy={9} interval={period === 12 ? 1 : Math.floor(period / 7)} /><YAxis axisLine={false} tickLine={false} tickCount={5} /><Tooltip cursor={{ stroke: 'rgb(var(--line))' }} contentStyle={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: '10px', fontSize: '11px', boxShadow: '0 10px 30px rgba(15,23,42,.12)' }} labelStyle={{ color: 'rgb(var(--ink))', fontWeight: 600, marginBottom: 6 }} />{series.map((item) => visible[item.key] && <Area key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={2} fill={`url(#gradient-${item.key})`} activeDot={{ r: 4, strokeWidth: 2, fill: 'rgb(var(--surface))' }} />)}</AreaChart></ResponsiveContainer></div></CardContent></Card>;
}
