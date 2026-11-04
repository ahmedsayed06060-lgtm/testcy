import { ClientDetail } from '@/components/common/client-detail';
export default function Page({ params }: { params: { id: string } }) { return <ClientDetail id={params.id} />; }
