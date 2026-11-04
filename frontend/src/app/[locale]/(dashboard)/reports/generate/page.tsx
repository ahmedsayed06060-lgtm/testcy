import { ReportsView } from '@/components/reports/reports-view';
export default function GenerateReportPage({ searchParams }: { searchParams: { engagement?: string } }) { return <ReportsView initialEngagement={searchParams.engagement} autoOpen />; }
