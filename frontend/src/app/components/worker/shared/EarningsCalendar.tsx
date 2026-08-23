import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function formatDateKey(year: number, month: number, day: number) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${dd}.${mm}.${year}`;
}

export interface EarningsCalendarProps {
  bookings: any[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onSelectBooking: (booking: any) => void;
  glass: string;
  isDark: boolean;
  sub: string;
  primary: string;
  accent: string;
}

/**
 * EarningsCalendar — месячный календарь завершённых задач с точками.
 * Переезд из WorkerApp без изменений логики (недели уже были с Пн).
 */
export function EarningsCalendar({
  bookings,
  selectedDate,
  onSelectDate,
  onSelectBooking,
  glass,
  isDark,
  sub,
  primary,
  accent,
}: EarningsCalendarProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth() + monthOffset;

  const datesWithBookings = new Set(bookings.map((b: any) => b.date));

  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const selectedDayBookings = selectedDate
    ? bookings.filter((b: any) => b.date === selectedDate)
    : [];

  return (
    <div className={`${glass} rounded-2xl p-3 mb-3`}>
      {/* Навигация по месяцам */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonthOffset((m) => m - 1)} className="rounded-lg p-1 hover:bg-white/10" aria-label="Предыдущий месяц">
          <ChevronLeft size={16} strokeWidth={1.75} className={sub} />
        </button>
        <div className="text-sm font-semibold">
          {MONTH_NAMES[calMonth]} {calYear}
        </div>
        <button onClick={() => setMonthOffset((m) => m + 1)} className="rounded-lg p-1 hover:bg-white/10" aria-label="Следующий месяц">
          <ChevronRight size={16} strokeWidth={1.75} className={sub} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {DAY_NAMES.map((d) => (
          <div key={d} className={`py-1 text-center text-[10px] ${sub}`}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateKey = formatDateKey(calYear, calMonth, day);
          const hasBooking = datesWithBookings.has(dateKey);
          const isSelected = selectedDate === dateKey;
          const isToday = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate()) === dateKey;
          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(isSelected ? null : dateKey)}
              className="relative flex flex-col items-center rounded-lg py-1.5 text-xs transition-all"
              style={{
                background: isSelected ? primary : 'transparent',
                color: isSelected ? '#fff' : isToday ? primary : undefined,
                fontWeight: isToday ? 600 : 400,
              }}
            >
              <span>{day}</span>
              {hasBooking && (
                <span className="mt-0.5 size-1 rounded-full" style={{ background: isSelected ? '#fff' : accent }} />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
          <div className={`mb-1.5 text-xs font-medium ${sub}`}>{selectedDate}</div>
          {selectedDayBookings.length === 0 ? (
            <div className={`text-xs ${sub}`}>Нет задач</div>
          ) : (
            selectedDayBookings.map((b: any) => (
              <div
                key={b.id}
                className={`${isDark ? 'bg-white/5' : 'bg-black/3'} mb-1.5 cursor-pointer rounded-xl p-2.5`}
                onClick={() => onSelectBooking(b)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{b.time} · {b.service}</div>
                    {b.car && <div className={`text-xs ${sub}`}>{b.car}{b.plate ? ` (${b.plate})` : ''}</div>}
                    <div className={`text-xs ${sub}`}>{b.box} · {b.price?.toLocaleString('ru')} ₽</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold" style={{ color: accent }}>+{b.earned.toLocaleString('ru')} ₽</div>
                    <div className={`text-xs ${sub}`}>{b.percent}%</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
