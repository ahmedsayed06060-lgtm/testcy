'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { CheckCircle2, ChevronRight, Plus, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/input';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSkeleton } from '@/components/common/loading-skeleton';
import { AppUploadForm } from './app-upload-form';
import { StaticAnalysisResults } from './static-analysis-results';
import { MASVSChecklist } from './masvs-checklist';
import { useMobileAnalyses, useMobileAnalysis, useMobileScan } from '@/hooks/use-mobile';
import { useEngagements } from '@/hooks/use-engagements';
import { useToast } from '@/components/ui/toast';

export function MobileView({ selectedId, uploadOpen = false }: { selectedId?: string; uploadOpen?: boolean }) {
  return selectedId ? <MobileDetail id={selectedId} /> : <MobileLibrary uploadOpen={uploadOpen} />;
}
function MobileLibrary({ uploadOpen }: { uploadOpen: boolean }) {
  const locale = useLocale();
  const engagements = useEngagements({ limit: 100 });
  const [engagementId, setEngagementId] = useState('');
  const selectedEngagement = engagementId || engagements.data?.items[0]?.id || '';
  const analyses = useMobileAnalyses(selectedEngagement);
  const [open, setOpen] = useState(uploadOpen);
  const items = analyses.data?.items ?? [];
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow="Assessment module" title="Mobile security" description="Analyze Android and iOS applications with MobSF automation and guided MASVS review." actions={<Button disabled={!selectedEngagement} onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Upload application</Button>} /><Select aria-label="Mobile engagement" value={selectedEngagement} onChange={(event) => setEngagementId(event.target.value)}><option value="">Select an engagement</option>{engagements.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><Smartphone className="h-5 w-5 text-brand-600" /><p className="mt-3 text-2xl font-semibold">{items.length}</p><p className="text-xs text-muted">Applications in this engagement</p></Card><Card className="p-5"><ShieldCheck className="h-5 w-5 text-blue-600" /><p className="mt-3 text-2xl font-semibold">{items.filter((item) => item.static_results).length}</p><p className="text-xs text-muted">Completed static analyses</p></Card><Card className="p-5"><CheckCircle2 className="h-5 w-5 text-violet-600" /><p className="mt-3 text-2xl font-semibold">{items.filter((item) => Object.keys(item.manual_checklist).length > 0).length}</p><p className="text-xs text-muted">Manual MASVS reviews started</p></Card></div><Card className="overflow-hidden"><CardHeader><div><CardTitle>Application analyses</CardTitle><CardDescription>Authorized binaries and their latest persisted analysis</CardDescription></div></CardHeader>{analyses.isLoading ? <div className="p-5"><LoadingSkeleton rows={4} /></div> : <div className="divide-y divide-line">{items.map((app) => <div key={app.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950"><Smartphone className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{app.app_name}</p><p className="mt-1 font-mono text-[10px] text-muted">{app.package_name} · v{app.version || 'unversioned'}</p></div><Badge>{app.platform}</Badge><Badge variant={app.static_results ? 'success' : 'warning'}>{app.static_results ? 'Static results available' : 'Awaiting analysis'}</Badge><span className="text-[11px] text-muted">{Object.keys(app.manual_checklist).length} MASVS controls reviewed</span><Link href={`/${locale}/mobile/${app.id}`}><Button size="sm" variant="secondary">Review<ChevronRight className="h-3.5 w-3.5" /></Button></Link></div>)}{!items.length && <EmptyState title="No applications found" description={analyses.isError ? 'Select an accessible engagement and check the API connection.' : 'Upload an APK or IPA to begin an authorized assessment.'} />}</div>}</Card><Modal open={open} onClose={() => setOpen(false)} title="Upload mobile application" description="Binaries are hashed, malware-screened, and analyzed only within an authorized engagement."><div className="p-6"><AppUploadForm engagementId={selectedEngagement} onUploaded={() => setOpen(false)} /></div></Modal></div>;
}
function MobileDetail({ id }: { id: string }) {
  const analysis = useMobileAnalysis(id);
  const scan = useMobileScan(id);
  const { toast } = useToast();
  if (analysis.isLoading) return <LoadingSkeleton rows={6} />;
  if (!analysis.data) return <EmptyState title="Analysis unavailable" description="The application is outside your authorized engagements or the API is unavailable." />;
  const item = analysis.data;
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow="Mobile Security / MASVS" title={item.app_name} description={`${item.package_name} · ${item.version || 'Unversioned'}`} actions={<Button loading={scan.isPending} onClick={() => { void scan.mutateAsync().then(() => toast('Analysis queued', 'Authorization will be revalidated by the worker.')).catch((error: unknown) => toast('Analysis rejected', error instanceof Error ? error.message : undefined, 'error')); }}><ShieldCheck className="h-4 w-4" />Run authorized analysis</Button>} /><div className="grid items-start gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle>MASVS manual checklist</CardTitle><CardDescription>Cycle each control through not reviewed, passed, and review needed</CardDescription></CardHeader><CardContent><MASVSChecklist key={item.id} analysis={item} /></CardContent></Card><Card><CardHeader><CardTitle>Static analysis results</CardTitle><CardDescription>Persisted MobSF results and integrity metadata</CardDescription></CardHeader><CardContent><StaticAnalysisResults analysis={item} /></CardContent></Card></div></div>;
}
