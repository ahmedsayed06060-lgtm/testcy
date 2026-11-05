'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Check, Globe2, Network, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useCreateScope, useDeleteScope, useScope, useVerifyScope } from '@/hooks/use-engagements';
import type { ApiScopeItem } from '@/types/api';

const targetSchema = z.string().trim().min(3).max(500).refine((value) => !/\s/.test(value), 'Targets cannot contain spaces').refine((value) => !value.startsWith('-'), 'Options are not valid targets');
type DraftItem = Pick<ApiScopeItem, 'id' | 'value' | 'in_scope' | 'ownership_verified'> & { asset_type: ApiScopeItem['asset_type'] };

export function ScopeBuilder({ engagementId = '' }: { engagementId?: string }) {
  return engagementId ? <ConnectedScopeBuilder engagementId={engagementId} /> : <DraftScopeBuilder />;
}

function DraftScopeBuilder() {
  const [items, setItems] = useState<DraftItem[]>([]);
  return <ScopeWorkspace items={items} onAdd={async (input) => { setItems((current) => [...current, { id: crypto.randomUUID(), ownership_verified: false, ...input }]); }} onRemove={async (id) => { setItems((current) => current.filter((item) => item.id !== id)); }} draft />;
}

function ConnectedScopeBuilder({ engagementId }: { engagementId: string }) {
  const query = useScope(engagementId);
  const create = useCreateScope(engagementId);
  const remove = useDeleteScope(engagementId);
  const verify = useVerifyScope(engagementId);
  return <ScopeWorkspace items={query.data ?? []} loading={query.isLoading} onAdd={async (input) => { await create.mutateAsync(input); }} onRemove={async (id) => { await remove.mutateAsync(id); }} onVerify={async (id) => { const result = await verify.mutateAsync(id); return result.verification_token; }} verifying={verify.isPending ? verify.variables : undefined} />;
}

function ScopeWorkspace({ items, onAdd, onRemove, onVerify, loading = false, verifying, draft = false }: { items: DraftItem[]; onAdd: (input: { asset_type: ApiScopeItem['asset_type']; value: string; in_scope: boolean }) => Promise<void>; onRemove: (id: string) => Promise<void>; onVerify?: (id: string) => Promise<string>; loading?: boolean; verifying?: string; draft?: boolean }) {
  const [value, setValue] = useState('');
  const [type, setType] = useState<ApiScopeItem['asset_type']>('domain');
  const [inScope, setInScope] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const add = async () => {
    const parsed = targetSchema.safeParse(value);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Invalid target'); return; }
    if (items.some((item) => item.value.toLowerCase() === parsed.data.toLowerCase())) { setError('This asset is already in the scope'); return; }
    try { await onAdd({ asset_type: type, value: parsed.data, in_scope: inScope }); setValue(''); setError(''); toast(draft ? 'Draft scope item added' : 'Scope item added', 'Ownership verification is required before execution.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Scope item could not be saved'); }
  };
  return <div><div className="border-b border-line p-5">{draft && <p className="mb-3 text-[11px] text-amber-700">Local draft mode. Open an engagement to persist scope and verify ownership.</p>}<div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]"><Select value={type} onChange={(event) => setType(event.target.value as ApiScopeItem['asset_type'])} aria-label="Asset type"><option value="domain">Domain</option><option value="ip">IP address</option><option value="cidr">CIDR range</option><option value="url">URL</option><option value="app_id">Application ID</option><option value="social_account">Social account</option></Select><div><Input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void add(); } }} placeholder="e.g. api.client.example or 10.0.0.0/24" aria-label="Scope target" />{error && <p role="alert" className="mt-1.5 text-xs text-red-600">{error}</p>}</div><Button type="button" onClick={() => void add()}><Plus className="h-4 w-4" />Add asset</Button></div><label className="mt-3 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={!inScope} onChange={(event) => setInScope(!event.target.checked)} className="h-4 w-4 accent-brand-600" />Add as an explicit out-of-scope exclusion</label></div><div className="divide-y divide-line">{loading && <p className="p-5 text-xs text-muted">Loading authorized scope…</p>}{items.map((item) => <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas text-muted">{item.asset_type === 'cidr' || item.asset_type === 'ip' ? <Network className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="truncate font-mono text-xs font-medium">{item.value}</p><div className="mt-1.5 flex flex-wrap items-center gap-2"><Badge variant={item.in_scope ? 'success' : 'danger'}>{item.in_scope ? 'In scope' : 'Excluded'}</Badge><span className="text-[10px] uppercase text-muted">{item.asset_type}</span></div></div>{item.ownership_verified ? <span className="flex items-center gap-1.5 text-xs font-medium text-brand-700"><ShieldCheck className="h-4 w-4" />Ownership verified</span> : item.in_scope && onVerify ? <Button size="sm" variant="secondary" loading={verifying === item.id} onClick={() => { void onVerify(item.id).then((token) => toast('Ownership verification started', `Publish this proof when instructed: ${token}`)).catch((reason: unknown) => toast('Verification could not start', reason instanceof Error ? reason.message : undefined, 'error')); }}><Check className="h-3.5 w-3.5" />Verify ownership</Button> : <span className="text-xs text-muted">{item.in_scope ? 'Verification required' : 'Excluded from execution'}</span>}<button className="icon-button h-8 w-8 hover:text-red-600" aria-label={`Remove ${item.value}`} onClick={() => { void onRemove(item.id).catch((reason: unknown) => toast('Scope item could not be removed', reason instanceof Error ? reason.message : undefined, 'error')); }}><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div><div className="flex items-start gap-2 border-t border-line bg-canvas/50 px-5 py-3 text-[11px] leading-5 text-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />Exclusions always take precedence. Verification and scope are checked again by the worker.</div></div>;
}
