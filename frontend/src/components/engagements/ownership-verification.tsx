'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScopeBuilder } from './scope-builder';

export function OwnershipVerification({ engagementId }: { engagementId: string }) {
  return <Card className="overflow-hidden"><CardHeader><div><CardTitle>Scope ownership verification</CardTitle><CardDescription>Generate DNS challenges or start manual network verification; worker checks remain mandatory</CardDescription></div></CardHeader><CardContent className="p-0"><ScopeBuilder engagementId={engagementId} /></CardContent></Card>;
}
