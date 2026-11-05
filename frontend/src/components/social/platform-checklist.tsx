'use client';

import { useState } from 'react';
import { Check, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocialChecklist } from '@/hooks/use-social';
import { useToast } from '@/components/ui/toast';
import type { ApiSocialAssessment } from '@/types/api';
import { cn } from '@/lib/utils';

const checks = [{ key: 'mfa', label: 'Phishing-resistant MFA is enforced' }, { key: 'admins', label: 'Administrative access is reviewed quarterly' }, { key: 'recovery', label: 'Recovery channels use controlled organizational accounts' }, { key: 'permissions', label: 'Third-party application permissions are minimized' }, { key: 'alerts', label: 'Login and administrative-change alerts are enabled' }, { key: 'privacy', label: 'Public profile data follows data-minimization policy' }];
export function PlatformChecklist({ assessment }: { assessment: ApiSocialAssessment }) {
  const [values, setValues] = useState<Record<string, boolean | null>>(() => Object.fromEntries(checks.map((check) => { const value = assessment.checklist_results[check.key]; return [check.key, typeof value === 'boolean' ? value : null]; })));
  const mutation = useSocialChecklist(assessment.id);
  const { toast } = useToast();
  const save = async () => { try { await mutation.mutateAsync(values); toast('Platform checklist saved'); } catch (error) { toast('Checklist could not be saved', error instanceof Error ? error.message : undefined, 'error'); } };
  return <div className="space-y-3">{checks.map((check) => { const value = values[check.key]; return <button key={check.key} onClick={() => setValues((current) => ({ ...current, [check.key]: value === null ? true : value ? false : null }))} className="flex w-full items-center gap-3 rounded-xl border border-line p-4 text-start hover:bg-canvas"><span className={cn('flex h-5 w-5 items-center justify-center rounded-full', value === true ? 'bg-brand-600 text-white' : value === false ? 'bg-red-600 text-white' : 'border border-line text-muted')}>{value === true ? <Check className="h-3 w-3" /> : value === false ? <X className="h-3 w-3" /> : <Minus className="h-3 w-3" />}</span><span className="flex-1 text-xs font-medium">{check.label}</span><span className="text-[10px] text-muted">{value === null ? 'Not reviewed' : value ? 'Passed' : 'Review needed'}</span></button>; })}<Button size="sm" loading={mutation.isPending} onClick={() => void save()}>Save checklist</Button></div>;
}
