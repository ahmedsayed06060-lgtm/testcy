import { FileLock2 } from 'lucide-react';
import type { ApiReport } from '@/types/api';

export function ReportPreview({ report }: { report: ApiReport }) {
  return <div className="rounded-xl border border-line bg-canvas/40 p-6"><FileLock2 className="h-7 w-7 text-brand-600" /><h2 className="mt-3 text-sm font-semibold capitalize">{report.report_type.replaceAll('_', ' ')}</h2><dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><div><dt className="text-muted">Language</dt><dd className="mt-1">{report.language === 'ar' ? 'Arabic · RTL' : 'English · LTR'}</dd></div><div><dt className="text-muted">Format</dt><dd className="mt-1 uppercase">{report.format}</dd></div><div><dt className="text-muted">Created</dt><dd className="mt-1">{new Date(report.created_at).toLocaleString()}</dd></div><div><dt className="text-muted">Size</dt><dd className="mt-1">{report.file_size ? `${(report.file_size / 1024).toFixed(1)} KB` : 'Rendering or unavailable'}</dd></div></dl><p className="mt-5 text-[11px] leading-5 text-muted">Protected report content is delivered through the authorized signed download endpoint rather than embedded in the browser.</p></div>;
}
