import { EngagementDetail } from '@/components/engagements/engagement-detail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <EngagementDetail id={id} tab="jobs" />; }
