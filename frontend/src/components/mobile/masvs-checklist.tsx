'use client';

import { useState } from 'react';
import { Check, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMobileChecklist } from '@/hooks/use-mobile';
import { useToast } from '@/components/ui/toast';
import type { ApiMobileAnalysis } from '@/types/api';
import { cn } from '@/lib/utils';

const controls = [{ key: 'storage', group: 'MASVS-STORAGE', label: 'Sensitive data storage and key protection reviewed' }, { key: 'crypto', group: 'MASVS-CRYPTO', label: 'Modern cryptography and secure random generation reviewed' }, { key: 'auth', group: 'MASVS-AUTH', label: 'Authentication and session management reviewed' }, { key: 'network', group: 'MASVS-NETWORK', label: 'TLS validation and network traffic reviewed' }, { key: 'platform', group: 'MASVS-PLATFORM', label: 'IPC, WebViews, and exported components reviewed' }, { key: 'code', group: 'MASVS-CODE', label: 'Secure build settings and code quality reviewed' }, { key: 'resilience', group: 'MASVS-RESILIENCE', label: 'Tamper and reverse-engineering controls reviewed' }, { key: 'privacy', group: 'MASVS-PRIVACY', label: 'Data minimization and user privacy reviewed' }];
export function MASVSChecklist({ analysis }: { analysis: ApiMobileAnalysis }) {
  const [checks, setChecks] = useState<Record<string, boolean | null>>(() => Object.fromEntries(controls.map((control) => { const value = analysis.manual_checklist[control.key]; return [control.key, typeof value === 'boolean' ? value : null]; })));
  const mutation = useMobileChecklist(analysis.id);
  const { toast } = useToast();
  const save = async () => { try { await mutation.mutateAsync(checks); toast('MASVS checklist saved'); } catch (error) { toast('Checklist could not be saved', error instanceof Error ? error.message : undefined, 'error'); } };
  return <div className="space-y-3">{controls.map((control) => { const value = checks[control.key]; return <button key={control.key} type="button" onClick={() => setChecks((current) => ({ ...current, [control.key]: value === null ? true : value ? false : null }))} className="flex w-full items-center gap-3 rounded-xl border border-line p-4 text-start hover:bg-canvas"><span className={cn('flex h-5 w-5 items-center justify-center rounded-full', value === true ? 'bg-brand-600 text-white' : value === false ? 'bg-red-600 text-white' : 'border border-line text-muted')}>{value === true ? <Check className="h-3 w-3" /> : value === false ? <X className="h-3 w-3" /> : <Minus className="h-3 w-3" />}</span><span className="flex-1"><span className="block text-[10px] font-semibold text-brand-700">{control.group}</span><span className="mt-1 block text-xs leading-5 text-muted">{control.label}</span></span><span className="text-[10px] text-muted">{value === null ? 'Not reviewed' : value ? 'Passed' : 'Review needed'}</span></button>; })}<Button size="sm" loading={mutation.isPending} onClick={() => void save()}>Save MASVS review</Button></div>;
}
