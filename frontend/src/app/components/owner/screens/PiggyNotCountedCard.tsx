import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Booking } from '../../../context/AppContext';
import { toast } from '../../atmosfera';

/** Строка «Не в копилке» (GET /api/owner/piggy-bank → notInPiggy). */
export interface PiggyNotCountedItem {
  reason: 'unpaid' | 'cancelled' | 'after_adjust';
  resourceGroup: string;
  amount: number;
  bookingId?: string | null;
  txId?: string | null;
  date: string;
  time?: string | null;
  service?: string | null;
  clientName?: string | null;
  car?: string | null;
  price?: number | null;
  paymentType?: string | null;
  status?: string | null;
  purpose?: string | null;
  adjustDate?: string | null;
  createdAt?: string | null;
}

const SECTIONS: Array<{ reason: PiggyNotCountedItem['reason']; title: string; hint: string }> = [
  {
    reason: 'unpaid',
    title: 'Завершены, но не оплачены',
    hint: 'Если деньги уже в кассе — отметьте «Оплачено», и сумма придёт в копилку.',
  },
  {
    reason: 'cancelled',
    title: 'Оплачены, но отменены',
    hint: 'Работа была — верните статус «Завершена». Дубль или ошибка — удалите запись.',
  },
  {
    reason: 'after_adjust',
    title: 'Добавлены после корректировки',
    hint: 'Проведены задним числом уже после подсчёта. Если эти деньги были в кассе при подсчёте, они учтены дважды.',
  },
];

const GROUP_ICON: Record<string, string> = { wash: '🚗', detailing: '✨', general: '📦' };
const COLLAPSED_ROWS = 5;

const shortDate = (value?: string | null) => (value || '').slice(0, 5);
const rub = (value: number) => `${Math.abs(value).toLocaleString('ru')} ₽`;

/**
 * Сверка копилки с кассой: деньги, которых нет в балансе (неоплаченные,
 * отменённые после оплаты), и проводки, добавленные задним числом после
 * последней корректировки. Нажатие на строку открывает запись.
 */
export function PiggyNotCountedCard({
  items,
  showGroup,
  bookings,
  onSelectBooking,
  glass,
  sub,
  isDark,
}: {
  items: PiggyNotCountedItem[];
  showGroup: boolean;
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  glass: string;
  sub: string;
  isDark: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  if (items.length === 0) return null;

  const missing = items
    .filter(i => i.reason !== 'after_adjust')
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const rowBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  const open = (item: PiggyNotCountedItem) => {
    if (!item.bookingId) return;
    const booking = bookings.find(b => b.id === item.bookingId);
    if (booking) onSelectBooking(booking);
    else toast({ type: 'error', title: 'Заказ не найден (возможно, удалён)' });
  };

  return (
    <div className={`${glass} rounded-2xl p-4 mb-4`}>
      <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-1 flex items-center justify-between gap-2`}>
        <span>⚠️ Не в копилке</span>
        {missing > 0 && (
          <span className="tabular-nums normal-case" style={{ color: 'var(--status-warning)' }}>
            не учтено {rub(missing)}
          </span>
        )}
      </div>
      <div className={`text-[11px] ${sub} mb-3`}>Проверьте при подсчёте кассы. Нажмите на строку — откроется запись.</div>

      {SECTIONS.map(section => {
        const rows = items.filter(i => i.reason === section.reason);
        if (rows.length === 0) return null;
        const total = rows.reduce((sum, i) => sum + (i.amount || 0), 0);
        const adjustDates = Array.from(new Set(rows.map(r => r.adjustDate).filter(Boolean)));
        const title = section.reason === 'after_adjust' && adjustDates.length === 1
          ? `${section.title} ${shortDate(adjustDates[0])}`
          : section.title;
        const isOpen = !!expanded[section.reason];
        const visible = isOpen ? rows : rows.slice(0, COLLAPSED_ROWS);
        const signed = section.reason === 'after_adjust';
        return (
          <div key={section.reason} className="mb-3 last:mb-0">
            <div className="flex justify-between items-baseline text-sm font-medium mb-1.5">
              <span>{title} · {rows.length}</span>
              <span className="tabular-nums">{signed && total < 0 ? '−' : signed ? '+' : ''}{rub(total)}</span>
            </div>
            <div className="space-y-1.5">
              {visible.map(item => {
                const clickable = !!item.bookingId;
                const Wrapper = clickable ? 'button' : 'div';
                const label = item.service || item.purpose || 'Операция копилки';
                return (
                  <Wrapper
                    key={`${section.reason}-${item.txId || item.bookingId}-${item.resourceGroup}`}
                    {...(clickable ? { onClick: () => open(item), type: 'button' as const } : {})}
                    className={`w-full flex justify-between items-center gap-2 py-2 px-3 rounded-xl text-left border ${clickable ? 'transition active:scale-[0.98] hover:brightness-110' : ''}`}
                    style={{ borderColor: divider, background: rowBg }}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate">
                        {showGroup && <span className="mr-1">{GROUP_ICON[item.resourceGroup] || '•'}</span>}
                        {label}
                      </span>
                      <span className={`text-[11px] ${sub} truncate`}>
                        {shortDate(item.date)}
                        {item.clientName ? ` · ${item.clientName}` : ''}
                        {item.car ? ` · ${item.car}` : ''}
                        {item.price ? ` · заказ ${rub(item.price)}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-semibold tabular-nums">
                        {signed && item.amount < 0 ? '−' : signed ? '+' : ''}{rub(item.amount)}
                      </span>
                      {clickable && <ChevronRight size={14} strokeWidth={1.75} className={sub} aria-hidden />}
                    </div>
                  </Wrapper>
                );
              })}
            </div>
            {rows.length > COLLAPSED_ROWS && (
              <button
                type="button"
                onClick={() => setExpanded(prev => ({ ...prev, [section.reason]: !isOpen }))}
                className={`text-[11px] mt-1.5 ${sub} underline`}
              >
                {isOpen ? 'Свернуть' : `Показать все (${rows.length})`}
              </button>
            )}
            <div className={`text-[11px] ${sub} mt-1.5`}>{section.hint}</div>
          </div>
        );
      })}
    </div>
  );
}
