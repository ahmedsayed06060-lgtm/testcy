import Link from 'next/link';

export function Footer({ locale }: { locale: string }) {
  return <footer className="border-t border-line px-6 py-5 text-xs text-muted"><div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p>CyberOps Hub · Authorized security operations only</p><nav aria-label="Legal and security" className="flex gap-4"><Link href={`/${locale}/settings`} className="hover:text-brand-600">Security controls</Link><a href="https://github.com/ahmedsayed06060-lgtm/testcy/security/policy" className="hover:text-brand-600">Report a vulnerability</a></nav></div></footer>;
}
