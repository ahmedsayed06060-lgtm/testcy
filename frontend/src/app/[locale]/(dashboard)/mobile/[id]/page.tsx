import { MobileView } from '@/components/mobile/mobile-view';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <MobileView selectedId={id} />; }
