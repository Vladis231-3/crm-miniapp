import { type ReactNode } from 'react';
import { cn } from '../ui/utils';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  className?: string;
  /** Если задан — плитка становится кликабельной кнопкой (раскрытие расшифровки). */
  onClick?: () => void;
  /** Подсветка активного состояния (например, включён фильтр). */
  active?: boolean;
  title?: string;
}

/** StatTile — компактная плитка-показатель (используется сетками 3-в-ряд). */
export function StatTile({ label, value, className, onClick, active, title }: StatTileProps) {
  if (!onClick) {
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
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || `${label} — нажмите для деталей`}
      aria-label={`${label} — нажмите для деталей`}
      aria-pressed={active ? true : undefined}
      className={cn(
        'cursor-pointer rounded-2xl border border-border bg-[var(--card-raised,var(--card))] px-3 py-3 text-center transition outline-none hover:border-[var(--primary-600)]/50 hover:bg-[var(--card-raised,var(--card))] focus-visible:ring-2 focus-visible:ring-[var(--ring)] active:scale-[0.98]',
        active && 'border-[var(--primary-600)]/60 ring-1 ring-[var(--primary-600)]/30',
        className,
      )}
    >
      <div className="text-[11px] text-[var(--fg-secondary,#5A6072)] underline decoration-dotted underline-offset-2">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </button>
  );
}
