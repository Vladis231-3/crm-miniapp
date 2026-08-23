import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { Booking, ScheduleDay, Worker } from '../../../context/AppContext';
import { apiRequest } from '../../../api';
import type { WorkerCalendarBooking } from '../WorkerCalendar';
import { WorkerCalendar } from '../WorkerCalendar';
import { SourceBadge } from '../../shared/SourceBadge';
import { StatusBadge } from '../../atmosfera';

export interface WorkerScheduleScreenProps {
  /** Ближайшие даты (сегодня+2) для режима списка. */
  upcomingDates: string[];
  bookings: Booking[];
  workerId: string;
  isDark: boolean;
  workers: Worker[];
  schedule: ScheduleDay[];
}

type ViewMode = 'list' | 'calendar';

/**
 * WorkerScheduleScreen — вырезка из WorkerApp (§6.3).
 * Сегмент «Список · Календарь»: список = сегодня+2 дня (как было),
 * календарь = месяц загрузки (WorkerCalendar: недели с Пн, токены статусов).
 * Данные календаря грузятся самостоятельно (/api/worker/calendar).
 */
export function WorkerScheduleScreen({
  upcomingDates,
  bookings,
  workerId,
  isDark,
  workers,
  schedule,
}: WorkerScheduleScreenProps) {
  const [view, setView] = useState<ViewMode>('list');
  const [calendarItems, setCalendarItems] = useState<WorkerCalendarBooking[] | null>(null);
  const [calendarError, setCalendarError] = useState(false);

  const loadCalendar = () => {
    setCalendarItems(null);
    setCalendarError(false);
    apiRequest<WorkerCalendarBooking[]>('/api/worker/calendar')
      .then(setCalendarItems)
      .catch((e) => {
        console.error('worker calendar error:', e);
        setCalendarItems([]);
        setCalendarError(true);
      });
  };

  useEffect(() => {
    if (view === 'calendar' && calendarItems === null && !calendarError) {
      loadCalendar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const isMyTask = (task: Booking) => task.workers.some((w) => w.workerId === workerId);

  return (
    <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      {/* Переключатель вида */}
      <div className="mb-4 flex gap-1 rounded-xl border border-border bg-[var(--sunken,#EEEFF3)] p-1 dark:bg-white/5">
        {(['list', 'calendar'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setView(mode)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              view === mode
                ? 'bg-[var(--card-raised,var(--card))] text-foreground shadow-sm'
                : 'text-[var(--fg-secondary,#5A6072)]'
            }`}
          >
            {mode === 'list' ? 'Список' : 'Календарь'}
          </button>
        ))}
      </div>

      {view === 'list' ? (
        <>
          <h2 className="mb-4 text-[15px] font-semibold">Ближайшие дни</h2>
          {upcomingDates.slice(0, 3).map((date) => {
            const dayTasks = bookings.filter((b) => b.date === date && isMyTask(b));
            return (
              <div key={date} className="mb-4">
                <div className="section-kicker mb-2">{date}</div>
                {dayTasks.length === 0 ? (
                  <div className="rounded-xl border border-border bg-[var(--card)] p-3 text-sm text-[var(--fg-secondary,#5A6072)]">
                    Свободный день
                  </div>
                ) : (
                  dayTasks.map((task) => {
                    const completed = task.status === 'completed';
                    return (
                      <div key={task.id} className="mb-2 rounded-xl border border-border bg-[var(--card)] p-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-medium tabular-nums">
                              {task.time} — {task.service}
                            </div>
                            <div className="text-xs text-[var(--fg-secondary,#5A6072)]">
                              {task.box} · {task.clientName}
                              <SourceBadge source={task.source} className="ml-1.5 align-middle" />
                            </div>
                            {task.car && (
                              <div className="text-xs text-[var(--fg-secondary,#5A6072)]">
                                {task.car}
                                {task.plate ? ` (${task.plate})` : ''}
                              </div>
                            )}
                            {(task.additionalServices || []).some((as) => as.workers.some((w) => w.workerId === workerId)) && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(task.additionalServices || [])
                                  .filter((as) => as.workers.some((w) => w.workerId === workerId))
                                  .map((as) => (
                                    <span
                                      key={as.id}
                                      className="rounded-full bg-[var(--primary-50)] px-2 py-0.5 text-[11px] text-[var(--primary-700)] dark:bg-[var(--primary-100)] dark:text-[var(--primary-300)]"
                                    >
                                      + {as.name}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                          {completed ? (
                            <span className="shrink-0 rounded-full bg-[var(--status-success-soft)] px-2 py-0.5 text-xs text-[var(--status-success)]">
                              Выполнено
                            </span>
                          ) : (
                            <StatusBadge status={task.status} className="shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </>
      ) : (
        <>
          {calendarError && (
            <div className="mb-3 rounded-xl border border-border bg-[var(--status-danger-soft)] p-3 text-sm text-[var(--status-danger)]">
              Не удалось загрузить календарь. Нажмите «Обновить» в календаре для повтора.
            </div>
          )}
          <WorkerCalendar
            bookings={calendarItems ?? []}
            loading={view === 'calendar' && calendarItems === null && !calendarError}
            workers={workers}
            schedule={schedule}
            workerId={workerId}
            todayLabel={upcomingDates[0] ?? ''}
            glass="border border-border bg-[var(--card)]"
            isDark={isDark}
            sub="text-[var(--fg-secondary,#5A6072)]"
            primary="var(--primary-600)"
            accent="var(--status-success)"
            onRefresh={loadCalendar}
          />
        </>
      )}
    </motion.div>
  );
}
