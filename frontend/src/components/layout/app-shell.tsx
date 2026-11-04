'use client';

import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { CommandPalette } from './command-palette';
import { EngagementForm } from '@/components/engagements/engagement-form';
import { JobCreateForm } from '@/components/jobs/job-create-form';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  return <div className="min-h-screen"><Sidebar /><div className={cn('min-h-screen transition-[padding] duration-300', collapsed ? 'lg:ps-[82px]' : 'lg:ps-[256px]')}><TopBar /><main className="mx-auto w-full max-w-[1700px] p-4 sm:p-6 lg:p-8">{children}</main><footer className="flex flex-col gap-2 border-t border-line px-6 py-5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© 2026 CyberOps Hub · Authorized security operations</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Platform operational · v1.0.0</span></footer></div><CommandPalette /><EngagementForm /><JobCreateForm /></div>;
}
