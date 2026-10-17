import { motion } from 'motion/react';
import { CalendarDays, Trash2 } from 'lucide-react';
import { useApp, Booking } from '../../../context/AppContext';
import { EmptyState } from '../../shared/EmptyState';
import { Button, Money, StatusBadge, StatTile } from '../../atmosfera';

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
 * BookingsScreen — «Мои записи» в стиле дизайн-макета (fa/):
 * карточки panel.booking-card с крупным временем (booking-time) + статусы макета.
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
        <div className="panel">
          <EmptyState
            icon={CalendarDays}
            title="У вас пока нет записей"
            subtitle="Выберите услугу и удобное время  -  это займёт минуту"
          />
          <div className="-mt-2 flex justify-center pb-6">
            <Button size="md" onClick={onNavigateToCatalog}>
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
          <div className="section-title" style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 13 }}>Предстоящие</h2>
            <span className="count">{upcomingBookings.length}</span>
          </div>
          {upcomingBookings.length > 0 ? (
            <div className="booking-cards" style={{ gridTemplateColumns: '1fr' }}>
              {upcomingBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} onCancel={() => onRequestCancel(booking.id)} />
              ))}
            </div>
          ) : (
            <p className="py-2 text-center text-[12px] text-[#96a28f]">Нет предстоящих записей</p>
          )}

          {/* Прошедшие */}
          <div className="section-title" style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 13 }}>История</h2>
            <span className="count">{pastBookings.length}</span>
          </div>
          <div className="booking-cards" style={{ gridTemplateColumns: '1fr' }}>
            {pastBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} onCancel={() => onRequestCancel(booking.id)} />
            ))}
          </div>
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
  const upcoming = UPCOMING_STATUSES.has(booking.status);
  const bigTime = manualScheduling ? '— : —' : upcoming ? booking.time || '' : booking.date.slice(5);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel booking-card"
    >
      <div>
        <span className="status">
          <i aria-hidden />
          {upcoming ? 'ПРЕДСТОЯЩАЯ' : 'ЗАВЕРШЕНА'}
        </span>
      </div>
      <div className="booking-time">{bigTime || booking.date.slice(5)}</div>
      <strong style={{ fontSize: 13, color: '#273b34' }}>{booking.service}</strong>
      <p>{manualScheduling ? 'Администратор свяжется и уточнит время' : `${booking.date} · ${booking.box} · ${booking.duration} мин`}</p>
      <div className="booking-card-footer">
        <StatusBadge status={booking.status} />
        <strong><Money amount={booking.price} /></strong>
      </div>
      {CANCELLABLE_STATUSES.has(booking.status) && (
        <button
          type="button"
          onClick={onCancel}
          className="text-button"
          style={{ color: '#b37e75', marginTop: 10, alignSelf: 'flex-start' }}
        >
          <Trash2 size={13} strokeWidth={1.75} aria-hidden />
          Отменить запись
        </button>
      )}
    </motion.div>
  );
}
