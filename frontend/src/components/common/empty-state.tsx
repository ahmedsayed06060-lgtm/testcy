import type { LucideIcon } from 'lucide-react';
import { SearchX } from 'lucide-react';

export function EmptyState({ icon: Icon = SearchX, title = 'No results found', description = 'Try changing your filters or search query.', action }: { icon?: LucideIcon; title?: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center px-6 py-16 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-canvas text-muted"><Icon className="h-5 w-5" /></span><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-1.5 max-w-sm text-xs leading-5 text-muted">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
