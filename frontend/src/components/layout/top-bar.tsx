'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Bell, ChevronDown, ChevronRight, CircleUserRound, Languages, LogOut, Menu, Moon, Search, Settings, Sun } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export function TopBar() {
  const locale = useLocale();
  const t = useTranslations('common');
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { setMobileSidebar, setCommandOpen } = useUIStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const current = pathname.replace(/^\/(en|ar)/, '');
  const section = current.split('/')[1] || 'dashboard';
  const labels: Record<string, string> = { dashboard: 'Overview', engagements: 'Engagements', findings: 'Findings', jobs: 'Scan jobs', reports: 'Reports', mobile: 'Mobile security', social: 'Social assessment', clients: 'Clients', users: 'Team members', 'audit-log': 'Audit log', settings: 'Settings', profile: 'My profile' };
  const otherLocale = locale === 'en' ? 'ar' : 'en';

  return <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
    <button className="icon-button lg:hidden" onClick={() => setMobileSidebar(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-xs sm:flex"><span className="text-muted">CyberOps Hub</span><ChevronRight className="h-3.5 w-3.5 text-muted/60 rtl:rotate-180" /><span className="truncate font-medium text-ink">{labels[section] ?? section}</span></nav>
    <button onClick={() => setCommandOpen(true)} className="ms-auto flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-canvas/70 text-muted transition hover:text-ink sm:w-auto sm:min-w-[240px] sm:justify-start sm:gap-2 sm:px-3 lg:min-w-[280px]"><Search className="h-4 w-4 shrink-0" /><span className="hidden flex-1 text-start text-xs sm:inline">{t('search')}</span><kbd className="hidden rounded border border-line bg-surface px-1.5 py-0.5 text-[9px] font-medium text-muted lg:inline">⌘ K</kbd></button>
    <div className="flex items-center gap-0.5 sm:gap-1">
      <Link href={`/${otherLocale}${current}`} className="icon-button" aria-label={otherLocale === 'ar' ? 'Switch to Arabic' : 'Switch to English'} title={otherLocale === 'ar' ? 'العربية' : 'English'}><Languages className="h-[18px] w-[18px]" /><span className="hidden text-[10px] font-semibold xl:inline">{otherLocale.toUpperCase()}</span></Link>
      <button className="icon-button hidden sm:inline-flex" aria-label="Toggle color theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition dark:-rotate-90 dark:scale-0" /><Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition dark:rotate-0 dark:scale-100" /></button>
      <div className="relative">
        <button className={cn('icon-button relative', notificationsOpen && 'bg-canvas text-ink')} aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}><Bell className="h-[18px] w-[18px]" /><span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-surface bg-red-500" /></button>
        {notificationsOpen && <><button className="fixed inset-0 z-10 cursor-default" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} /><div className="absolute end-0 top-12 z-20 w-[340px] overflow-hidden rounded-xl border border-line bg-surface shadow-lift animate-fade-up"><div className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="text-sm font-semibold">Notifications</h2><span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">3 new</span></div><div className="divide-y divide-line">{[
          ['Critical finding confirmed', 'SQL injection · Northstar Financial', '8 min ago', 'bg-red-500'],
          ['Authorization document approved', 'External Infrastructure Review', '42 min ago', 'bg-brand-500'],
          ['Scan job completed', 'JOB-8F3E2 · 12 findings imported', '1 hr ago', 'bg-blue-500'],
        ].map(([title, text, time, color]) => <button key={title} className="flex w-full gap-3 px-4 py-3 text-start hover:bg-canvas"><span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', color)} /><span className="flex-1"><span className="block text-xs font-semibold">{title}</span><span className="mt-1 block text-[11px] text-muted">{text}</span><span className="mt-1.5 block text-[10px] text-muted/70">{time}</span></span></button>)}</div><button onClick={() => setNotificationsOpen(false)} className="block w-full border-t border-line py-3 text-center text-xs font-semibold text-brand-700 hover:bg-canvas">Mark all as read</button></div></>}
      </div>
      <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
      <div className="relative">
        <button className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-canvas" onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }} aria-expanded={profileOpen}><Avatar name="Omar Khaled" initials="OK" size="sm" className="rounded-full bg-navy-900 text-white dark:bg-brand-600" /><span className="hidden text-start xl:block"><span className="block text-xs font-semibold">Omar Khaled</span><span className="block text-[10px] text-muted">Administrator</span></span><ChevronDown className="hidden h-3.5 w-3.5 text-muted xl:block" /></button>
        {profileOpen && <><button className="fixed inset-0 z-10 cursor-default" aria-label="Close profile menu" onClick={() => setProfileOpen(false)} /><div className="absolute end-0 top-12 z-20 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-lift animate-fade-up"><div className="border-b border-line px-3 py-2.5 xl:hidden"><p className="text-xs font-semibold">Omar Khaled</p><p className="text-[10px] text-muted">Administrator</p></div>{[
          { label: 'My profile', href: `/${locale}/profile`, icon: CircleUserRound }, { label: 'Settings', href: `/${locale}/settings`, icon: Settings },
        ].map((item) => <Link key={item.label} href={item.href} onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium hover:bg-canvas"><item.icon className="h-4 w-4 text-muted" />{item.label}</Link>)}<div className="my-1 border-t border-line" /><Link href={`/${locale}/login`} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Sign out</Link></div></>}
      </div>
    </div>
  </header>;
}
