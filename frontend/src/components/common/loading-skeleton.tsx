export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3" aria-label="Loading content" aria-busy="true">{Array.from({ length: rows }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl border border-line bg-surface"><div className="h-full w-2/3 rounded-xl bg-slate-100 dark:bg-slate-800" /></div>)}</div>;
}
