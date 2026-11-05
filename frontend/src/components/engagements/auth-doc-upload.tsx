'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/input';
import { FileUpload } from '@/components/common/file-upload';
import { useUploadAuthorizationDoc } from '@/hooks/use-engagements';
import { useToast } from '@/components/ui/toast';
import type { ApiAuthorizationDoc } from '@/types/api';

export function AuthDocUpload({ engagementId }: { engagementId: string }) {
  const [file, setFile] = useState<File>();
  const [docType, setDocType] = useState<ApiAuthorizationDoc['doc_type']>('authorization_letter');
  const upload = useUploadAuthorizationDoc(engagementId);
  const { toast } = useToast();
  const submit = async () => { if (!file) return; try { await upload.mutateAsync({ file, doc_type: docType }); setFile(undefined); toast('Authorization uploaded', 'An independent manager must review the document before execution.'); } catch (error) { toast('Upload rejected', error instanceof Error ? error.message : undefined, 'error'); } };
  return <div className="space-y-4 rounded-xl border border-line p-4"><Field label="Document type"><Select value={docType} onChange={(event) => setDocType(event.target.value as ApiAuthorizationDoc['doc_type'])}><option value="authorization_letter">Authorization letter</option><option value="contract">Contract</option><option value="nda">NDA</option><option value="scope_addendum">Scope addendum</option><option value="phishing">Phishing-specific authorization</option></Select></Field><FileUpload accept=".pdf,.png,.jpg,.jpeg" onFile={setFile} /><Button size="sm" disabled={!file} loading={upload.isPending} onClick={() => void submit()}>Upload for independent review</Button></div>;
}
