'use client';

import { useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SeverityBadge, StatusBadge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/page-header';
import { LoadingSkeleton } from '@/components/common/loading-skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { Field, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EvidenceViewer } from './evidence-viewer';
import { EvidenceUploader } from './evidence-uploader';
import { FindingComments } from './finding-comments';
import { useAcknowledgeFinding, useFinding, useFindingRetest } from '@/hooks/use-findings';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/toast';

export function FindingDetail({ id }: { id: string }) {
  const finding = useFinding(id);
  const acknowledge = useAcknowledgeFinding(id);
  const retest = useFindingRetest(id);
  const role = useAuthStore((state) => state.user?.role);
  const [reason, setReason] = useState('');
  const [retestResult, setRetestResult] = useState('');
  const [retestNotes, setRetestNotes] = useState('');
  const { toast } = useToast();
  if (finding.isLoading) return <LoadingSkeleton rows={7} />;
  if (!finding.data) return <EmptyState title="Finding unavailable" description="The finding does not exist, is outside your tenant, or the API is unavailable." />;
  const item = finding.data;
  const acceptRisk = async () => { try { await acknowledge.mutateAsync(reason); setReason(''); toast('Risk acknowledgement recorded'); } catch (error) { toast('Acknowledgement rejected', error instanceof Error ? error.message : undefined, 'error'); } };
  const submitRetest = async () => { try { await retest.mutateAsync({ result: retestResult, notes: retestNotes }); setRetestResult(''); setRetestNotes(''); toast('Retest result recorded'); } catch (error) { toast('Retest could not be recorded', error instanceof Error ? error.message : undefined, 'error'); } };
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow={`Finding / ${item.id}`} title={item.title} description={item.affected_asset} actions={<div className="flex gap-2"><SeverityBadge severity={item.severity} score={item.cvss_score ?? undefined} /><StatusBadge status={item.status} /></div>} /><div className="grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]"><div className="space-y-6"><Card><CardHeader><CardTitle>Technical description</CardTitle><CardDescription>{item.cvss_vector || 'No CVSS vector recorded'} · {item.cwe_id || 'No CWE mapping'}</CardDescription></CardHeader><CardContent className="space-y-5 text-xs leading-6"><section><h3 className="font-semibold">Description</h3><p className="mt-2 whitespace-pre-wrap text-muted">{item.description}</p></section>{item.business_impact && <section><h3 className="font-semibold">Business impact</h3><p className="mt-2 whitespace-pre-wrap text-muted">{item.business_impact}</p></section>}<section><h3 className="font-semibold">Evidence summary</h3><p className="mt-2 whitespace-pre-wrap text-muted">{item.evidence || 'No textual evidence summary was provided.'}</p></section><section><h3 className="font-semibold">Remediation</h3><p className="mt-2 whitespace-pre-wrap text-muted">{item.remediation || 'No remediation guidance has been recorded.'}</p></section></CardContent></Card><Card><CardHeader><CardTitle>Internal review comments</CardTitle></CardHeader><CardContent><FindingComments finding={item} /></CardContent></Card></div><div className="space-y-6"><Card><CardHeader><CardTitle>Protected evidence</CardTitle><CardDescription>Raw evidence is never exposed to client users</CardDescription></CardHeader><CardContent className="space-y-4"><EvidenceViewer finding={item} />{role !== 'client' && <EvidenceUploader findingId={id} />}</CardContent></Card><Card><CardHeader><CardTitle>Risk acknowledgement</CardTitle><CardDescription>Requires an authorized client or manager role</CardDescription></CardHeader><CardContent><Field label="Business justification" required><Textarea value={reason} onChange={(event) => setReason(event.target.value)} /></Field><Button className="mt-3" size="sm" disabled={!reason.trim()} loading={acknowledge.isPending} onClick={() => void acceptRisk()}><CheckCircle2 className="h-4 w-4" />Acknowledge risk</Button></CardContent></Card><Card><CardHeader><CardTitle>Record retest</CardTitle></CardHeader><CardContent className="space-y-3"><Field label="Result" required><Textarea value={retestResult} onChange={(event) => setRetestResult(event.target.value)} /></Field><Field label="Validation notes" required><Textarea value={retestNotes} onChange={(event) => setRetestNotes(event.target.value)} /></Field><Button size="sm" disabled={retestResult.trim().length < 2 || retestNotes.trim().length < 2} loading={retest.isPending} onClick={() => void submitRetest()}><ShieldAlert className="h-4 w-4" />Save retest</Button></CardContent></Card></div></div></div>;
}
