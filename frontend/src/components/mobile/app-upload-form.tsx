'use client';

import { useState } from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { FileUpload } from '@/components/common/file-upload';
import { useUploadMobileAnalysis } from '@/hooks/use-mobile';
import { useToast } from '@/components/ui/toast';
import type { ApiMobileAnalysis } from '@/types/api';

export function AppUploadForm({ engagementId, onUploaded }: { engagementId: string; onUploaded?: (analysis: ApiMobileAnalysis) => void }) {
  const [form, setForm] = useState({ app_name: '', package_name: '', version: '', platform: 'android' as 'android' | 'ios' });
  const [file, setFile] = useState<File>();
  const upload = useUploadMobileAnalysis();
  const { toast } = useToast();
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => { if (!file || !engagementId) return; try { const result = await upload.mutateAsync({ engagement_id: engagementId, ...form, version: form.version || undefined, file }); onUploaded?.(result); setFile(undefined); toast('Application uploaded securely', 'MobSF execution still requires app_id scope and worker authorization.'); } catch (error) { toast('Application upload rejected', error instanceof Error ? error.message : undefined, 'error'); } };
  return <div className="space-y-4"><Field label="Application name" required><Input required value={form.app_name} onChange={(event) => set('app_name', event.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Platform"><Select value={form.platform} onChange={(event) => set('platform', event.target.value)}><option value="android">Android</option><option value="ios">iOS</option></Select></Field><Field label="Version"><Input value={form.version} onChange={(event) => set('version', event.target.value)} /></Field></div><Field label="Package / bundle identifier" required hint="This identifier must exactly match an authorized app_id scope item."><Input required value={form.package_name} onChange={(event) => set('package_name', event.target.value)} placeholder="com.example.app" /></Field><FileUpload accept=".apk,.ipa" onFile={(selected) => { setFile(selected); if (!form.platform || (selected.name.endsWith('.ipa') && form.platform !== 'ios')) set('platform', selected.name.endsWith('.ipa') ? 'ios' : 'android'); }} /><Button disabled={!file || !form.app_name || !form.package_name || !engagementId} loading={upload.isPending} onClick={() => void submit()}><FileUp className="h-4 w-4" />Upload protected binary</Button></div>;
}
