import { type ReactNode } from 'react';
import { cn } from '../ui/utils';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  className?: string;
}

/** StatTile — компактная плитка-показатель (используется сетками 3-в-ряд). */
export function StatTile({ label, value, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-[var(--card-raised,var(--card))] px-3 py-3',
        className,
      )}
    >
      <div className="text-[11px] text-[var(--fg-secondary,#5A6072)]">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
