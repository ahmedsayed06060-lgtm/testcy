'use client';

import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { useFindingComment } from '@/hooks/use-findings';
import { useToast } from '@/components/ui/toast';
import type { ApiFinding } from '@/types/api';

export function FindingComments({ finding }: { finding: ApiFinding }) {
  const [text, setText] = useState('');
  const mutation = useFindingComment(finding.id);
  const { toast } = useToast();
  const submit = async () => { if (!text.trim()) return; try { await mutation.mutateAsync(text); setText(''); toast('Comment added'); } catch (error) { toast('Comment could not be saved', error instanceof Error ? error.message : undefined, 'error'); } };
  return <div><div className="space-y-3">{finding.comments.map((comment) => <div key={comment.id} className="rounded-lg bg-canvas/50 p-3"><p className="flex items-center gap-2 text-xs font-medium"><MessageSquare className="h-3.5 w-3.5 text-brand-600" />{comment.author}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted">{comment.text}</p><time className="mt-2 block text-[10px] text-muted">{new Date(comment.created_at).toLocaleString()}</time></div>)}{!finding.comments.length && <p className="text-xs text-muted">No internal comments are available.</p>}</div><div className="mt-4"><Textarea aria-label="New internal comment" value={text} onChange={(event) => setText(event.target.value)} placeholder="Add an internal review comment" /><Button size="sm" className="mt-3" disabled={!text.trim()} loading={mutation.isPending} onClick={() => void submit()}><Send className="h-3.5 w-3.5" />Add comment</Button></div></div>;
}
