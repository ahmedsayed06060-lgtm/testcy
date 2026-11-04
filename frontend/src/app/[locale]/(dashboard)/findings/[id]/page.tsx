import { FindingDetail } from '@/components/findings/finding-detail';
export default function Page({ params }: { params: { id: string } }) { return <FindingDetail id={params.id} />; }
