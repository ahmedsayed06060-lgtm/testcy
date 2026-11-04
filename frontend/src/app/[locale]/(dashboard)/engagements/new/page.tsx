'use client';

import { useEffect } from 'react';
import { FilePlus2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/common/page-header';
import { useUIStore } from '@/stores/ui-store';

export default function NewEngagementPage() {
  const open = useUIStore((state) => state.setEngagementFormOpen);
  useEffect(() => { open(true); }, [open]);
  return <div><PageHeader title="New engagement" description="Create a draft, then establish authorized scope and verified ownership." /><Card className="flex flex-col items-center px-6 py-16 text-center"><FilePlus2 className="h-8 w-8 text-brand-600" /><h2 className="mt-4 text-base font-semibold">Start an authorized assessment</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted">The creation wizard defines the client, assessment window, rules of engagement, and emergency escalation path.</p><Button className="mt-6" onClick={() => open(true)}><Plus className="h-4 w-4" />Open creation wizard</Button></Card></div>;
}
