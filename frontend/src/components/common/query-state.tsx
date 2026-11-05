export function ErrorState({ error }: { error: unknown }) {
  if (!error) return null;
  return <div role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950">{error instanceof Error ? error.message : 'The request could not be completed.'}</div>;
}
