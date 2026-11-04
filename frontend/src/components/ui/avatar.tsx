import { cn } from '@/lib/utils';

export function Avatar({ name, initials, color, size = 'md', className }: { name: string; initials?: string; color?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const value = initials ?? name.split(' ').map((word) => word[0]).join('').slice(0, 2);
  return <span role="img" aria-label={name} title={name} style={color ? { backgroundColor: `${color}18`, color } : undefined} className={cn('inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-50 font-semibold text-brand-700 ring-1 ring-inset ring-black/5 dark:bg-brand-950 dark:text-brand-400', size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs', className)}>{value}</span>;
}
