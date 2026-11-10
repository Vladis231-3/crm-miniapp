/** Причины отмены / неявки. Коды — как CANCEL_REASON_CODES на бэкенде. */
export const CANCEL_REASONS = [
  { value: 'no_show', label: 'Не приехал' },
  { value: 'changed_mind', label: 'Передумал' },
  { value: 'found_cheaper', label: 'Нашёл дешевле' },
  { value: 'rescheduled', label: 'Перенёс на другой день' },
  { value: 'price', label: 'Не устроила цена' },
  { value: 'our_fault', label: 'Отменили мы' },
  { value: 'duplicate', label: 'Дубль / ошибка записи' },
  { value: 'other', label: 'Другое' },
] as const;

const EXTRA_LABELS: Record<string, string> = {
  client_cancelled: 'Отменил сам клиент',
};

export function cancelReasonLabel(code?: string | null): string {
  const value = (code || '').trim();
  if (!value) return 'Не указано';
  return CANCEL_REASONS.find((r) => r.value === value)?.label || EXTRA_LABELS[value] || value;
}

/** Статусы-отказы: запись не состоялась. */
export function isRefusalStatus(status?: string | null): boolean {
  return status === 'cancelled' || status === 'no_show';
}
