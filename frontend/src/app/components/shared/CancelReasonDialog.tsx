import { useCallback, useRef, useState } from 'react';
import { CANCEL_REASONS } from '../../constants/cancelReasons';

export interface CancelReasonResult {
  cancelReason: string;
  cancelComment: string;
}

interface DialogState {
  status: 'cancelled' | 'no_show';
  name: string;
}

/**
 * Диалог причины отмены / неявки. Использование:
 *   const { askCancelReason, cancelReasonDialog } = useCancelReasonDialog();
 *   const reason = await askCancelReason('cancelled', clientName); // null — передумали
 *   ...{cancelReasonDialog} в разметке.
 */
export function useCancelReasonDialog() {
  const [state, setState] = useState<DialogState | null>(null);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const resolver = useRef<((value: CancelReasonResult | null) => void) | null>(null);

  const askCancelReason = useCallback(
    (status: 'cancelled' | 'no_show', name?: string) =>
      new Promise<CancelReasonResult | null>((resolve) => {
        resolver.current?.(null);
        resolver.current = resolve;
        setReason(status === 'no_show' ? 'no_show' : '');
        setComment('');
        setState({ status, name: (name || '').trim() });
      }),
    [],
  );

  const close = (value: CancelReasonResult | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  };

  const needsComment = reason === 'other';
  const canSubmit = Boolean(reason) && (!needsComment || comment.trim().length > 0);

  const cancelReasonDialog = state ? (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/60 p-3 sm:items-center"
      onClick={() => close(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Причина отмены"
        className="w-full max-w-md rounded-2xl border border-border bg-[var(--card-raised,var(--card,#1f2028))] p-4 text-foreground shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-base font-semibold">
          {state.status === 'no_show' ? 'Клиент не приехал' : 'Отмена записи'}
        </div>
        <div className="mt-1 text-xs opacity-70">
          {state.name ? `${state.name}. ` : ''}Запись останется в истории и не попадёт в зарплату и копилку.
        </div>

        <div className="mt-3 text-xs font-medium opacity-70">Причина</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {CANCEL_REASONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setReason(item.value)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                reason === item.value
                  ? 'border-red-500 bg-red-500/15 text-red-500'
                  : 'border-border opacity-80 hover:opacity-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value.slice(0, 1000))}
          rows={3}
          placeholder={needsComment ? 'Опишите причину (обязательно)' : 'Комментарий (необязательно)'}
          className="mt-3 w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => close(null)}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm"
          >
            Назад
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => close({ cancelReason: reason, cancelComment: comment.trim() })}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {state.status === 'no_show' ? 'Отметить неявку' : 'Отменить запись'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { askCancelReason, cancelReasonDialog };
}

/** Сообщение ошибки, когда диалог причины закрыли без выбора. */
export const CANCEL_ABORTED_MESSAGE = 'Причина не выбрана — запись не изменена';

type GuardedBooking = { id: string; status: string; clientName?: string };
type GuardedUpdates = { status?: string; cancelReason?: string; cancelComment?: string };

/**
 * Обёртка над updateBooking: любой перевод записи в «Отменено» / «Не приехал»
 * (кнопка, селект статуса, форма редактирования) сначала спрашивает причину.
 * Диалог закрыли без выбора — бросает Error(CANCEL_ABORTED_MESSAGE), запись не меняется.
 */
export function useCancelGuardedUpdate<U extends GuardedUpdates>(
  bookings: GuardedBooking[],
  rawUpdate: (id: string, updates: U) => Promise<void>,
) {
  const { askCancelReason, cancelReasonDialog } = useCancelReasonDialog();

  const updateBooking = async (id: string, updates: U): Promise<void> => {
    const next = updates.status;
    if ((next === 'cancelled' || next === 'no_show') && updates.cancelReason === undefined) {
      const target = bookings.find((booking) => booking.id === id);
      if (target && target.status !== next) {
        const picked = await askCancelReason(next, target.clientName);
        if (!picked) throw new Error(CANCEL_ABORTED_MESSAGE);
        return rawUpdate(id, { ...updates, ...picked });
      }
    }
    return rawUpdate(id, updates);
  };

  return { updateBooking, askCancelReason, cancelReasonDialog };
}
