'use client';

import { Filter, Search } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';

export interface AuditFilters { search: string; action: string; resource_type: string }
export function AuditLogFilters({ value, onChange }: { value: AuditFilters; onChange: (value: AuditFilters) => void }) {
  return <div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search className="absolute start-3 top-3 h-4 w-4 text-muted" /><Input aria-label="Search audit events" className="ps-9" placeholder="Search actor, resource, or request ID" value={value.search} onChange={(event) => onChange({ ...value, search: event.target.value })} /></div><Select aria-label="Audit action" value={value.action} onChange={(event) => onChange({ ...value, action: event.target.value })}><option value="">All actions</option><option value="create">Create</option><option value="update">Update</option><option value="delete">Delete</option><option value="login">Login</option><option value="export">Export</option></Select><Select aria-label="Resource type" value={value.resource_type} onChange={(event) => onChange({ ...value, resource_type: event.target.value })}><option value="">All resources</option><option value="engagement">Engagements</option><option value="job">Jobs</option><option value="finding">Findings</option><option value="report">Reports</option><option value="user">Users</option></Select><Filter className="hidden h-4 w-4 self-center text-muted lg:block" /></div>;
}
