import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, RefreshCw } from 'lucide-react';
import type { Booking, ScheduleDay, Worker } from '../../context/AppContext';
import { formatDate, getScheduleDayIndex, parseFlexibleDate } from '../../utils/date';
import { SourceBadge } from '../shared/SourceBadge';

export interface WorkerCalendarBooking {
  id: string;
  clientName: string;
  service: string;
  serviceId: string;
  date: string;
  time: string;
  duration: number;
  status: Booking['status'];
  box: string;
  workers: { workerId: string; workerName: string }[];
  car?: string | null;
  plate?: string | null;
  source?: string | null;
  referralSource?: string;
  isRepeatVisit?: boolean;
}

const WORKER_CALENDAR_WEEKDAYS = ['Сб', 'Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
const WORKER_CALENDAR_MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WORKER_CALENDAR_DEFAULT_OPEN = 9 * 60;
const WORKER_CALENDAR_DEFAULT_CLOSE = 19 * 60;

const WORKER_CALENDAR_LOAD_COLORS = {
  empty: '#22C55E',
  medium: '#EAB308',
  heavy: '#EF4444',
} as const;

function workerParseBookingMinutes(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function workerScheduleTimeToMinutes(value: string): number | null {
  return workerParseBookingMinutes(value);
}

function workerMonthTitle(monthDate: Date): string {
  return `${WORKER_CALENDAR_MONTHS[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
}

function workerBuildMonthCells(monthDate: Date): Array<{ date: Date | null; dateLabel: string }> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 1) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null; dateLabel: string }> = [];
  for (let index = 0; index < offset; index += 1) {
    cells.push({ date: null, dateLabel: '' });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, dateLabel: formatDate(date) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, dateLabel: '' });
  }
  return cells;
}

function workerCalendarDayHours(schedule: ScheduleDay[], dateLabel: string): { open: number; close: number; active: boolean } {
  const parsedDate = parseFlexibleDate(dateLabel);
  if (!parsedDate) {
    return { open: WORKER_CALENDAR_DEFAULT_OPEN, close: WORKER_CALENDAR_DEFAULT_CLOSE, active: true };
  }
  const daySchedule = schedule.find((entry) => entry.dayIndex === getScheduleDayIndex(parsedDate));
  if (!daySchedule || !daySchedule.active) {
    return { open: WORKER_CALENDAR_DEFAULT_OPEN, close: WORKER_CALENDAR_DEFAULT_CLOSE, active: false };
  }
  const open = workerScheduleTimeToMinutes(daySchedule.open) ?? WORKER_CALENDAR_DEFAULT_OPEN;
  const close = workerScheduleTimeToMinutes(daySchedule.close) ?? WORKER_CALENDAR_DEFAULT_CLOSE;
  return { open, close: Math.max(open + 60, close), active: true };
}

function workerCalendarLoadTone(count: number, maxCount: number): keyof typeof WORKER_CALENDAR_LOAD_COLORS {
  if (count <= 0) return 'empty';
  const ratio = count / Math.max(1, maxCount);
  if (ratio >= 0.55) return 'heavy';
  return 'medium';
}

type WorkerCalendarHourSlot = {
  hourLabel: string;
  bookings: WorkerCalendarBooking[];
};

function workerGroupBookingsByHour(
  bookings: WorkerCalendarBooking[],
  openMinutes: number,
  closeMinutes: number,
): WorkerCalendarHourSlot[] {
  const timed = bookings.filter((booking) => workerParseBookingMinutes(booking.time) !== null);
  const slots: WorkerCalendarHourSlot[] = [];
  for (let slotStart = openMinutes; slotStart < closeMinutes; slotStart += 60) {
    const hourLabel = `${String(Math.floor(slotStart / 60)).padStart(2, '0')}:00`;
    const slotEnd = slotStart + 60;
    const slotBookings = timed
      .filter((booking) => {
        const start = workerParseBookingMinutes(booking.time);
        if (start === null) return false;
        return start >= slotStart && start < slotEnd;
      })
      .sort((left, right) => left.time.localeCompare(right.time));
    if (slotBookings.length > 0) {
      slots.push({ hourLabel, bookings: slotBookings });
    }
  }
  return slots;
}

function workerCalendarStatusLabel(status: Booking['status']) {
  switch (status) {
    case 'new':
      return 'Новая';
    case 'confirmed':
      return 'Подтв.';
    case 'scheduled':
      return 'Запл.';
    case 'in_progress':
      return 'В работе';
    case 'completed':
      return 'Готово';
    case 'no_show':
      return 'Не приехал';
    case 'admin_review':
      return 'Уточнение';
    default:
      return status;
  }
}

function workerCalendarStatusBadge(status: Booking['status']) {
  switch (status) {
    case 'new':
      return 'bg-indigo-500/15 text-indigo-600';
    case 'confirmed':
      return 'bg-cyan-500/15 text-cyan-600';
    case 'scheduled':
      return 'bg-blue-500/15 text-blue-600';
    case 'in_progress':
      return 'bg-yellow-500/15 text-yellow-600';
    case 'completed':
      return 'bg-green-500/15 text-green-600';
    case 'no_show':
      return 'bg-orange-500/15 text-orange-600';
    default:
      return 'bg-amber-500/15 text-amber-600';
  }
}

interface WorkerCalendarProps {
  bookings: WorkerCalendarBooking[];
  loading: boolean;
  workers: Worker[];
  schedule: ScheduleDay[];
  workerId: string;
  todayLabel: string;
  glass: string;
  isDark: boolean;
  sub: string;
  primary: string;
  accent: string;
  onRefresh: () => void;
}

export function WorkerCalendar({
  bookings,
  loading,
  workers,
  schedule,
  workerId,
  todayLabel,
  glass,
  isDark,
  sub,
  primary,
  accent,
  onRefresh,
}: WorkerCalendarProps) {
  const [view, setView] = useState<'month' | 'day'>('month');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayLabel);

  const relevantBookings = bookings.filter((booking) => Boolean(booking.date?.trim()) && booking.status !== 'cancelled');
  const bookingsByDate = relevantBookings.reduce<Record<string, WorkerCalendarBooking[]>>((acc, booking) => {
    const dateLabel = booking.date.trim();
    acc[dateLabel] = [...(acc[dateLabel] || []), booking];
    return acc;
  }, {});
  Object.values(bookingsByDate).forEach((dayItems) => {
    dayItems.sort((left, right) => left.time.localeCompare(right.time));
  });

  const monthCells = workerBuildMonthCells(month);
  const monthLabel = workerMonthTitle(month);
  const monthLoads = monthCells
    .filter((cell) => cell.dateLabel)
    .map((cell) => bookingsByDate[cell.dateLabel]?.length || 0);
  const monthMaxLoad = Math.max(1, ...monthLoads, 0);

  const dayBookings = (bookingsByDate[selectedDate] || []).slice();
  const dayHours = workerCalendarDayHours(schedule, selectedDate);
  const hourSlots = workerGroupBookingsByHour(dayBookings, dayHours.open, dayHours.close);
  const untimedBookings = dayBookings.filter((booking) => workerParseBookingMinutes(booking.time) === null);
  const dayTitle = parseFlexibleDate(selectedDate)?.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }) || selectedDate;

  const activeMasters = workers.filter((worker) => worker.active && worker.role === 'worker');
  const timeSlots = Array.from(new Set(dayBookings.map((booking) => booking.time))).sort((left, right) => left.localeCompare(right));
  const workerGrid = timeSlots.map((time) => ({
    time,
    cells: activeMasters.map((worker) => ({
      id: worker.id,
      name: worker.name,
      bookings: dayBookings.filter((booking) => booking.time === time && booking.workers.some((item) => item.workerId === worker.id)),
    })),
  }));

  const isMine = (booking: WorkerCalendarBooking) => booking.workers.some((item) => item.workerId === workerId);

  const statusLine = (booking: WorkerCalendarBooking) => {
    const workerNames = booking.workers.map((item) => item.workerName).filter(Boolean);
    return [booking.service, booking.box, workerNames.length > 0 ? `Мастера: ${workerNames.join(', ')}` : ''].filter(Boolean).join(' · ');
  };

  return (
    <motion.div key="worker-calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {view === 'month' ? (
        <>
          <div className={`${glass} rounded-2xl p-4 mb-4`}>
            <div className="flex items-center justify-between gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                className={`p-2 rounded-xl ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-center min-w-0">
                <div className="font-semibold">{monthLabel}</div>
                <div className={`text-xs ${sub} mt-0.5`}>Нажмите на день, чтобы открыть расписание</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onRefresh}
                  className={`p-2 rounded-xl ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
                  aria-label="Обновить"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  className={`p-2 rounded-xl ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
                  aria-label="Следующий месяц"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const today = parseFlexibleDate(todayLabel) || new Date();
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelectedDate(todayLabel);
                setView('day');
              }}
              className="w-full mb-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: `${primary}18`, color: primary }}
            >
              Сегодня · {todayLabel}
            </button>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WORKER_CALENDAR_WEEKDAYS.map((weekday) => (
                <div key={weekday} className={`text-center text-[11px] font-medium ${sub} py-1`}>{weekday}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((cell, index) => {
                if (!cell.date || !cell.dateLabel) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }
                const dayItems = bookingsByDate[cell.dateLabel] || [];
                const loadTone = workerCalendarLoadTone(dayItems.length, monthMaxLoad);
                const loadWidth = dayItems.length > 0
                  ? `${Math.max(24, Math.round((dayItems.length / monthMaxLoad) * 100))}%`
                  : '100%';
                const isToday = cell.dateLabel === todayLabel;
                return (
                  <button
                    key={cell.dateLabel}
                    type="button"
                    onClick={() => {
                      setSelectedDate(cell.dateLabel);
                      setView('day');
                    }}
                    className={`aspect-square rounded-xl p-1.5 flex flex-col items-stretch text-left transition-transform active:scale-[0.98] border ${
                      isToday ? 'border-2' : 'border-transparent'
                    }`}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      borderColor: isToday ? primary : 'transparent',
                    }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-sm font-semibold" style={isToday ? { color: primary } : undefined}>
                        {cell.date.getDate()}
                      </span>
                      {dayItems.length > 0 && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white min-w-[18px] text-center"
                          style={{ background: WORKER_CALENDAR_LOAD_COLORS[loadTone] }}
                        >
                          {dayItems.length}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto pt-2">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: loadWidth,
                          background: WORKER_CALENDAR_LOAD_COLORS[loadTone],
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className={`${glass} rounded-2xl p-4`}>
            <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>Загруженность</div>
            <div className="flex flex-wrap gap-3 text-xs">
              {[
                { tone: 'empty' as const, label: 'Нет нагрузки' },
                { tone: 'medium' as const, label: 'Средняя' },
                { tone: 'heavy' as const, label: 'Высокая' },
              ].map((item) => (
                <div key={item.tone} className="flex items-center gap-2">
                  <span className="w-8 h-2 rounded-full" style={{ background: WORKER_CALENDAR_LOAD_COLORS[item.tone] }} />
                  <span className={sub}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setView('month')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
            >
              <ArrowLeft size={16} />
              Месяц
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayLabel);
                const today = parseFlexibleDate(todayLabel) || new Date();
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              }}
              className="px-3 py-2 rounded-xl text-sm"
              style={{ background: `${primary}18`, color: primary }}
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className={`p-2 rounded-xl ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
              aria-label="Обновить"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className={`${glass} rounded-2xl p-4 mb-4`}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <h2 className="font-semibold capitalize">{dayTitle}</h2>
                <div className={`text-sm ${sub} mt-1`}>
                  {dayBookings.length} {dayBookings.length === 1 ? 'запись' : dayBookings.length < 5 ? 'записи' : 'записей'}
                  {` · ${Math.floor(dayHours.open / 60)}:00–${Math.floor(dayHours.close / 60)}:00`}
                </div>
              </div>
              <CalendarDays size={22} style={{ color: primary }} />
            </div>
          </div>

          {loading ? (
            <div className={`${glass} rounded-2xl p-8 text-center`}>
              <RefreshCw size={28} className={`mx-auto mb-3 animate-spin ${sub}`} />
              <p className={sub}>Загрузка расписания…</p>
            </div>
          ) : dayBookings.length === 0 ? (
            <div className={`${glass} rounded-2xl p-8 text-center`}>
              <CalendarDays size={36} className={`mx-auto mb-3 ${sub}`} />
              <p className={sub}>На этот день записей нет</p>
            </div>
          ) : (
            <>
              <div className={`${glass} rounded-2xl p-3`}>
                <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  {hourSlots.map((slot) => (
                    <div key={slot.hourLabel} className="flex gap-3 py-2 first:pt-0 last:pb-0">
                      <div className={`w-10 shrink-0 pt-0.5 text-[11px] font-medium tabular-nums ${sub}`}>
                        {slot.hourLabel}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        {slot.bookings.map((booking) => (
                          <div
                            key={booking.id}
                            className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 min-w-0 ${
                              isDark ? 'bg-white/[0.04]' : 'bg-black/[0.03]'
                            }`}
                          >
                            <span className={`w-0.5 self-stretch rounded-full shrink-0 ${workerCalendarStatusBadge(booking.status)}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">
                                <span className="tabular-nums">{booking.time}</span>
                                {' '}
                                {booking.clientName || 'Без имени'}
                                {booking.isRepeatVisit && (
                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600">Повторный</span>
                                )}
                                {isMine(booking) && (
                                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full`} style={{ background: `${accent}20`, color: accent }}>
                                    Моя
                                  </span>
                                )}
                              </div>
                              <div className={`text-[11px] truncate ${sub}`}>
                                {statusLine(booking)}
                              </div>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${workerCalendarStatusBadge(booking.status)}`}>
                              {workerCalendarStatusLabel(booking.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {untimedBookings.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mt-4`}>
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Без точного времени</div>
                  <div className="space-y-2">
                    {untimedBookings.map((booking) => (
                      <div key={booking.id} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3 w-full text-left`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm truncate">
                            {booking.clientName || 'Без имени'}
                            {isMine(booking) && (
                              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full`} style={{ background: `${accent}20`, color: accent }}>
                                Моя
                              </span>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${workerCalendarStatusBadge(booking.status)}`}>
                            {workerCalendarStatusLabel(booking.status)}
                          </span>
                        </div>
                        <div className={`text-xs ${sub} mt-1 truncate`}>{statusLine(booking)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeMasters.length > 0 && workerGrid.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mt-4`}>
                  <div className={`text-[11px] ${sub} uppercase tracking-wider mb-2`}>Сетка по времени и мастерам</div>
                  <div className="overflow-x-auto rounded-xl">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className={sub}>
                          <th className="text-left py-2 pr-3 font-medium sticky left-0 z-10" style={{ background: isDark ? '#121511' : '#F3F3EF' }}>Время</th>
                          {activeMasters.map((worker) => (
                            <th key={worker.id} className="text-left py-2 px-2 font-medium min-w-[150px]">{worker.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {workerGrid.map((row) => (
                          <tr key={`worker-grid-${row.time}`} className="align-top">
                            <td className="py-2 pr-3 text-xs font-semibold sticky left-0 z-10" style={{ background: isDark ? '#121511' : '#F3F3EF' }}>{row.time}</td>
                            {row.cells.map((cell) => (
                              <td key={`${row.time}-${cell.id}`} className="px-2 py-2">
                                {cell.bookings.length === 0 ? (
                                  <div className={`rounded-xl border border-dashed px-3 py-3 text-xs text-center ${sub}`} style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                                    Свободно
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {cell.bookings.map((booking) => (
                                      <div key={`${cell.id}-${booking.id}`} className={`${glass} rounded-xl p-3 w-full text-left`}>
                                        <div className="font-medium text-sm truncate flex items-center gap-1.5 min-w-0">
                                          {booking.clientName}
                                          <SourceBadge source={booking.source} />
                                          {booking.isRepeatVisit && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 shrink-0">Повторный</span>
                                          )}
                                          {isMine(booking) && (
                                            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full`} style={{ background: `${accent}20`, color: accent }}>
                                              Моя
                                            </span>
                                          )}
                                        </div>
                                        <div className={`text-xs ${sub} truncate mt-1`}>{booking.box} · {booking.service}</div>
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                          <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${workerCalendarStatusBadge(booking.status)}`}>
                                            {workerCalendarStatusLabel(booking.status)}
                                          </span>
                                          <span className={`text-[11px] ${sub}`}>{booking.time}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeMasters.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mt-4`}>
                  <div className={`text-[11px] ${sub} uppercase tracking-wider mb-2`}>По мастерам</div>
                  <div className="space-y-2">
                    {activeMasters.map((worker) => {
                      const workerItems = dayBookings.filter((booking) => booking.workers.some((item) => item.workerId === worker.id));
                      return (
                        <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm">{worker.name}</span>
                            <span className={`text-xs ${sub}`}>{workerItems.length} {workerItems.length === 1 ? 'задача' : workerItems.length < 5 ? 'задачи' : 'задач'}</span>
                          </div>
                          {workerItems.length === 0 ? (
                            <div className={`text-xs ${sub}`}>Свободно</div>
                          ) : (
                            <div className="space-y-2">
                              {workerItems.map((booking) => (
                                <div key={`${worker.id}-${booking.id}`} className="flex items-center justify-between gap-2 w-full text-left">
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium truncate flex items-center gap-1.5 min-w-0">
                                      <Clock size={12} className="inline mr-1 -mt-0.5 shrink-0" style={{ color: primary }} />
                                      <span className="tabular-nums">{booking.time}</span> · {booking.clientName}
                                      <SourceBadge source={booking.source} />
                                      {booking.isRepeatVisit && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 shrink-0">Повторный</span>
                                      )}
                                      {isMine(booking) && (
                                        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full`} style={{ background: `${accent}20`, color: accent }}>
                                          Моя
                                        </span>
                                      )}
                                    </div>
                                    <div className={`text-xs ${sub} truncate`}>{booking.box} · {booking.service}</div>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${workerCalendarStatusBadge(booking.status)}`}>
                                    {workerCalendarStatusLabel(booking.status)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </motion.div>
  );
}
