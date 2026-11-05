import { ReportsView } from '@/components/reports/reports-view';
export default async function GenerateReportPage({ searchParams }: { searchParams: Promise<{ engagement?: string }> }) { const { engagement } = await searchParams; return <ReportsView initialEngagement={engagement} autoOpen />; }
