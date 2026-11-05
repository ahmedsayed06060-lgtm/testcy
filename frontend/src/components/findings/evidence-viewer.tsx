'use client';

import { Download, FileLock2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import type { ApiFinding } from '@/types/api';

export function EvidenceViewer({ finding }: { finding: ApiFinding }) {
  const { toast } = useToast();
  const download = async (id: string) => { try { const result = await api<{ download_url: string }>(`/findings/${finding.id}/evidence/${id}/download`); window.open(result.download_url, '_blank', 'noopener,noreferrer'); } catch (error) { toast('Evidence download unavailable', error instanceof Error ? error.message : undefined, 'error'); } };
  if (!finding.evidence_files.length) return <p className="text-xs text-muted">No protected evidence files have been uploaded.</p>;
  return <ul className="space-y-3">{finding.evidence_files.map((file) => <li key={file.id} className="flex items-center gap-3 rounded-lg border border-line p-3"><FileLock2 className="h-4 w-4 text-brand-600" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{file.filename}</p><p className="mt-1 text-[10px] text-muted">{file.mime_type} · {(file.size / 1024).toFixed(1)} KB</p></div><Button variant="ghost" size="sm" aria-label={`Download ${file.filename}`} onClick={() => void download(file.id)}><Download className="h-4 w-4" /></Button></li>)}</ul>;
}
