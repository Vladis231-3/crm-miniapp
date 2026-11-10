import { useMemo } from 'react';
import { cancelReasonLabel } from '../../constants/cancelReasons';

interface StatsBooking {
  id: string;
  status: string;
  price: number;
  date?: string;
  clientName?: string;
  service?: string;
  cancelReason?: string;
  cancelComment?: string;
}

interface Props {
  /** Записи за выбранный период (все статусы). */
  bookings: StatsBooking[];
  className?: string;
  /** Подпись периода, например «за неделю». */
  periodLabel?: string;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

/**
 * Статистика отказов: доля отменённых и неприехавших от всех записей периода,
 * разбивка по причинам и последние отказы с комментариями.
 */
export function CancellationStatsCard({ bookings, className = '', periodLabel }: Props) {
  const stats = useMemo(() => {
    const cancelled = bookings.filter((b) => b.status === 'cancelled');
    const noShow = bookings.filter((b) => b.status === 'no_show');
    const refused = [...cancelled, ...noShow];
    const byReason = new Map<string, { label: string; count: number; lost: number }>();
    refused.forEach((b) => {
      // Неявка без причины — это и есть причина «Не приехал».
      const code = (b.cancelReason || '').trim() || (b.status === 'no_show' ? 'no_show' : '');
      const row = byReason.get(code) || { label: cancelReasonLabel(code), count: 0, lost: 0 };
      row.count += 1;
      row.lost += Number(b.price) || 0;
      byReason.set(code, row);
    });
    return {
      total: bookings.length,
      cancelled: cancelled.length,
      noShow: noShow.length,
      refused: refused.length,
      lost: refused.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
      reasons: Array.from(byReason.values()).sort((a, b) => b.count - a.count),
      withComment: refused.filter((b) => (b.cancelComment || '').trim()).slice(0, 5),
    };
  }, [bookings]);

  const sub = 'opacity-70';

  return (
    <div className={`rounded-2xl border border-border bg-[var(--card)] p-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-semibold">Отказы{periodLabel ? ` ${periodLabel}` : ''}</div>
        <div className={`text-xs ${sub}`}>{stats.refused} из {stats.total} записей</div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-red-500/10 p-2">
          <div className="text-lg font-semibold text-red-500">{pct(stats.refused, stats.total)}%</div>
          <div className={`text-[11px] ${sub}`}>всего отказов</div>
        </div>
        <div className="rounded-xl bg-red-500/5 p-2">
          <div className="text-lg font-semibold">{stats.cancelled}</div>
          <div className={`text-[11px] ${sub}`}>отменено · {pct(stats.cancelled, stats.total)}%</div>
        </div>
        <div className="rounded-xl bg-orange-500/10 p-2">
          <div className="text-lg font-semibold">{stats.noShow}</div>
          <div className={`text-[11px] ${sub}`}>не приехали · {pct(stats.noShow, stats.total)}%</div>
        </div>
      </div>

      {stats.refused === 0 ? (
        <div className={`mt-3 text-xs ${sub}`}>Отказов за период нет.</div>
      ) : (
        <>
          <div className={`mt-3 text-xs ${sub}`}>
            Несостоявшиеся записи на {stats.lost.toLocaleString('ru')} ₽
          </div>
          <div className="mt-3 space-y-2">
            {stats.reasons.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs">
                  <span>{row.label}</span>
                  <span className={sub}>
                    {row.count} · {pct(row.count, stats.refused)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-red-500/10">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${pct(row.count, stats.refused)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {stats.withComment.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className={`text-xs font-medium ${sub}`}>Комментарии</div>
              {stats.withComment.map((b) => (
                <div key={b.id} className="rounded-xl border border-border p-2 text-xs">
                  <div className={sub}>
                    {[b.date, b.clientName, b.service].filter(Boolean).join(' · ')}
                  </div>
                  <div className="mt-0.5">
                    {cancelReasonLabel(b.cancelReason)}: {b.cancelComment}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
