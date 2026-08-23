import { cn } from '../../ui/utils';

export interface BoxRentPickerProps {
  hours: number;
  onChange: (hours: number) => void;
  /** Итоговая длительность в минутах и цена — показываются под сеткой. */
  totalMinutes?: number;
  totalPrice?: number;
  className?: string;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * BoxRentPicker — выбор часов аренды бокса (§6.1).
 * Заменяет два дублирующихся пикера в ClientApp (detail + slots).
 */
export function BoxRentPicker({ hours, onChange, totalMinutes, totalPrice, className }: BoxRentPickerProps) {
  return (
    <div className={cn('mb-4', className)}>
      <div className="grid grid-cols-4 gap-2">
        {HOURS.map((h) => {
          const selected = hours === h;
          return (
            <button
              key={h}
              type="button"
              onClick={() => onChange(h)}
              className={cn(
                'rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] outline-none',
                selected
                  ? 'bg-[var(--primary-600)] text-white'
                  : 'border border-border bg-[var(--card-raised,var(--card))] text-[var(--fg-secondary,#5A6072)] hover:border-[var(--border-strong)]',
              )}
            >
              {h} ч
            </button>
          );
        })}
      </div>
      {(totalMinutes !== undefined || totalPrice !== undefined) && (
        <div className="mt-3 text-xs text-[var(--fg-secondary,#5A6072)]">
          Итог: {totalMinutes ?? 0} мин, <span className="font-medium">{totalPrice ?? 0} ₽</span>
        </div>
      )}
    </div>
  );
}
