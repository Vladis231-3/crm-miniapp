import { type ReactNode } from 'react';
import { cn } from '../ui/utils';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  className?: string;
  /** Если задан — плитка становится кликабельной кнопкой (раскрытие расшифровки). */
  onClick?: () => void;
  title?: string;
}

/** StatTile — компактная плитка-показатель (используется сетками 3-в-ряд). */
export function StatTile({ label, value, className, onClick, title }: StatTileProps) {
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
      className={cn(
        'rounded-2xl border border-border bg-[var(--card-raised,var(--card))] px-3 py-3 cursor-pointer text-center transition active:opacity-70 hover:border-[var(--primary-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        className,
      )}
    >
      <div className="text-[11px] text-[var(--fg-secondary,#5A6072)] underline decoration-dotted underline-offset-2">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </button>
  );
}
