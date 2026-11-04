import { EngagementDetail } from '@/components/engagements/engagement-detail';
export default function Page({ params }: { params: { id: string } }) { return <EngagementDetail id={params.id} tab="scope" />; }
