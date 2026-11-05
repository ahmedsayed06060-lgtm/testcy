'use client';

import { Modal } from '@/components/ui/modal';
import { useUIStore } from '@/stores/ui-store';
import { CreateEngagementForm } from './create-engagement-form';

export function EngagementForm() {
  const { engagementFormOpen, setEngagementFormOpen } = useUIStore();
  return <Modal open={engagementFormOpen} onClose={() => setEngagementFormOpen(false)} title="Create a new engagement" description="Define the assessment details. Execution remains disabled until all authorization checks pass." size="xl"><div className="max-h-[65vh] overflow-y-auto p-6"><CreateEngagementForm onCreated={() => setEngagementFormOpen(false)} /></div></Modal>;
}
