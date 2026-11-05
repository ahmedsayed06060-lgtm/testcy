'use client';

import { MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActiveSessions } from '@/hooks/use-users';
import { useToast } from '@/components/ui/toast';

export function ActiveSessions() {
  const { data, isLoading, revoke } = useActiveSessions();
  const { toast } = useToast();
  const revokeSession = async (id: string) => { try { await revoke.mutateAsync(id); toast('Session revoked'); } catch { toast('Could not revoke session', undefined, 'error'); } };
  return <div className="divide-y divide-line">{isLoading && <p className="py-4 text-xs text-muted">Loading active sessions…</p>}{data?.map((session) => <div key={session.id} className="flex items-center gap-4 py-4"><MonitorSmartphone className="h-5 w-5 shrink-0 text-muted" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{session.user_agent || 'Authenticated browser session'}</p><p className="mt-1 text-[11px] text-muted">Started {new Date(session.created_at).toLocaleString()} · expires {new Date(session.expires_at).toLocaleDateString()}</p></div><Button variant="ghost" size="sm" disabled={revoke.isPending} onClick={() => void revokeSession(session.id)}>Revoke</Button></div>)}{data?.length === 0 && <p className="py-4 text-xs text-muted">No active sessions were returned.</p>}<p className="flex items-center gap-2 pt-4 text-[11px] text-muted"><ShieldCheck className="h-4 w-4" />Password changes revoke all refresh-token sessions.</p></div>;
}
