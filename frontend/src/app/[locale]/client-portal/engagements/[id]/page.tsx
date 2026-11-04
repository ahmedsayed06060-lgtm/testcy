import { ClientPortalView } from '@/components/common/client-portal-view';
export default function Page({ params }: { params: { id: string } }) { return <ClientPortalView id={params.id} />; }
