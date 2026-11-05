'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { emailSchema, passwordSchema } from '@/lib/validations';
import { authApi } from '@/lib/api-client';

export function ForgotPasswordForm() {
  const locale = useLocale(); const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!emailSchema.safeParse(email).success) { setError('Enter a valid email address'); return; } setLoading(true); setError(''); try { await authApi.resetRequest(email); setSent(true); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Reset request failed'); } finally { setLoading(false); } };
  if (sent) return <div className="text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-brand-600" /><h2 className="mt-4 text-lg font-semibold">Check your inbox</h2><p className="mt-2 text-sm leading-6 text-muted">If an active account exists for {email}, a 15-minute reset link has been sent.</p><Link href={`/${locale}/login`}><Button variant="secondary" className="mt-6">Return to sign in</Button></Link></div>;
  return <form onSubmit={(event) => void submit(event)}><Field label="Work email" error={error} required><div className="relative"><Mail className="absolute start-3 top-3 h-4 w-4 text-muted" /><Input className="ps-10" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></div></Field><Button type="submit" className="mt-6 w-full" loading={loading}>Send reset instructions</Button><Link href={`/${locale}/login`} className="mt-5 flex items-center justify-center gap-1.5 text-xs font-medium text-muted"><ArrowLeft className="h-3.5 w-3.5" />Back to sign in</Link></form>;
}

export function ResetPasswordForm() {
  const locale = useLocale(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [done, setDone] = useState(false); const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); const valid = passwordSchema.safeParse(password);
    if (!valid.success) { setError(valid.error.issues[0]?.message ?? 'Invalid password'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setError('The reset token is missing. Request a new reset link.'); return; }
    setLoading(true); setError('');
    try { await authApi.resetConfirm(token, password); setDone(true); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Password reset failed'); } finally { setLoading(false); }
  };
  if (done) return <div className="text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-brand-600" /><h2 className="mt-4 text-lg font-semibold">Password updated</h2><p className="mt-2 text-sm text-muted">All existing sessions have been revoked. Sign in with your new password and MFA.</p><Link href={`/${locale}/login`}><Button className="mt-6">Continue to sign in</Button></Link></div>;
  return <form onSubmit={(event) => void submit(event)}><div className="space-y-5"><Field label="New password" hint="12+ characters with upper/lowercase, a number, and a symbol. Breached and common passwords are rejected." required><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></Field><Field label="Confirm new password" error={error} required><Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></Field></div><Button type="submit" className="mt-6 w-full" loading={loading}><KeyRound className="h-4 w-4" />Update password</Button></form>;
}
