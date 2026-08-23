import { cn } from '../ui/utils';
import { statusLabel, statusTone, statusToneClass } from './statusMap';

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * StatusBadge — пилюля статуса записи (§4.8 №8).
 * Лейбл и тон берутся только из statusMap — никаких локальных мап.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold leading-none',
        statusToneClass(statusTone(status)),
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
