import { motion } from 'motion/react';
import { Calendar, ChevronRight, Package, Plus, Search } from 'lucide-react';
import type { Booking, Service } from '../../../context/AppContext';
import { SourceBadge } from '../../shared/SourceBadge';
import { Money, StatusBadge } from '../../atmosfera';
import { statusTone } from '../../atmosfera/statusMap';
import { isFixedMasterService, formatFixedMasterAmount } from '../../ui/utils';

const TONE_BAR: Record<string, string> = {
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  danger: 'var(--status-danger)',
  info: 'var(--status-info)',
  neutral: 'var(--fg-muted,#8A91A0)',
};

export interface AdminCalendarDayScreenProps {
  todayBookings: Booking[];
  otherBookings: Booking[];
  services: Service[];
  unreadCount: number;
  todayLabel: string;
  onQuickCreate: () => void;
  onGoClients: () => void;
  onGoStock: () => void;
  onOpenNotifications: () => void;
  onOpenBooking: (booking: Booking) => void;
}

/** AdminCalendarDayScreen — вырезка из AdminApp (§6.2). Презентационный. */
export function AdminCalendarDayScreen({
  todayBookings,
  otherBookings,
  services,
  unreadCount,
  todayLabel,
  onQuickCreate,
  onGoClients,
  onGoStock,
  onOpenNotifications,
  onOpenBooking,
}: AdminCalendarDayScreenProps) {
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  const inProgress = todayBookings.filter((i) => i.status === 'in_progress').length;
  const pending = todayBookings.filter((i) => i.status !== 'completed' && i.status !== 'in_progress').length;
  const completed = todayBookings.filter((i) => i.status === 'completed').length;
  const unassigned = todayBookings.filter((i) => !i.workers?.length).length;

  return (
    <>
      <section className="role-hero role-hero--admin mb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[.2em] opacity-70">Day command center</div>
            <h2 className="mt-2 text-2xl font-semibold">Управление днём</h2>
            <p className="mt-1 text-sm opacity-80">Расписание, исключения и быстрые действия в одном контуре.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onQuickCreate} className="semantic-primary-button bg-white text-slate-900">
              <Plus size={17} strokeWidth={1.75} /> Новая запись
            </button>
            <button onClick={onGoClients} className="rounded-xl border border-white/25 px-4 py-2 text-sm">
              <Search size={16} strokeWidth={1.75} className="mr-2 inline" />
              Поиск
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/15 pt-4 md:grid-cols-4">
          <div><strong className="block text-2xl tabular-nums">{todayBookings.length}</strong><span className="text-xs opacity-70">записей</span></div>
          <div><strong className="block text-2xl tabular-nums">{inProgress}</strong><span className="text-xs opacity-70">в работе</span></div>
          <div><strong className="block text-2xl tabular-nums">{pending}</strong><span className="text-xs opacity-70">ожидают</span></div>
          <div><strong className="block text-2xl tabular-nums">{completed}</strong><span className="text-xs opacity-70">готово</span></div>
        </div>
      </section>

      <section className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-[var(--card)] p-4">
          <div className="section-kicker">Exception rail</div>
          <h3 className="mt-1 font-semibold">Требует внимания</h3>
          <button
            onClick={() => onOpenBooking(todayBookings.find((i) => !i.workers?.length) ?? todayBookings[0])}
            disabled={unassigned === 0}
            className="mt-3 flex w-full items-center justify-between rounded-xl bg-[var(--status-warning-soft)] p-3 text-left disabled:opacity-50"
          >
            <span>Без назначенного мастера</span>
            <strong className="tabular-nums" style={{ color: 'var(--status-warning)' }}>{unassigned}</strong>
          </button>
          <button
            onClick={onOpenNotifications}
            className="mt-2 flex w-full items-center justify-between rounded-xl bg-[var(--status-danger-soft)] p-3 text-left"
          >
            <span>Непрочитанные</span>
            <strong className="tabular-nums" style={{ color: 'var(--status-danger)' }}>{unreadCount}</strong>
          </button>
        </div>
        <div className="rounded-2xl border border-border bg-[var(--card)] p-4">
          <div className="section-kicker">Schedule pulse</div>
          <h3 className="mt-1 font-semibold">Ближайшие слоты</h3>
          <div className="mt-3 space-y-2">
            {todayBookings.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => onOpenBooking(item)}
                className="flex w-full items-center gap-3 rounded-xl bg-[var(--primary-50)] p-2 text-left dark:bg-[var(--primary-100)]"
              >
                <strong className="w-12 tabular-nums">{item.time}</strong>
                <span className="min-w-0 flex-1 truncate">{item.service}</span>
                <ChevronRight size={16} strokeWidth={1.75} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-border bg-[var(--card)] p-4">
        <div className="section-kicker">Operational actions</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button onClick={onQuickCreate} className="rounded-xl bg-[var(--primary-50)] p-3 text-left dark:bg-[var(--primary-100)]">
            <Plus size={18} strokeWidth={1.75} />
            <strong className="mt-2 block">Создать запись</strong>
            <span className={`text-xs ${sub}`}>Открыть существующую форму</span>
          </button>
          <button onClick={onGoClients} className="rounded-xl bg-[var(--primary-50)] p-3 text-left dark:bg-[var(--primary-100)]">
            <Search size={18} strokeWidth={1.75} />
            <strong className="mt-2 block">Найти клиента</strong>
            <span className={`text-xs ${sub}`}>Перейти в клиентскую базу</span>
          </button>
          <button onClick={onGoStock} className="rounded-xl bg-[var(--primary-50)] p-3 text-left dark:bg-[var(--primary-100)]">
            <Package size={18} strokeWidth={1.75} />
            <strong className="mt-2 block">Проверить склад</strong>
            <span className={`text-xs ${sub}`}>Остатки и списания</span>
          </button>
        </div>
      </section>

      <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Сегодня — {todayLabel}</h2>
          <span className={`text-sm ${sub}`}>{todayBookings.length} записей</span>
        </div>
        <div className="space-y-3">
          {todayBookings.length === 0 ? (
            <div className="rounded-2xl border border-border bg-[var(--card)] p-8 text-center">
              <Calendar size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} />
              <p className={sub}>Записей на сегодня нет</p>
            </div>
          ) : (
            todayBookings.map((booking) => (
              <DayBookingCard
                key={booking.id}
                booking={booking}
                services={services}
                onOpen={() => onOpenBooking(booking)}
              />
            ))
          )}
        </div>

        {otherBookings.length > 0 && (
          <div className="mt-6">
            <h3 className={`mb-3 text-sm font-medium ${sub}`}>Другие записи</h3>
            {otherBookings.map((booking) => (
              <OtherBookingRow key={booking.id} booking={booking} onOpen={() => onOpenBooking(booking)} />
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}

function DayBookingCard({
  booking,
  services,
  onOpen,
}: {
  booking: Booking;
  services: Service[];
  onOpen: () => void;
}) {
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  const fixed = isFixedMasterService(services, booking.serviceId, booking.service);
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={onOpen} className="w-full rounded-2xl border border-border bg-[var(--card)] p-4 text-left">
      <div className="flex items-start gap-3">
        <div className="w-1 self-stretch rounded-full" style={{ background: TONE_BAR[statusTone(booking.status)] }} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="truncate text-sm font-semibold tabular-nums">{booking.time}</div>
              <div className="truncate">· {booking.clientName}</div>
              <SourceBadge source={booking.source} />
              {booking.isRepeatVisit && (
                <span className="shrink-0 rounded-full bg-[var(--primary-50)] px-1.5 py-0.5 text-[10px] text-[var(--primary-700)] dark:bg-[var(--primary-100)] dark:text-[var(--primary-300)]">
                  Повторный
                </span>
              )}
            </div>
            <StatusBadge status={booking.status} className="shrink-0" />
          </div>
          <div className={`text-sm ${sub}`}>
            {booking.service}
            {booking.services && booking.services.length > 0 && (
              <span className="ml-1 text-xs text-[var(--primary-600)]">+{booking.services.length}</span>
            )}
          </div>
          <div className="mt-2 flex justify-between">
            <span className={`text-xs ${sub}`}>{booking.box} · {booking.duration} мин</span>
            <span className="text-sm font-semibold"><Money amount={booking.price} /></span>
          </div>
          {booking.workers.length > 0 && (
            <div className={`mt-1 truncate text-xs ${sub}`}>
              Мастера: {booking.workers.map((w) => formatWorkerPay(w, fixed)).join(', ')}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function OtherBookingRow({ booking, onOpen }: { booking: Booking; onOpen: () => void }) {
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  return (
    <motion.button whileTap={{ scale: 0.98 }} onClick={onOpen} className="mb-3 w-full rounded-2xl border border-border bg-[var(--card)] p-4 text-left">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="truncate text-sm font-medium">{booking.clientName}</div>
            <SourceBadge source={booking.source} />
            {booking.isRepeatVisit && (
              <span className="shrink-0 rounded-full bg-[var(--primary-50)] px-1.5 py-0.5 text-[10px] text-[var(--primary-700)] dark:bg-[var(--primary-100)] dark:text-[var(--primary-300)]">
                Повторный
              </span>
            )}
          </div>
          <div className={`truncate text-xs ${sub}`}>
            {booking.service}
            {booking.services && booking.services.length > 0 && <span className="text-[var(--primary-600)]"> +{booking.services.length}</span>}
            {' · '}
            {booking.date}
          </div>
        </div>
        <StatusBadge status={booking.status} className="shrink-0" />
      </div>
    </motion.button>
  );
}

// ── Локальные хелперы (формулы из родителя) ──
function formatWorkerPay(w: any, fixed: boolean): string {
  if (fixed) return `${w.workerName} · фикс ${formatFixedMasterAmount()}`;
  if (w.payType === 'fixed') return `${w.workerName} · ${(w.fixedAmount || 0).toLocaleString('ru')} ₽`;
  return `${w.workerName} ${w.percent}%`;
}
