'use client';

import { useQuery } from '@tanstack/react-query';
import { Copy, Download, TerminalSquare } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { apiBlob } from '@/lib/api-client';

export function JobOutputViewer({ jobId, available = true }: { jobId: string; available?: boolean }) {
  const { toast } = useToast();
  const output = useQuery({ queryKey: ['jobs', jobId, 'output'], queryFn: async () => { const blob = await apiBlob(`/jobs/${jobId}/output`); return { blob, text: await blob.text() }; }, enabled: available, retry: false });
  const download = () => { if (!output.data) return; const url = URL.createObjectURL(output.data.blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${jobId}.log`; anchor.click(); URL.revokeObjectURL(url); };
  return <div><div className="flex items-center justify-between border-b border-navy-800 bg-navy-900 px-4 py-2.5"><p className="flex items-center gap-2 text-[11px] text-slate-300"><TerminalSquare className="h-3.5 w-3.5" />Persisted worker output</p><div className="flex gap-1"><button aria-label="Copy job output" disabled={!output.data} className="icon-button h-7 w-7 text-slate-500" onClick={() => { if (output.data) { void navigator.clipboard.writeText(output.data.text); toast('Output copied'); } }}><Copy className="h-3.5 w-3.5" /></button><button aria-label="Download job output" disabled={!output.data} className="icon-button h-7 w-7 text-slate-500" onClick={download}><Download className="h-3.5 w-3.5" /></button></div></div><pre className="scrollbar-thin min-h-[350px] max-h-[600px] overflow-auto whitespace-pre-wrap break-words bg-navy-950 p-5 font-mono text-[11px] leading-6 text-slate-400">{!available ? 'No raw output has been persisted for this job.' : output.isLoading ? 'Loading protected worker output…' : output.isError ? 'Raw output is unavailable to this role or no longer exists.' : `${output.data?.text.slice(0, 1_000_000) || 'The output file is empty.'}${(output.data?.text.length ?? 0) > 1_000_000 ? '\n… Display truncated; download the artifact for the complete output.' : ''}`}</pre><div className="border-t border-navy-800 bg-navy-900 px-4 py-2.5 text-[10px] text-slate-500">Raw output is available only to authorized staff, never to client portal users.</div></div>;
}
