'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Check, Globe2, Network, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

const targetSchema = z.string().trim().min(3).max(500).refine((value) => !/\s/.test(value), 'Targets cannot contain spaces').refine((value) => !value.startsWith('-'), 'Options are not valid targets');
interface ScopeItem { id: string; value: string; type: string; inScope: boolean; verified: boolean }
const initial: ScopeItem[] = [
  { id: 'scope-1', value: 'api.acme.example', type: 'domain', inScope: true, verified: true },
  { id: 'scope-2', value: '*.acme.example', type: 'domain', inScope: true, verified: true },
  { id: 'scope-3', value: '10.24.8.0/25', type: 'cidr', inScope: true, verified: true },
  { id: 'scope-4', value: 'legacy.acme.example', type: 'domain', inScope: false, verified: true },
];

export function ScopeBuilder() {
  const [items, setItems] = useState(initial);
  const [value, setValue] = useState('');
  const [type, setType] = useState('domain');
  const [inScope, setInScope] = useState(true);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState<string>();
  const { toast } = useToast();
  const add = () => {
    const parsed = targetSchema.safeParse(value);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Invalid target'); return; }
    if (items.some((item) => item.value.toLowerCase() === parsed.data.toLowerCase())) { setError('This asset is already in the scope'); return; }
    setItems((current) => [...current, { id: crypto.randomUUID(), value: parsed.data, type, inScope, verified: false }]);
    setValue(''); setError('');
    toast('Scope item added', 'Ownership verification is required before execution.');
  };
  const verify = async (id: string) => {
    setVerifying(id);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setItems((current) => current.map((item) => item.id === id ? { ...item, verified: true } : item));
    setVerifying(undefined);
    toast('Ownership verified', 'The verification evidence has been added to the audit trail.');
  };
  return <div><div className="border-b border-line p-5"><div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]"><Select value={type} onChange={(event) => setType(event.target.value)} aria-label="Asset type"><option value="domain">Domain</option><option value="ip">IP address</option><option value="cidr">CIDR range</option><option value="url">URL</option><option value="app_id">Application ID</option></Select><div><Input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} placeholder="e.g. api.client.example or 10.0.0.0/24" aria-label="Scope target" />{error && <p role="alert" className="mt-1.5 text-xs text-red-600">{error}</p>}</div><Button type="button" onClick={add}><Plus className="h-4 w-4" />Add asset</Button></div><label className="mt-3 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={!inScope} onChange={(event) => setInScope(!event.target.checked)} className="h-4 w-4 rounded border-line accent-brand-600" />Add as an explicit out-of-scope exclusion</label></div><div className="divide-y divide-line">{items.map((item) => <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas text-muted">{item.type === 'cidr' || item.type === 'ip' ? <Network className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="truncate font-mono text-xs font-medium">{item.value}</p><div className="mt-1.5 flex flex-wrap items-center gap-2"><Badge variant={item.inScope ? 'success' : 'danger'}>{item.inScope ? 'In scope' : 'Excluded'}</Badge><span className="text-[10px] uppercase text-muted">{item.type}</span></div></div>{item.verified ? <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700 dark:text-brand-400"><ShieldCheck className="h-4 w-4" />Ownership verified</span> : item.inScope ? <Button size="sm" variant="secondary" loading={verifying === item.id} onClick={() => verify(item.id)}><Check className="h-3.5 w-3.5" />Verify ownership</Button> : <span className="text-xs text-muted">Excluded from execution</span>}<button className="icon-button h-8 w-8 hover:text-red-600" aria-label={`Remove ${item.value}`} onClick={() => setItems((current) => current.filter(({ id }) => id !== item.id))}><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div><div className="flex items-start gap-2 border-t border-line bg-canvas/50 px-5 py-3 text-[11px] leading-5 text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />Exclusions always take precedence. Subdomains and contained IPs inherit verification only from a matching authorized parent.</div></div>;
}
