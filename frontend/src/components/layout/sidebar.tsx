'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { BriefcaseBusiness, Bug, ChevronDown, ChevronsLeft, ChevronsRight, ClipboardCheck, FileBarChart, Fingerprint, LayoutDashboard, ScanSearch, Settings, ShieldCheck, Smartphone, Users, UsersRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

const groups = [
  { label: 'workspace', items: [
    { key: 'overview', href: '/dashboard', icon: LayoutDashboard },
    { key: 'engagements', href: '/engagements', icon: BriefcaseBusiness },
    { key: 'findings', href: '/findings', icon: Bug, count: '148' },
    { key: 'jobs', href: '/jobs', icon: ScanSearch, count: '4', live: true },
    { key: 'reports', href: '/reports', icon: FileBarChart },
  ] },
  { label: 'modules', items: [
    { key: 'mobile', href: '/mobile', icon: Smartphone },
    { key: 'social', href: '/social', icon: Fingerprint },
  ] },
  { label: 'organization', items: [
    { key: 'clients', href: '/clients', icon: UsersRound },
    { key: 'users', href: '/users', icon: Users },
    { key: 'audit', href: '/audit-log', icon: ClipboardCheck },
  ] },
];

export function Sidebar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebar } = useUIStore();
  const current = pathname.replace(/^\/(en|ar)/, '') || '/dashboard';

  return <>
    {mobileSidebarOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-navy-950/60 lg:hidden" onClick={() => setMobileSidebar(false)} />}
    <aside className={cn('fixed inset-y-0 start-0 z-50 flex flex-col bg-navy-950 text-slate-300 transition-[width,transform] duration-300', sidebarCollapsed ? 'lg:w-[82px]' : 'lg:w-[256px]', 'w-[276px]', mobileSidebarOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full lg:translate-x-0')}>
      <div className={cn('flex h-[72px] shrink-0 items-center border-b border-white/[0.07] px-5', sidebarCollapsed && 'lg:justify-center lg:px-3')}>
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-3" onClick={() => setMobileSidebar(false)}>
          <Image src="/logo-dark.svg" alt="" width={35} height={35} priority />
          <span className={cn('text-[19px] font-semibold tracking-[-0.04em] text-white', sidebarCollapsed && 'lg:hidden')}>CyberOps <span className="font-normal text-brand-400">Hub</span></span>
        </Link>
        <button className="icon-button ms-auto text-slate-400 hover:bg-white/10 lg:hidden" onClick={() => setMobileSidebar(false)}><X className="h-5 w-5" /></button>
      </div>
      <div className={cn('px-4 pb-2 pt-5', sidebarCollapsed && 'lg:hidden')}>
        <button className="flex w-full items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.045] p-2.5 text-start transition hover:bg-white/[0.08]">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500/15 text-xs font-bold text-brand-400">AS</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">Aegis Security</span><span className="mt-0.5 block text-[10px] text-slate-500">Operations workspace</span></span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
        </button>
      </div>
      <nav aria-label="Main navigation" className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4 pt-3">
        {groups.map((group) => <div key={group.label} className="mb-5">
          <p className={cn('mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-600', sidebarCollapsed && 'lg:hidden')}>{t(group.label)}</p>
          <div className="space-y-1">{group.items.map((item) => {
            const active = current === item.href || (item.href !== '/dashboard' && current.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return <Link key={item.href} href={`/${locale}${item.href}`} title={sidebarCollapsed ? t(item.key) : undefined} onClick={() => setMobileSidebar(false)} className={cn('group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition', active ? 'bg-brand-500/[0.12] text-brand-300' : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100', sidebarCollapsed && 'lg:justify-center lg:px-0')}>
              {active && <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-brand-400" />}
              <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300')} strokeWidth={1.8} />
              <span className={cn('flex-1 truncate', sidebarCollapsed && 'lg:hidden')}>{t(item.key)}</span>
              {item.count && <span className={cn('rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-slate-400', item.live && 'text-brand-400', sidebarCollapsed && 'lg:hidden')}>{item.live && <span className="me-1 inline-block h-1 w-1 animate-pulse-soft rounded-full bg-brand-400" />}{item.count}</span>}
            </Link>;
          })}</div>
        </div>)}
      </nav>
      <div className={cn('px-3 pb-3', sidebarCollapsed && 'lg:hidden')}>
        <Link href={`/${locale}/settings#security`} className="block rounded-xl border border-brand-500/15 bg-gradient-to-br from-brand-500/[0.11] to-transparent p-3.5 transition hover:border-brand-500/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-300"><ShieldCheck className="h-4 w-4" /> Authorization enforced</div>
          <p className="mt-1.5 text-[10px] leading-4 text-slate-500">Scope, ownership & time-window checks are active.</p>
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> All systems operational</div>
        </Link>
      </div>
      <div className="flex h-14 shrink-0 items-center border-t border-white/[0.07] px-3">
        <Link href={`/${locale}/settings`} className={cn('flex h-9 flex-1 items-center gap-3 rounded-lg px-3 text-[13px] text-slate-500 hover:bg-white/5 hover:text-white', sidebarCollapsed && 'lg:justify-center lg:px-0')}><Settings className="h-[18px] w-[18px]" /><span className={sidebarCollapsed ? 'lg:hidden' : ''}>{t('settings')}</span></Link>
        <button onClick={toggleSidebar} aria-label={t('collapse')} className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-white/5 hover:text-white lg:flex">{sidebarCollapsed ? <ChevronsRight className="h-4 w-4 rtl:rotate-180" /> : <ChevronsLeft className="h-4 w-4 rtl:rotate-180" />}</button>
      </div>
    </aside>
  </>;
}
