'use client';

import { useState } from 'react';
import { OctagonX, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useKillSwitch } from '@/hooks/use-jobs';
import { useToast } from '@/components/ui/toast';

export function KillSwitchControl() {
  const [open, setOpen] = useState(false);
  const mutation = useKillSwitch();
  const { toast } = useToast();
  const activate = async () => {
    try { const result = await mutation.mutateAsync(); toast('Global kill switch activated', `${result.cancelled_jobs} running jobs were cancelled.`); }
    catch (error) { toast('Kill switch failed', error instanceof Error ? error.message : 'Administrator access is required.', 'error'); }
  };
  return <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900 dark:bg-red-950/20"><div className="flex items-start gap-3"><ShieldAlert className="h-5 w-5 shrink-0 text-red-600" /><div><h3 className="text-sm font-semibold text-red-900 dark:text-red-200">Global emergency kill switch</h3><p className="mt-1 text-xs leading-5 text-red-800/80 dark:text-red-300/80">Administrator-only control that cancels all running jobs. Authorization remains fail-closed.</p><Button variant="danger" size="sm" className="mt-4" loading={mutation.isPending} onClick={() => setOpen(true)}><OctagonX className="h-4 w-4" />Activate global kill switch</Button></div></div><ConfirmDialog open={open} onClose={() => setOpen(false)} onConfirm={() => void activate()} title="Stop all running security jobs?" description="This tenant-wide action creates an audit event and cancels every running job. Use only for an operational emergency." confirmLabel="Activate global kill switch" destructive /></div>;
}
