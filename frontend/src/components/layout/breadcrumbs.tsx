'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

export function Breadcrumbs() {
  const segments = usePathname().split('/').filter(Boolean);
  const locale = segments[0] ?? 'en';
  const pages = segments.slice(1);
  if (!pages.length) return null;
  return <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-x-auto text-xs text-muted"><Link href={`/${locale}/dashboard`} className="shrink-0 hover:text-brand-600">Workspace</Link>{pages.map((page, index) => { const href = `/${locale}/${pages.slice(0, index + 1).join('/')}`; const label = page.replaceAll('-', ' '); return <span key={href} className="flex min-w-0 items-center gap-1.5"><ChevronRight className="h-3 w-3 shrink-0 rtl:rotate-180" />{index === pages.length - 1 ? <span aria-current="page" className="truncate capitalize text-ink">{label}</span> : <Link href={href} className="shrink-0 capitalize hover:text-brand-600">{label}</Link>}</span>; })}</nav>;
}
