'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import QRCode from 'react-qr-code';
import { Check, Copy, Download, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { downloadText } from '@/lib/utils';

const codes = ['7f2a-91bc', 'c04d-778e', 'aa19-3e42', 'b860-2fd1', '91ce-0a73', 'f4b2-61d9', 'e731-a8c0', '2b6d-90ef', 'c812-74aa', '190e-b673'];
export function MFASetupForm() {
  const locale = useLocale();
  const [code, setCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();
  const secret = 'JBSW Y3DP EHPK 3PXP';
  const uri = `otpauth://totp/CyberOps%20Hub:admin@cyberops.local?secret=${secret.replaceAll(' ', '')}&issuer=CyberOps%20Hub`;
  return <div className="space-y-6">{!confirmed ? <><div className="flex flex-col items-center rounded-xl border border-line bg-white p-5"><div className="rounded-lg border border-line p-3"><QRCode value={uri} size={170} /></div><p className="mt-4 text-xs font-semibold text-slate-800">Scan with your authenticator app</p><button onClick={() => { navigator.clipboard.writeText(secret); toast('Setup key copied'); }} className="mt-3 flex items-center gap-2 font-mono text-[11px] text-slate-500"><Copy className="h-3.5 w-3.5" />{secret}</button></div><div><label className="text-xs font-medium">Enter the generated six-digit code</label><Input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" className="mt-2 text-center font-mono text-xl tracking-[.4em]" placeholder="000000" /></div><Button className="w-full" disabled={code.length !== 6} onClick={() => setConfirmed(true)}><ShieldCheck className="h-4 w-4" />Enable MFA</Button></> : <div className="animate-fade-up"><div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-xs leading-6 text-brand-900 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200"><strong>MFA is enabled.</strong><br />Store these single-use recovery codes offline. They will not be shown again.</div><div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-line p-4">{codes.map((item) => <code key={item} className="rounded bg-canvas px-3 py-2 text-center text-xs">{item}</code>)}</div><Button variant="secondary" className="mt-4 w-full" onClick={() => downloadText('cyberops-backup-codes.txt', codes.join('\n'))}><Download className="h-4 w-4" />Download recovery codes</Button><Link href={`/${locale}/dashboard`}><Button className="mt-3 w-full"><Check className="h-4 w-4" />Continue to workspace</Button></Link></div>}</div>;
}
