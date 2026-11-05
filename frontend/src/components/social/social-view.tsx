'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Eye, Fingerprint, Plus, Search, Send, ShieldCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Modal } from '@/components/ui/modal';
import { Field, Input, Select } from '@/components/ui/input';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSkeleton } from '@/components/common/loading-skeleton';
import { CampaignWizard } from './campaign-wizard';
import { CampaignChart } from './campaign-chart';
import { ImpersonationResults } from './impersonation-results';
import { PlatformChecklist } from './platform-checklist';
import { useCancelCampaign, useCreateSocialAssessment, useImpersonationScan, usePhishingCampaign, usePhishingCampaigns, useSendCampaign, useSocialAssessment, useSocialAssessments, useCampaignResults } from '@/hooks/use-social';
import { useEngagements } from '@/hooks/use-engagements';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export function SocialView({ initialTab = 'posture', selectedId, campaignId, createCampaign = false }: { initialTab?: string; selectedId?: string; campaignId?: string; createCampaign?: boolean }) {
  if (selectedId) return <SocialAssessmentDetail id={selectedId} />;
  if (campaignId) return <CampaignDetail id={campaignId} />;
  return <SocialLibrary initialTab={initialTab} createCampaign={createCampaign} />;
}
function SocialLibrary({ initialTab, createCampaign }: { initialTab: string; createCampaign: boolean }) {
  const locale = useLocale();
  const [tab, setTab] = useState(initialTab);
  const engagements = useEngagements({ limit: 100 });
  const [engagementId, setEngagementId] = useState('');
  const selectedEngagement = engagementId || engagements.data?.items[0]?.id || '';
  const assessments = useSocialAssessments(selectedEngagement);
  const campaigns = usePhishingCampaigns(selectedEngagement);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(createCampaign);
  const [platform, setPlatform] = useState('linkedin');
  const [handle, setHandle] = useState('');
  const create = useCreateSocialAssessment();
  const { toast } = useToast();
  const addAssessment = async () => { try { await create.mutateAsync({ engagement_id: selectedEngagement, platform, account_handle: handle }); setAssessmentOpen(false); setHandle(''); toast('Social assessment created'); } catch (error) { toast('Assessment could not be created', error instanceof Error ? error.message : undefined, 'error'); } };
  return <div className="space-y-6 animate-fade-up"><PageHeader eyebrow="Assessment module" title="Social security assessment" description="Evaluate account posture, public brand impersonation, and authorized security awareness." actions={<><Button variant="secondary" disabled={!selectedEngagement} onClick={() => setAssessmentOpen(true)}><Plus className="h-4 w-4" />New assessment</Button><Button disabled={!selectedEngagement} onClick={() => setCampaignOpen(true)}><Send className="h-4 w-4" />New simulation</Button></>} /><Select aria-label="Social engagement" value={selectedEngagement} onChange={(event) => setEngagementId(event.target.value)}><option value="">Select an engagement</option>{engagements.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><div className="flex gap-1 border-b border-line">{[['posture', 'Account posture'], ['impersonation', 'Impersonation monitoring'], ['phishing', 'Phishing simulations']].map(([key, label]) => <button key={key} onClick={() => setTab(key!)} className={cn('relative px-4 py-3 text-xs font-medium', tab === key ? 'text-brand-700 dark:text-brand-400' : 'text-muted')}>{label}{tab === key && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-brand-600" />}</button>)}</div>{tab === 'posture' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{assessments.data?.items.map((assessment) => <Link href={`/${locale}/social/${assessment.id}`} key={assessment.id}><Card className="h-full p-5 transition hover:border-brand-300"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950"><UserX className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold capitalize">{assessment.platform.replaceAll('_', ' ')}</h2><p className="mt-1 text-[10px] text-muted">{assessment.account_handle}</p></div></div><div className="mt-5 flex items-end justify-between"><span className="text-2xl font-semibold">{assessment.posture_score ?? '—'}</span><Badge>{Object.keys(assessment.checklist_results).length} controls</Badge></div><Progress value={Number(assessment.posture_score ?? 0)} className="mt-3" /></Card></Link>)}{!assessments.data?.items.length && <div className="sm:col-span-2 xl:col-span-4"><EmptyState title="No social assessments" description={assessments.isError ? 'Check the selected engagement and API connection.' : 'Create an assessment for an authorized social account.'} /></div>}</div>}{tab === 'impersonation' && <Card className="overflow-hidden"><CardHeader><div><CardTitle>Public impersonation results</CardTitle><CardDescription>Public data only · no account login, credential testing, or private data access</CardDescription></div></CardHeader><div className="divide-y divide-line">{assessments.data?.items.map((assessment) => <div key={assessment.id} className="p-5"><div className="mb-4 flex items-center gap-3"><Fingerprint className="h-4 w-4 text-brand-600" /><p className="flex-1 text-xs font-semibold">{assessment.account_handle}</p><Link href={`/${locale}/social/${assessment.id}`}><Button size="sm" variant="secondary"><Eye className="h-3.5 w-3.5" />Review</Button></Link></div><ImpersonationResults findings={assessment.impersonation_findings} /></div>)}{!assessments.data?.items.length && <EmptyState />}</div><div className="flex gap-2 border-t border-line bg-canvas/40 px-5 py-3 text-[11px] text-muted"><ShieldCheck className="h-4 w-4 text-brand-600" />Results require analyst review; public candidates are not proof of malicious ownership.</div></Card>}{tab === 'phishing' && <><div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-950"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /><div><p className="text-xs font-semibold">Awareness without credential collection</p><p className="mt-1 text-[11px] leading-5 text-muted">Clicks redirect immediately to training. No passwords are requested or stored. Metrics are department-level aggregates.</p></div></div><Card className="overflow-hidden"><CardHeader><CardTitle>Awareness campaigns</CardTitle></CardHeader><div className="divide-y divide-line">{campaigns.data?.items.map((campaign) => <Link key={campaign.id} href={`/${locale}/social/phishing/${campaign.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-canvas"><Send className="h-4 w-4 text-brand-600" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{campaign.name}</p><p className="mt-1 text-[10px] text-muted">{campaign.subject_line} · {campaign.sent_count} sent</p></div><StatusBadge status={campaign.status} /></Link>)}{!campaigns.data?.items.length && <EmptyState title="No campaigns found" description="Create a campaign only after phishing-specific authorization is independently approved." />}</div></Card></>}<Modal open={assessmentOpen} onClose={() => setAssessmentOpen(false)} title="Create social assessment" description="Only accounts explicitly included in authorized scope may be assessed."><div className="space-y-4 p-6"><Field label="Platform"><Select value={platform} onChange={(event) => setPlatform(event.target.value)}>{['linkedin', 'instagram', 'facebook', 'x', 'tiktok', 'youtube', 'whatsapp_business', 'telegram'].map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</Select></Field><Field label="Authorized account handle" required><Input value={handle} onChange={(event) => setHandle(event.target.value)} /></Field><Button disabled={!handle.trim()} loading={create.isPending} onClick={() => void addAssessment()}>Create assessment</Button></div></Modal><Modal open={campaignOpen} onClose={() => setCampaignOpen(false)} title="Create awareness simulation" description="Phishing-specific approval and verified employee recipients are mandatory." size="xl"><div className="max-h-[65vh] overflow-y-auto p-6"><CampaignWizard engagementId={selectedEngagement} /></div></Modal></div>;
}
function SocialAssessmentDetail({ id }: { id: string }) {
  const assessment = useSocialAssessment(id);
  const scan = useImpersonationScan(id);
  const { toast } = useToast();
  if (assessment.isLoading) return <LoadingSkeleton rows={6} />;
  if (!assessment.data) return <EmptyState title="Assessment unavailable" />;
  const item = assessment.data;
  return <div className="space-y-6"><PageHeader eyebrow="Social security assessment" title={item.account_handle} description={`${item.platform.replaceAll('_', ' ')} · public-data and manual posture review`} actions={<Button loading={scan.isPending} onClick={() => { void scan.mutateAsync().then(() => toast('Public-data scan queued')).catch((error: unknown) => toast('Scan rejected', error instanceof Error ? error.message : undefined, 'error')); }}><Search className="h-4 w-4" />Run authorized public scan</Button>} /><div className="grid items-start gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle>Platform security checklist</CardTitle><CardDescription>Posture score: {item.posture_score ?? 'Not scored'}</CardDescription></CardHeader><CardContent><PlatformChecklist key={item.id} assessment={item} /></CardContent></Card><Card><CardHeader><CardTitle>Public impersonation candidates</CardTitle></CardHeader><CardContent><ImpersonationResults findings={item.impersonation_findings} /></CardContent></Card></div></div>;
}
function CampaignDetail({ id }: { id: string }) {
  const campaign = usePhishingCampaign(id);
  const metrics = useCampaignResults(id);
  const send = useSendCampaign(id);
  const cancel = useCancelCampaign(id);
  const { toast } = useToast();
  if (campaign.isLoading) return <LoadingSkeleton rows={6} />;
  if (!campaign.data) return <EmptyState title="Campaign unavailable" />;
  const item = campaign.data;
  return <div className="space-y-6"><PageHeader eyebrow="Authorized awareness campaign" title={item.name} description={item.subject_line} actions={<div className="flex gap-2"><StatusBadge status={item.status} />{item.status === 'draft' && <Button loading={send.isPending} onClick={() => { void send.mutateAsync().then(() => toast('Campaign queued')).catch((error: unknown) => toast('Campaign rejected', error instanceof Error ? error.message : undefined, 'error')); }}><Send className="h-4 w-4" />Send</Button>}{!['completed', 'cancelled'].includes(item.status) && <Button variant="danger" loading={cancel.isPending} onClick={() => { void cancel.mutateAsync().catch((error: unknown) => toast('Cancellation failed', error instanceof Error ? error.message : undefined, 'error')); }}>Cancel</Button>}</div>} /><div className="grid items-start gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle>Aggregate results</CardTitle><CardDescription>No individual recipient tracking</CardDescription></CardHeader><CardContent>{metrics.data ? <CampaignChart metrics={metrics.data} /> : <p className="text-xs text-muted">Loading campaign metrics…</p>}</CardContent></Card><Card><CardHeader><CardTitle>Department breakdown</CardTitle></CardHeader><CardContent><div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-line text-muted"><th className="py-2">Department</th><th>Sent</th><th>Opened</th><th>Clicked</th><th>Reported</th></tr></thead><tbody>{metrics.data?.departments.map((department) => <tr key={department.name} className="border-b border-line/60"><td className="py-2">{department.name}</td><td>{department.sent}</td><td>{department.opened}</td><td>{department.clicked}</td><td>{department.reported}</td></tr>)}</tbody></table></div></CardContent></Card></div></div>;
}
