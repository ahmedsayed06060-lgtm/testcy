'use client';

import { useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/common/file-upload';
import { useEvidenceUpload } from '@/hooks/use-findings';
import { useToast } from '@/components/ui/toast';

export function EvidenceUploader({ findingId }: { findingId: string }) {
  const [file, setFile] = useState<File>();
  const upload = useEvidenceUpload(findingId);
  const { toast } = useToast();
  const submit = async () => {
    if (!file) return;
    try { await upload.mutateAsync(file); toast('Evidence uploaded', 'The server validated, malware-scanned, and stored the protected artifact.'); setFile(undefined); }
    catch (error) { toast('Upload rejected', error instanceof Error ? error.message : undefined, 'error'); }
  };
  return <div className="rounded-xl border border-line p-4"><FileUpload accept=".png,.jpg,.jpeg,.txt,.json,.pdf" onFile={setFile} />{file && <p className="mt-3 flex items-center justify-center gap-2 text-xs"><FileCheck2 className="h-4 w-4 text-brand-600" />{file.name}</p>}<Button size="sm" className="mx-auto mt-4 flex" disabled={!file} loading={upload.isPending} onClick={() => void submit()}>Upload evidence</Button></div>;
}
