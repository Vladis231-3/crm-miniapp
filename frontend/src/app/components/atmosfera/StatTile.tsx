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
          'rounded-[9px] border border-border bg-white px-3 py-3',
          className,
        )}
      >
        <div className="text-[12px] text-[#8a9690]">{label}</div>
        <div className="mt-1 text-[14px] font-medium text-[#273b34]">{value}</div>
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
        'cursor-pointer rounded-[9px] border border-border bg-white px-3 py-3 text-center transition outline-none hover:border-[#9db3a6] focus-visible:ring-2 focus-visible:ring-[#2b5d4924] active:scale-[0.98]',
        active && 'border-[#9ab18d] bg-[#f2f6ed] ring-1 ring-[#9ab18d]/40',
        className,
      )}
    >
      <div className="text-[12px] text-[#8a9690] underline decoration-dotted underline-offset-2">{label}</div>
      <div className="mt-1 text-[14px] font-medium text-[#273b34]">{value}</div>
    </button>
  );
}
