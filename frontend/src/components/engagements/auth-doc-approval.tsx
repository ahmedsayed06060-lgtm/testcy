'use client';

import { useState } from 'react';
import { CheckCircle2, FileText, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Textarea } from '@/components/ui/input';
import { AuthDocUpload } from './auth-doc-upload';
import { useAuthorizationDocs, useReviewAuthorizationDoc } from '@/hooks/use-engagements';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/toast';

export function AuthDocApproval({ engagementId }: { engagementId: string }) {
  const documents = useAuthorizationDocs(engagementId);
  const review = useReviewAuthorizationDoc(engagementId);
  const userId = useAuthStore((state) => state.user?.id);
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const decide = async (id: string, decision: 'approve' | 'reject') => { try { await review.mutateAsync({ id, decision, reason }); setReason(''); toast(`Authorization ${decision === 'approve' ? 'approved' : 'rejected'}`); } catch (error) { toast('Review could not be saved', error instanceof Error ? error.message : undefined, 'error'); } };
  return <div className="space-y-5 p-5"><AuthDocUpload engagementId={engagementId} />{documents.isLoading && <p className="text-xs text-muted">Loading authorization chain…</p>}<div className="space-y-4">{documents.data?.map((document) => <div key={document.id} className="rounded-xl border border-line"><div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"><FileText className="h-6 w-6 shrink-0 text-brand-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{document.original_filename}</p><p className="mt-1 text-[11px] text-muted">{document.doc_type.replaceAll('_', ' ')} · {(document.file_size / 1024).toFixed(1)} KB · SHA-256 {document.sha256_hash.slice(0, 12)}…</p><div className="mt-2"><Badge variant={document.approved ? 'success' : document.approved === false ? 'danger' : 'warning'}>{document.approved ? 'Independently approved' : document.approved === false ? 'Rejected' : 'Awaiting independent approval'}</Badge></div>{document.rejection_reason && <p className="mt-2 text-xs text-red-600">{document.rejection_reason}</p>}</div>{document.approved === null && <div className="flex gap-2"><Button size="sm" disabled={document.uploaded_by === userId || review.isPending} title={document.uploaded_by === userId ? 'The uploader cannot approve their own document' : undefined} onClick={() => void decide(document.id, 'approve')}><CheckCircle2 className="h-4 w-4" />Approve</Button><Button size="sm" variant="danger" disabled={review.isPending} onClick={() => void decide(document.id, 'reject')}><XCircle className="h-4 w-4" />Reject</Button></div>}</div>{document.approved === null && <div className="border-t border-line p-4"><Field label="Rejection reason (required for rejection)"><Textarea value={reason} onChange={(event) => setReason(event.target.value)} /></Field></div>}</div>)}{documents.data?.length === 0 && <p className="text-xs text-muted">No authorization documents have been uploaded.</p>}</div><div className="flex gap-2 text-[11px] leading-5 text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />Uploading or approving a document does not itself authorize execution. Time, assignment, scope, exclusions, and ownership are independently checked.</div></div>;
}
