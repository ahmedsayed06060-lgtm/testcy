import { SocialView } from '@/components/social/social-view';
export default async function SocialDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <SocialView selectedId={id} />; }
