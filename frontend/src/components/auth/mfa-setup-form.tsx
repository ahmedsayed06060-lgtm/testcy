'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-qr-code';
import { Check, Copy, Download, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { downloadText } from '@/lib/utils';
import { authApi } from '@/lib/api-client';
import { establishSession } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

export function MFASetupForm() {
  const locale = useLocale();
  const router = useRouter();
  const currentChallenge = useAuthStore((state) => state.tempToken);
  const [tempToken] = useState(currentChallenge);
  const pendingEmail = useAuthStore((state) => state.pendingEmail);
  const setChallenge = useAuthStore((state) => state.setChallenge);
  const [code, setCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const setup = useQuery({ queryKey: ['auth', 'mfa-setup', tempToken], enabled: Boolean(tempToken), retry: false, queryFn: async () => { const result = await authApi.mfaSetup(tempToken!); setChallenge(result.temp_token, pendingEmail ?? ''); return result; } });
  const confirm = async () => {
    const currentToken = useAuthStore.getState().tempToken;
    if (!currentToken || code.length !== 6) return;
    setLoading(true); setError('');
    try { await authApi.confirmMfaSetup(currentToken, code); const tokens = await authApi.verifyMfa(currentToken, code); await establishSession(tokens); setConfirmed(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'MFA setup failed'); }
    finally { setLoading(false); }
  };
  if (!tempToken) return <div role="alert" className="text-sm text-red-600">Your setup challenge is missing or expired. Return to sign in and authenticate again.</div>;
  if (setup.isLoading) return <p className="text-sm text-muted">Generating a protected MFA secret and single-use recovery codes…</p>;
  if (setup.isError || !setup.data) return <div role="alert" className="text-sm text-red-600">MFA setup could not be started. Return to sign in and request a new challenge.</div>;
  const { secret, qr_uri: uri, backup_codes: backupCodes } = setup.data;
  return <div className="space-y-6">{!confirmed ? <><div className="flex flex-col items-center rounded-xl border border-line bg-white p-5"><div className="rounded-lg border border-line p-3"><QRCode value={uri} size={170} /></div><p className="mt-4 text-xs font-semibold text-slate-800">Scan with your authenticator app</p><button onClick={() => { void navigator.clipboard.writeText(secret); toast('Setup key copied'); }} className="mt-3 flex items-center gap-2 break-all font-mono text-[11px] text-slate-500"><Copy className="h-3.5 w-3.5 shrink-0" />{secret}</button></div><Field label="Enter the generated six-digit code" error={error}><Input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" autoComplete="one-time-code" className="text-center font-mono text-xl tracking-[.4em]" placeholder="000000" /></Field><Button className="w-full" disabled={code.length !== 6} loading={loading} onClick={() => void confirm()}><ShieldCheck className="h-4 w-4" />Enable MFA and sign in</Button></> : <div className="animate-fade-up"><div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-xs leading-6 text-brand-900 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200"><strong>MFA is enabled.</strong><br />Store these single-use recovery codes offline. They will not be shown again.</div><div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-line p-4">{backupCodes.map((item) => <code key={item} className="rounded bg-canvas px-3 py-2 text-center text-xs">{item}</code>)}</div><Button variant="secondary" className="mt-4 w-full" onClick={() => downloadText('cyberops-backup-codes.txt', backupCodes.join('\n'))}><Download className="h-4 w-4" />Download recovery codes</Button><Button className="mt-3 w-full" onClick={() => router.push(`/${locale}/dashboard`)}><Check className="h-4 w-4" />Continue to workspace</Button></div>}</div>;
}
