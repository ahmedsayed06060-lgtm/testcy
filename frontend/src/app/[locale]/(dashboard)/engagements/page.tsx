'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/page-header';
import { EngagementTable } from '@/components/engagements/engagement-table';
import { useUIStore } from '@/stores/ui-store';

export default function EngagementsPage() {
  const open = useUIStore((state) => state.setEngagementFormOpen);
  return <div className="animate-fade-up"><PageHeader eyebrow="Security operations" title="Engagements" description="Manage authorized assessments, testing windows, scope, and delivery from one workspace." actions={<Button onClick={() => open(true)}><Plus className="h-4 w-4" />New engagement</Button>} /><EngagementTable title="All engagements" description="Every assessment and its current authorization posture" /></div>;
}
