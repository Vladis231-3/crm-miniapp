import { cn } from '../ui/utils';

const formatter = new Intl.NumberFormat('ru-RU');

export interface MoneyProps {
  /** Сумма в рублях (число или числовая строка). */
  amount: number | string;
  /** Показывать знак «+» для положительных сумм (доходы/начисления). */
  sign?: boolean;
  className?: string;
}

/**
 * Money — единственный способ отобразить сумму в ₽ (§4.2):
 * табличные цифры (tnum), разделитель ru-RU, неразрывный пробел перед ₽.
 */
export function Money({ amount, sign = false, className }: MoneyProps) {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = formatter.format(Math.abs(safe));
  const prefix = safe < 0 ? '−' : sign && safe > 0 ? '+' : '';
  return (
    <span className={cn('tabular-nums whitespace-nowrap', className)}>
      {prefix}
      {formatted}&nbsp;₽
    </span>
  );
}
