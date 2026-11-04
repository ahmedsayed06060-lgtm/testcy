import { JobDetail } from '@/components/jobs/job-detail';
export default function Page({ params }: { params: { id: string } }) { return <JobDetail id={params.id} />; }
