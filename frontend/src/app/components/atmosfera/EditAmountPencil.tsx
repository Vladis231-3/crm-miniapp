import { Edit3 } from 'lucide-react';

interface EditAmountPencilProps {
  /** Действие карандаша: открыть adjust / редактор первички / детализацию. */
  onClick: (e: React.MouseEvent) => void;
  /** Подсказка. По умолчанию как в копилке. */
  title?: string;
  /** Акцентный цвет (primary из OwnerApp). */
  primary?: string;
  /** Размер иконки. */
  size?: number;
  className?: string;
}

/**
 * EditAmountPencil — единый карандаш «Изменить сумму» как в копилке
 * (OwnerPiggyBankScreen: полупрозрачный primary-фон, Edit3 12px).
 * Ставится рядом с КАЖДЫМ итогом Owner-панели: кошелёк, копилка,
 * депозит, зарплаты, склад, отчёты. Для вычисляемых итогов onClick
 * ведёт к первичкам/корректировке, а не меняет итог напрямую.
 */
export function EditAmountPencil({
  onClick,
  title = 'Изменить сумму',
  primary = 'var(--primary-600)',
  size = 12,
  className = '',
}: EditAmountPencilProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className={`p-1 rounded-lg hover:brightness-125 transition active:scale-95 shrink-0 ${className}`}
      style={{ background: `${primary}20`, color: primary }}
      title={title}
      aria-label={title}
    >
      <Edit3 size={size} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
