import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function ClientPortalLayout({ children, params: { locale } }: { children: React.ReactNode; params: { locale: string } }) {
  return <div className="min-h-screen bg-canvas"><header className="border-b border-line bg-surface"><div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5"><Image src="/logo.svg" width={32} height={32} alt="" /><Link href={`/${locale}/client-portal`} className="font-semibold">CyberOps <span className="font-normal text-brand-600">Client Portal</span></Link><nav className="ms-8 hidden gap-5 text-xs font-medium text-muted sm:flex"><Link href={`/${locale}/client-portal`} className="hover:text-ink">Engagements</Link><Link href={`/${locale}/client-portal/reports`} className="hover:text-ink">Reports</Link></nav><span className="ms-auto flex items-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4 text-brand-600" />Acme Corporation</span></div></header><main className="mx-auto max-w-6xl px-5 py-8">{children}</main></div>;
}
