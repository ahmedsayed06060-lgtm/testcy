'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

export function MFAVerifyForm() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter(); const locale = useLocale();
  return <form onSubmit={(event) => { event.preventDefault(); if (code !== '123456') { setError('Use demonstration code 123456'); return; } router.push(`/${locale}/dashboard`); }}><Field label="Authentication or backup code" error={error} hint="Enter your current TOTP code or a single-use recovery code."><Input autoFocus value={code} onChange={(event) => setCode(event.target.value)} className="h-12 text-center font-mono text-xl tracking-[.35em]" placeholder="000000" /></Field><Button className="mt-6 w-full" type="submit"><ShieldCheck className="h-4 w-4" />Verify identity</Button><p className="mt-4 text-center text-[11px] text-muted">Demonstration code: 123456</p></form>;
}
