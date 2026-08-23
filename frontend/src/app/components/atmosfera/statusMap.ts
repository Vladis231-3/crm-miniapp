/**
 * Единая карта статусов записей (§6.0).
 * Источник значений: backend/app/schemas.py:18 — НЕ изобретать новые.
 * Заменяет 3 разъехавшиеся копии (AdminApp:34, ClientApp:25, OwnerApp:3719).
 */

export const BOOKING_STATUSES = [
  'new',
  'confirmed',
  'scheduled',
  'in_progress',
  'completed',
  'no_show',
  'cancelled',
  'admin_review',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Тоны DS: success | warning | danger | info | neutral (§4.1). */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const STATUS_LABEL: Record<BookingStatus, string> = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  scheduled: 'Запланирована',
  in_progress: 'В работе',
  completed: 'Завершена',
  no_show: 'Не приехал',
  cancelled: 'Отменена',
  admin_review: 'На подтверждении',
};

export const STATUS_TONE: Record<BookingStatus, StatusTone> = {
  new: 'neutral',
  confirmed: 'success',
  scheduled: 'info',
  in_progress: 'info',
  completed: 'success',
  no_show: 'danger',
  cancelled: 'danger',
  admin_review: 'warning',
};

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'bg-[var(--status-success-soft)] text-[var(--status-success)]',
  warning: 'bg-[var(--status-warning-soft)] text-[var(--status-warning)]',
  danger: 'bg-[var(--status-danger-soft)] text-[var(--status-danger)]',
  info: 'bg-[var(--status-info-soft)] text-[var(--status-info)]',
  neutral: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
};

export function statusToneClass(tone: StatusTone): string {
  return TONE_CLASS[tone];
}

export function statusLabel(status: string): string {
  return STATUS_LABEL[status as BookingStatus] ?? status;
}

export function statusTone(status: string): StatusTone {
  return STATUS_TONE[status as BookingStatus] ?? 'neutral';
}
