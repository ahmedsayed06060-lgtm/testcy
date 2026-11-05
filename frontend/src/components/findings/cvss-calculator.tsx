'use client';

import { useState } from 'react';
import { useCVSS } from '@/hooks/use-findings';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { SeverityBadge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

export function CVSSCalculator({ initialVector = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', onCalculated }: { initialVector?: string; onCalculated?: (score: number) => void }) {
  const [vector, setVector] = useState(initialVector);
  const mutation = useCVSS();
  const { toast } = useToast();
  const calculate = async () => {
    try { const result = await mutation.mutateAsync(vector); onCalculated?.(result.score); }
    catch (error) { toast('Invalid CVSS vector', error instanceof Error ? error.message : undefined, 'error'); }
  };
  return <div className="space-y-3"><Field label="CVSS 3.1 vector"><Input className="font-mono text-[11px]" value={vector} onChange={(event) => setVector(event.target.value)} /></Field><Button type="button" variant="secondary" size="sm" loading={mutation.isPending} onClick={() => void calculate()}>Validate score</Button>{mutation.data && <div className="flex items-center gap-3"><SeverityBadge severity={mutation.data.severity} score={mutation.data.score} /><span className="text-[10px] text-muted">Validated by the backend</span></div>}</div>;
}
