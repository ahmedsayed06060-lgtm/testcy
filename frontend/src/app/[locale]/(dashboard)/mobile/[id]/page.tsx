import { MobileView } from '@/components/mobile/mobile-view';
export default function Page({ params }: { params: { id: string } }) { return <MobileView selectedId={params.id} />; }
