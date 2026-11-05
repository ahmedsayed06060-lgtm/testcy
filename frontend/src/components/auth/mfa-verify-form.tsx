'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { authApi } from '@/lib/api-client';
import { establishSession } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

export function MFAVerifyForm() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const tempToken = useAuthStore((state) => state.tempToken);
  const router = useRouter(); const locale = useLocale();
  const verify = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!tempToken) { setError('Your MFA challenge is missing or expired. Return to sign in.'); return; }
    if (code.length < 6 || code.length > 32) { setError('Enter an authentication or unused recovery code'); return; }
    setLoading(true);
    try { const tokens = await authApi.verifyMfa(tempToken, code); await establishSession(tokens); router.push(`/${locale}/dashboard`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Verification failed'); }
    finally { setLoading(false); }
  };
  return <form onSubmit={verify}><Field label="Authentication or backup code" error={error} hint="Enter your current TOTP code or a single-use recovery code."><Input autoFocus value={code} onChange={(event) => setCode(event.target.value.replace(/\s/g, ''))} maxLength={32} autoComplete="one-time-code" className="h-12 text-center font-mono text-xl tracking-[.35em]" placeholder="000000" /></Field><Button className="mt-6 w-full" type="submit" loading={loading}><ShieldCheck className="h-4 w-4" />Verify identity</Button></form>;
}
