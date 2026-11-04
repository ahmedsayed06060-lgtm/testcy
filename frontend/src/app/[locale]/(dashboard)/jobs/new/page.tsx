'use client';
import { useEffect } from 'react';
import { ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/common/page-header';
import { useUIStore } from '@/stores/ui-store';
export default function NewJobPage() { const open = useUIStore((state) => state.setJobFormOpen); useEffect(() => { open(true); }, [open]); return <div><PageHeader title="New authorized scan" description="Select an active engagement and verified targets for isolated execution." /><Card className="flex flex-col items-center py-16 text-center"><ScanSearch className="h-8 w-8 text-brand-600" /><h2 className="mt-4 text-base font-semibold">Authorization comes first</h2><p className="mt-2 max-w-md text-sm text-muted">The job wizard performs a pre-flight preview. The server and worker remain the authoritative enforcement points.</p><Button className="mt-6" onClick={() => open(true)}>Open scan wizard</Button></Card></div>; }
