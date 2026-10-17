import { motion } from 'motion/react';
import { CalendarDays, Trash2 } from 'lucide-react';
import { useApp, Booking } from '../../../context/AppContext';
import { EmptyState } from '../../shared/EmptyState';
import { Button, Money, StatTile, StatusBadge } from '../../atmosfera';

const UPCOMING_STATUSES = new Set<Booking['status']>(['new', 'confirmed', 'scheduled', 'in_progress', 'admin_review']);
const HISTORY_STATUSES = new Set<Booking['status']>(['completed', 'cancelled', 'no_show']);
const CANCELLABLE_STATUSES = new Set<Booking['status']>(['new', 'confirmed', 'scheduled', 'admin_review']);

function isManualSchedulingBooking(booking: Booking) {
  return booking.status === 'admin_review' && (!booking.time || booking.time === '00:00');
}

export interface BookingsScreenProps {
  /** Открыть каталог (CTA пустого состояния). */
  onNavigateToCatalog: () => void;
  /** Запрос отмены записи — состояние живёт в ClientApp (TG MainButton/BackButton). */
  onRequestCancel: (bookingId: string) => void;
}

/**
 * BookingsScreen — вырезка из ClientApp (REDESIGN_PLAN.md §6.1, Фаза 2).
 * Карточки на DS: Money + StatusBadge (statusMap вместо локальных мап).
 */
export function BookingsScreen({ onNavigateToCatalog, onRequestCancel }: BookingsScreenProps) {
  const { bookings, session } = useApp();

  const clientBookings = bookings.filter((booking) => booking.clientId === session?.actorId);
  const upcomingBookings = clientBookings.filter((booking) => UPCOMING_STATUSES.has(booking.status));
  const pastBookings = clientBookings.filter((booking) => HISTORY_STATUSES.has(booking.status));
  const completedBookings = clientBookings.filter((booking) => booking.status === 'completed');
  const totalSpent = completedBookings.reduce((sum, booking) => sum + booking.price, 0);
  const favoriteService = completedBookings.length > 0
    ? Object.entries(completedBookings.reduce<Record<string, number>>((acc, booking) => {
        acc[booking.service] = (acc[booking.service] || 0) + 1;
        return acc;
      }, {})).sort((left, right) => right[1] - left[1])[0]?.[0] || 'Пока нет'
    : 'Пока нет';

  return (
    <>
      {clientBookings.length === 0 ? (
        <div className="rounded-2xl border border-border">
          <EmptyState
            icon={CalendarDays}
            title="У вас пока нет записей"
            subtitle="Выберите услугу и удобное время  -  это займёт минуту"
          />
          <div className="-mt-2 flex justify-center pb-6">
            <Button size="md" onClick={onNavigateToCatalog} className="rounded-full px-6">
              Записаться
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="mb-2 grid grid-cols-3 gap-2">
            <StatTile label="Визитов" value={String(completedBookings.length)} />
            <StatTile label="Потрачено" value={<Money amount={totalSpent} />} />
            <StatTile label="Любимая" value={favoriteService.split(' ')[0] || 'Нет'} />
          </div>

          {/* Предстоящие */}
          <div className="section-kicker mb-2">Предстоящие</div>
          {upcomingBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onCancel={() => onRequestCancel(booking.id)} />
          ))}
          {upcomingBookings.length === 0 && (
            <p className="py-2 text-center text-sm text-[var(--fg-secondary,#5A6072)]">
              Нет предстоящих записей
            </p>
          )}

          {/* Прошедшие */}
          <div className="section-kicker mb-2 mt-4">Прошедшие</div>
          {pastBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onCancel={() => onRequestCancel(booking.id)} />
          ))}
        </div>
      )}
    </>
  );
}

interface BookingCardProps {
  booking: Booking;
  onCancel: () => void;
}

function BookingCard({ booking, onCancel }: BookingCardProps) {
  const manualScheduling = isManualSchedulingBooking(booking);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl border border-border bg-[var(--card)] p-4"
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="font-semibold">{booking.service}</div>
          <div className="text-sm text-[var(--fg-secondary,#5A6072)]">
            {manualScheduling ? 'Время уточнит администратор' : `${booking.date} в ${booking.time}`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold">
            <Money amount={booking.price} />
          </div>
          <StatusBadge status={booking.status} className="mt-1" />
        </div>
      </div>
      <div className="mb-3 text-xs text-[var(--fg-secondary,#5A6072)]">
        {manualScheduling ? 'Запрос принят и ждёт согласования' : `${booking.box} · ${booking.duration} мин`}
      </div>
      {CANCELLABLE_STATUSES.has(booking.status) && (
        <Button variant="secondary" size="sm" className="w-full text-[var(--status-danger)]" onClick={onCancel}>
          <Trash2 size={14} strokeWidth={1.75} aria-hidden />
          Отменить запись
        </Button>
      )}
    </motion.div>
  );
}
