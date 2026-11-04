'use client';

import { useState } from 'react';
import { Calculator, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calculateCVSS, type CVSSSeverity } from '@/lib/cvss';

export function CVSSCalculator({ initialVector = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', onCalculated }: { initialVector?: string; onCalculated?: (score: number) => void }) {
  const [vector, setVector] = useState(initialVector);
  const [result, setResult] = useState<{ score: number; severity: CVSSSeverity }>();
  const [error, setError] = useState('');
  const calculate = () => {
    try { const value = calculateCVSS(vector); setResult(value); setError(''); onCalculated?.(value.score); }
    catch (reason) { setResult(undefined); setError(reason instanceof Error ? reason.message : 'Invalid vector'); }
  };
  return <div><label className="text-xs font-medium" htmlFor="cvss-vector">CVSS v3.x vector</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input id="cvss-vector" value={vector} onChange={(event) => setVector(event.target.value)} className="font-mono text-[11px]" /><Button type="button" variant="secondary" onClick={calculate}><Calculator className="h-4 w-4" />Calculate</Button></div>{error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}{result && <div className="mt-3 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-brand-900 dark:bg-brand-950"><CheckCircle2 className="h-5 w-5 text-brand-600" /><div><p className="text-sm font-semibold">{result.score.toFixed(1)} · {result.severity}</p><p className="text-[10px] text-muted">CVSS base score calculated locally</p></div></div>}</div>;
}
