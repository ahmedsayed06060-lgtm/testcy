import { UsersView } from '@/components/common/users-view';
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <UsersView selectedId={id} />; }
