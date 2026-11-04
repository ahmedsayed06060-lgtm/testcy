'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { emailSchema, totpSchema } from '@/lib/validations';
import { authApi } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function LoginForm() {
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<'login' | 'mfa'>('login');
  const [email, setEmail] = useState('admin@cyberops.local');
  const [password, setPassword] = useState('AdminPass123!');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState('demo-temp-token');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!emailSchema.safeParse(email).success || password.length < 1) { setError('Enter a valid email and password'); return; }
    setLoading(true);
    try {
      if (process.env.NEXT_PUBLIC_API_URL) {
        const result = await authApi.login(email, password); setTempToken(result.temp_token);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 650));
        if (email !== 'admin@cyberops.local' || password !== 'AdminPass123!') throw new Error('Invalid demonstration credentials');
      }
      setStep('mfa');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Authentication failed'); }
    finally { setLoading(false); }
  };
  const verify = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!totpSchema.safeParse(code).success) { setError('Enter the six-digit authentication code'); return; }
    setLoading(true);
    try {
      if (process.env.NEXT_PUBLIC_API_URL) {
        const tokens = await authApi.verifyMfa(tempToken, code);
        setCredentials({ id: 'current', email, full_name: 'Omar Khaled', role: 'admin' }, tokens.access_token, tokens.refresh_token);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 650));
        if (code !== '123456') throw new Error('Invalid code. Use 123456 for the local demonstration.');
        setCredentials({ id: 'demo', email, full_name: 'Omar Khaled', role: 'admin' }, 'demo-access-token', 'demo-refresh-token');
      }
      router.push(`/${locale}/dashboard`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Verification failed'); }
    finally { setLoading(false); }
  };
  if (step === 'mfa') return <form onSubmit={verify} className="animate-fade-up"><div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950"><ShieldCheck className="h-6 w-6" /></div><Field label="Authentication code" error={error} hint="Open your authenticator app and enter the current six-digit code." required><Input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" className="h-12 text-center font-mono text-xl tracking-[0.45em]" /></Field><Button type="submit" className="mt-6 w-full" loading={loading}>Verify & sign in<ArrowRight className="h-4 w-4" /></Button><div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-center text-[11px] text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">Local demo code: <strong className="font-mono">123456</strong></div><button type="button" onClick={() => { setStep('login'); setCode(''); setError(''); }} className="mt-5 w-full text-center text-xs font-medium text-muted hover:text-ink">Back to sign in</button></form>;
  return <form onSubmit={login} className="space-y-5"><Field label="Work email" required><div className="relative"><Mail className="absolute start-3 top-3 h-4 w-4 text-muted" /><Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="ps-10" /></div></Field><Field label="Password" error={error} required><div className="relative"><LockKeyhole className="absolute start-3 top-3 h-4 w-4 text-muted" /><Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="px-10" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-3 text-muted hover:text-ink">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field><div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2 text-muted"><input type="checkbox" className="h-4 w-4 rounded border-line accent-brand-600" />Remember this device</label><Link href={`/${locale}/forgot-password`} className="font-semibold text-brand-700 hover:text-brand-600 dark:text-brand-400">Forgot password?</Link></div><Button type="submit" className="w-full" size="lg" loading={loading}>Sign in securely<ArrowRight className="h-4 w-4" /></Button><div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-950"><div className="flex items-center gap-2 text-xs font-semibold text-brand-900 dark:text-brand-200"><CheckCircle2 className="h-4 w-4 text-brand-600" />Demonstration workspace ready</div><p className="mt-1.5 text-[11px] leading-5 text-brand-800/70 dark:text-brand-300/70">Credentials are pre-filled. Sign in, then use MFA code <strong className="font-mono">123456</strong>.</p></div><p className="text-center text-[11px] leading-5 text-muted">By continuing, you agree to use this platform only for assets you are explicitly authorized to assess.</p></form>;
}
