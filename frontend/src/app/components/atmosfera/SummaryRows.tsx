import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export interface SummaryRowsProps {
  /** Пары label/value для сводки записи (услуга/дата/время/цена/длительность). */
  rows: Array<{ label: string; value: ReactNode }>;
  className?: string;
}

/** SummaryRows — список «параметр: значение» (§4.8, дедуп слот-модалки и экрана подтверждения). */
export function SummaryRows({ rows, className }: SummaryRowsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-[var(--fg-secondary,#5A6072)]">{row.label}</span>
          <span className="text-sm font-medium">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
