import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, type Variants } from 'motion/react';
import { Calendar, ChevronDown, ChevronRight, Package, Plus, Search } from 'lucide-react';
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

const EASE = [0.2, 0.8, 0.2, 1] as const;

const heroVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

/** Плавный счётчик для метрик hero-панели. */
function AnimatedNumber({ value, duration = 0.7 }: { value: number; duration?: number }) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    setDisplay(0);
    motionValue.set(0);
    const controls = animate(motionValue, value, {
      duration,
      ease: EASE,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value, duration, motionValue]);

  return <span className="tabular-nums">{display}</span>;
}

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
  const [listOpen, setListOpen] = useState(false);
  const inProgress = todayBookings.filter((i) => i.status === 'in_progress').length;
  const pending = todayBookings.filter((i) => i.status !== 'completed' && i.status !== 'in_progress').length;
  const completed = todayBookings.filter((i) => i.status === 'completed').length;
  const unassigned = todayBookings.filter((i) => !i.workers?.length).length;

  const dayProgress = todayBookings.length > 0 ? Math.round((completed / todayBookings.length) * 100) : 0;
  const nextPending = todayBookings.find((i) => i.status !== 'completed');

  return (
    <motion.section
      key="day-command"
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      {/* ── HERO: Управление днём ── */}
      <motion.section variants={heroVariants} className="role-hero role-hero--admin mb-4">
        {/* декоративная анимированная подсветка */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 size-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,.22), transparent 65%)' }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="relative flex flex-wrap items-end justify-between gap-4">
          <motion.div variants={heroItem}>
            <div className="text-xs uppercase tracking-[.2em] opacity-70">Day command center</div>
            <h2 className="mt-2 text-2xl font-semibold">Управление днём</h2>
            <p className="mt-1 text-sm opacity-80">Расписание, исключения и быстрые действия в одном контуре.</p>
          </motion.div>
          <motion.div variants={heroItem} className="flex gap-2">
            <button onClick={onQuickCreate} className="semantic-primary-button bg-white text-slate-900">
              <Plus size={17} strokeWidth={1.75} /> Новая запись
            </button>
            <button onClick={onGoClients} className="rounded-xl border border-white/25 px-4 py-2 text-sm">
              <Search size={16} strokeWidth={1.75} className="mr-2 inline" />
              Поиск
            </button>
          </motion.div>
        </motion.div>
        <motion.div variants={heroItem} className="relative mt-5 grid grid-cols-2 gap-2 border-t border-white/15 pt-4 md:grid-cols-4">
          <div><strong className="block text-2xl tabular-nums"><AnimatedNumber value={todayBookings.length} /></strong><span className="text-xs opacity-70">записей</span></div>
          <div><strong className="block text-2xl tabular-nums"><AnimatedNumber value={inProgress} /></strong><span className="text-xs opacity-70">в работе</span></div>
          <div><strong className="block text-2xl tabular-nums"><AnimatedNumber value={pending} /></strong><span className="text-xs opacity-70">ожидают</span></div>
          <div><strong className="block text-2xl tabular-nums"><AnimatedNumber value={completed} /></strong><span className="text-xs opacity-70">готово</span></div>
        </motion.div>
        <motion.div variants={heroItem} className="relative mt-3">
          <div className="flex items-center justify-between text-xs opacity-80">
            <span>Прогресс дня</span>
            <span className="tabular-nums">{dayProgress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${dayProgress}%` }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
            />
          </div>
        </motion.div>
      </motion.section>

      {/* ── Внимание + слоты ── */}
      <motion.section variants={cardItem} initial="hidden" animate="show" className="mb-4 grid gap-3 md:grid-cols-2">
        <motion.div variants={cardItem} className="rounded-2xl border border-border bg-[var(--card)] p-4">
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
        </motion.div>
        <motion.div variants={cardItem} className="rounded-2xl border border-border bg-[var(--card)] p-4">
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
            {todayBookings.length === 0 && <p className={`text-sm ${sub}`}>На сегодня слотов нет</p>}
          </div>
        </motion.div>
      </motion.section>

      {/* ── Быстрые действия ── */}
      <motion.section variants={cardItem} initial="hidden" animate="show" className="mb-4 rounded-2xl border border-border bg-[var(--card)] p-4">
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
      </motion.section>

      {/* ── Записи дня: сворачиваемый блок, чтобы не занимал весь экран ── */}
      <motion.section variants={cardItem} initial="hidden" animate="show" className="mb-4 overflow-hidden rounded-2xl border border-border bg-[var(--card)]">
        <button
          onClick={() => setListOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
          aria-expanded={listOpen}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-50)] dark:bg-[var(--primary-100)]">
              <Calendar size={18} strokeWidth={1.75} style={{ color: 'var(--primary-600)' }} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold">Сегодня · {todayLabel}</div>
              <div className={`truncate text-xs ${sub}`}>
                {todayBookings.length === 0
                  ? 'Записей нет'
                  : nextPending
                    ? `Далее в ${nextPending.time} — ${nextPending.clientName}`
                    : 'Все записи завершены'}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-[var(--primary-50)] px-2.5 py-1 text-xs font-semibold tabular-nums dark:bg-[var(--primary-100)]" style={{ color: 'var(--primary-600)' }}>
              {todayBookings.length}
            </span>
            <motion.span animate={{ rotate: listOpen ? 180 : 0 }} transition={{ duration: 0.25, ease: EASE }}>
              <ChevronDown size={18} strokeWidth={1.75} className={sub} />
            </motion.span>
          </div>
        </button>
        <AnimatePresence initial={false}>
          {listOpen && (
            <motion.div
              key="day-list"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3 px-4 pb-4">
                {todayBookings.length === 0 ? (
                  <div className="rounded-2xl border border-border p-8 text-center">
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
              </motion.div>

              {otherBookings.length > 0 && (
                <div className="px-4 pb-4">
                  <h3 className={`mb-3 text-sm font-medium ${sub}`}>Другие записи</h3>
                  <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                    {otherBookings.map((booking) => (
                      <OtherBookingRow key={booking.id} booking={booking} onOpen={() => onOpenBooking(booking)} />
                    ))}
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </motion.section>
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
    <motion.button
      variants={cardItem}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="w-full rounded-2xl border border-border p-4 text-left"
    >
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
    <motion.button
      variants={cardItem}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="w-full rounded-2xl border border-border p-4 text-left"
    >
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
