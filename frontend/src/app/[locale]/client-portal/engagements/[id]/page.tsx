import { ClientPortalView } from '@/components/common/client-portal-view';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ClientPortalView id={id} />; }
