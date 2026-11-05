import { FindingDetail } from '@/components/findings/finding-detail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <FindingDetail id={id} />; }
