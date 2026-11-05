import { SocialView } from '@/components/social/social-view';
export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <SocialView initialTab="phishing" campaignId={id} />; }
