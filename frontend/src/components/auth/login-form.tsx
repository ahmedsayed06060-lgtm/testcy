'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { emailSchema } from '@/lib/validations';
import { authApi } from '@/lib/api-client';
import { establishSession } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

export function LoginForm() {
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<'login' | 'mfa'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setChallenge = useAuthStore((state) => state.setChallenge);
  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!emailSchema.safeParse(email).success || password.length < 1) { setError('Enter a valid email and password'); return; }
    setLoading(true);
    try {
      const result = await authApi.login(email, password);
      setTempToken(result.temp_token); setChallenge(result.temp_token, email);
      if (result.mfa_setup_required) router.push(`/${locale}/mfa-setup`);
      else setStep('mfa');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Authentication failed'); }
    finally { setLoading(false); }
  };
  const verify = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (code.length < 6 || code.length > 32) { setError('Enter an authentication or unused recovery code'); return; }
    setLoading(true);
    try { const tokens = await authApi.verifyMfa(tempToken, code); await establishSession(tokens); router.push(`/${locale}/dashboard`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Verification failed'); }
    finally { setLoading(false); }
  };
  if (step === 'mfa') return <form onSubmit={verify} className="animate-fade-up"><div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950"><ShieldCheck className="h-6 w-6" /></div><Field label="Authentication or backup code" error={error} hint="Open your authenticator app and enter the current six-digit code, or use an unused recovery code." required><Input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={32} value={code} onChange={(event) => setCode(event.target.value.replace(/\s/g, ''))} placeholder="000000" className="h-12 text-center font-mono text-xl tracking-[0.35em]" /></Field><Button type="submit" className="mt-6 w-full" loading={loading}>Verify & sign in<ArrowRight className="h-4 w-4" /></Button><button type="button" onClick={() => { setStep('login'); setCode(''); setError(''); }} className="mt-5 w-full text-center text-xs font-medium text-muted hover:text-ink">Back to sign in</button></form>;
  return <form onSubmit={login} className="space-y-5"><Field label="Work email" required><div className="relative"><Mail className="absolute start-3 top-3 h-4 w-4 text-muted" /><Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="ps-10" /></div></Field><Field label="Password" error={error} required><div className="relative"><LockKeyhole className="absolute start-3 top-3 h-4 w-4 text-muted" /><Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="px-10" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-3 text-muted hover:text-ink">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field><div className="flex justify-end text-xs"><Link href={`/${locale}/forgot-password`} className="font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-400">Forgot password?</Link></div><Button type="submit" className="w-full" size="lg" loading={loading}>Sign in securely<ArrowRight className="h-4 w-4" /></Button><div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-[11px] leading-5 text-brand-900 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">Mandatory MFA and short-lived sessions protect every workspace. Access tokens and refresh tokens remain in browser memory only.</div><p className="text-center text-[11px] leading-5 text-muted">By continuing, you agree to use this platform only for assets you are explicitly authorized to assess.</p></form>;
}
