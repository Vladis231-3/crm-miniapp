import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Bell, Sun, Moon, X, CalendarDays, LayoutGrid, User
} from 'lucide-react';
import { useApp, Booking, BookingSlotAvailability, Service } from '../../context/AppContext';
import { formatDate, getScheduleDayIndex, parseFlexibleDate } from '../../utils/date';
import { normalizePlateInput } from '../../utils/validation';
import { useTelegramMainButton } from '../../hooks/useTelegramMainButton';
import { useTelegramBackButton } from '../../hooks/useTelegramBackButton';
import { ProfileScreen } from './screens/ProfileScreen';
import { BookingsScreen } from './screens/BookingsScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { DetailScreen } from './screens/DetailScreen';
import { SlotsScreen } from './screens/SlotsScreen';
import { ConfirmSuccessScreen } from './screens/ConfirmSuccessScreen';
import { Button, Dialog, Money, Sheet, SummaryRows, Toaster } from '../atmosfera';

const NOOP = () => {};

const UPCOMING_STATUSES = new Set<Booking['status']>(['new', 'confirmed', 'scheduled', 'in_progress', 'admin_review']);
const HISTORY_STATUSES = new Set<Booking['status']>(['completed', 'cancelled', 'no_show']);
const CANCELLABLE_STATUSES = new Set<Booking['status']>(['new', 'confirmed', 'scheduled', 'admin_review']);
type Page = 'catalog' | 'detail' | 'slots' | 'confirm' | 'bookings' | 'profile';

function isBoxRentalService(service: Service | null | undefined) {
  return service?.category === 'Аренда бокса';
}

function isDetailingService(service: Service | null | undefined) {
  return service?.category === 'Детейлинг';
}

function serviceResourceGroup(service: Service | null | undefined) {
  return service?.resourceGroup || 'wash';
}

function bookingBoxesForService(service: Service | null | undefined, boxes: Array<{ name: string; resourceGroup: string; active: boolean }>) {
  return serviceResourceGroup(service) === 'detailing'
    ? boxes.filter((box) => box.active && box.resourceGroup === 'detailing')
    : boxes.filter((box) => box.active && box.resourceGroup === 'wash');
}

function isManualSchedulingBooking(booking: Booking) {
  return booking.status === 'admin_review' && (!booking.time || booking.time === '00:00');
}

export function ClientApp() {
  const {
    isDark,
    toggleTheme,
    bookings,
    deleteBooking,
    notifications,
    markAllNotificationsRead,
    clientProfile,
    services,
    boxes,
    addBooking,
    updateClientProfile,
    logout,
    upcomingDates,
    schedule,
    getBookingAvailabilityForDate,
    refreshBootstrap,
    session,
  } = useApp();
  const [page, setPage] = useState<Page>('catalog');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(upcomingDates[0] || '');
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotAvailability, setSlotAvailability] = useState<BookingSlotAvailability[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [boxRentalHours, setBoxRentalHours] = useState(1);
  const [selectedBookingVehicleIndex, setSelectedBookingVehicleIndex] = useState(0);
  const [detailingNote, setDetailingNote] = useState('');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (!selectedDate && upcomingDates[0]) {
      setSelectedDate(upcomingDates[0]);
    }
  }, [selectedDate, upcomingDates]);

  useEffect(() => {
    if (!selectedDate) return;
    const parsedSelectedDate = parseFlexibleDate(selectedDate);
    if (parsedSelectedDate && parsedSelectedDate >= todayStart) return;
    const nextAvailableDate = upcomingDates.find((dateValue) => {
      const parsedDate = parseFlexibleDate(dateValue);
      return parsedDate !== null && parsedDate >= todayStart;
    });
    if (nextAvailableDate && nextAvailableDate !== selectedDate) {
      setSelectedDate(nextAvailableDate);
      setSelectedSlot(null);
    }
  }, [selectedDate, upcomingDates]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate, selectedService?.id, boxRentalHours]);

  useEffect(() => {
    if (page !== 'slots' || session?.role !== 'client') return;
    void refreshBootstrap().catch(() => undefined);
  }, [page, selectedDate, session?.role]);

  useEffect(() => {
    if (!selectedService || page !== 'slots') {
      setSlotAvailability([]);
      setSlotsLoading(false);
      return;
    }
    const parsedSelectedDate = parseFlexibleDate(selectedDate);
    if (parsedSelectedDate && parsedSelectedDate < todayStart) {
      setSlotAvailability([]);
      setSlotsLoading(false);
      return;
    }

    let cancelled = false;
    const loadAvailability = async () => {
      try {
        setSlotsLoading(true);
        const durationMinutes = isBoxRentalService(selectedService)
          ? boxRentalHours * 60
          : selectedService.duration;
        const nextSlots = await getBookingAvailabilityForDate(selectedDate, {
          durationMinutes,
          serviceId: selectedService.id,
          resourceGroup: serviceResourceGroup(selectedService),
        });
        if (!cancelled) {
          setSlotAvailability(nextSlots);
        }
      } finally {
        if (!cancelled) {
          setSlotsLoading(false);
        }
      }
    };

    void loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [boxRentalHours, getBookingAvailabilityForDate, page, selectedDate, selectedService]);

  useEffect(() => {
    // Сброс выбора авто для флоу записи при обновлении профиля
    // (синхронизация самой формы профиля переехала в screens/ProfileScreen.tsx)
    setSelectedBookingVehicleIndex(0);
  }, [clientProfile]);

  useEffect(() => {
    setBoxRentalHours(1);
    setDetailingNote('');
  }, [selectedService?.id]);

  // Поиск/категории каталога переехали в screens/CatalogScreen.tsx
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
  const myNotifications = notifications.filter((notification) => notification.recipientRole === 'client' && notification.recipientId === session?.actorId);
  const unreadCount = myNotifications.filter(n => !n.read).length;
  const compatibleBoxes = bookingBoxesForService(selectedService, boxes);
  const defaultBoxName = compatibleBoxes[0]?.name || 'Детейлинг';

  const selectedServiceIsBoxRental = isBoxRentalService(selectedService);
  const selectedServiceIsDetailing = isDetailingService(selectedService);
  const selectedDuration = selectedService
    ? selectedServiceIsBoxRental
      ? boxRentalHours * 60
      : selectedService.duration
    : 0;
  const selectedPrice = selectedService
    ? selectedServiceIsBoxRental
      ? selectedService.price * boxRentalHours
      : selectedService.price
    : 0;
  const selectedDayDate = parseFlexibleDate(selectedDate);
  const selectedDaySchedule = selectedDayDate
    ? schedule.find((entry) => entry.dayIndex === getScheduleDayIndex(selectedDayDate)) || null
    : null;
  const selectedDayWorkingHours = selectedDaySchedule
    ? selectedDaySchedule.active
      ? `${selectedDaySchedule.open}-${selectedDaySchedule.close}`
      : 'Выходной'
    : 'Не настроено';

  const bookingVehicles = clientProfile.vehicles?.length
    ? clientProfile.vehicles.filter((vehicle) => vehicle.car || vehicle.plate)
    : (clientProfile.car || clientProfile.plate ? [{ car: clientProfile.car || '', plate: clientProfile.plate || '' }] : []);
  const selectedBookingVehicle = bookingVehicles[selectedBookingVehicleIndex] || bookingVehicles[0] || { car: clientProfile.car || '', plate: clientProfile.plate || '' };

  const glass = isDark
    ? 'bg-white/5 backdrop-blur-md border border-white/10'
    : 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm';

  const bg = isDark ? 'bg-[#131316]' : 'bg-[#F7F7F8]';
  const text = isDark ? 'text-[#E4E4E7]' : 'text-[#131316]';
  const sub = isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]';
  const primary = isDark ? '#6E76F2' : '#4F46E5';
  const slotCards = slotAvailability.filter((slot) => slot.available || slot.occupiedBoxes > 0);
  const availableSlotCards = slotCards.filter((slot) => slot.available).length;
  const occupiedSlotCards = slotCards.filter((slot) => !slot.available).length;

  const handleConfirmBooking = async () => {
    if (!selectedService || !session) return;
    if (!selectedSlot) return;

    setShowSlotModal(false);
    if (!selectedDayDate || selectedDayDate < todayStart) {
      const nextAvailableDate = upcomingDates.find((dateValue) => {
        const parsedDate = parseFlexibleDate(dateValue);
        return parsedDate !== null && parsedDate >= todayStart;
      });
      setSelectedDate(nextAvailableDate || formatDate(todayStart));
      setSelectedSlot(null);
      return;
    }
    const primaryVehicle = selectedBookingVehicle;
    const booking = await addBooking({
      clientId: session.actorId,
      clientName: clientProfile.name,
      clientPhone: clientProfile.phone,
      service: selectedService.name,
      serviceId: selectedService.id,
      date: selectedDate,
      time: selectedSlot || '',
      duration: selectedDuration,
      price: selectedPrice,
      status: 'admin_review',
      workers: [],
      box: defaultBoxName,
      paymentType: 'cash',
      paymentSettled: false,
      car: primaryVehicle.car,
      plate: primaryVehicle.plate,
      plateType: (primaryVehicle as any).plateType || 'russian',
      notes: detailingNote.trim() || undefined,
    });
    setConfirmedBookingId(booking.id);
    setPage('confirm');
  };

  const handleCancelBooking = useCallback(() => {
    if (showCancelConfirm) deleteBooking(showCancelConfirm);
  }, [showCancelConfirm, deleteBooking]);

  const mainBtnState = (() => {
    if (showSlotModal && selectedSlot) {
      return { text: 'Подтвердить запись', onClick: handleConfirmBooking, enabled: true };
    }
    if (showCancelConfirm) {
      return { text: 'Отменить запись', onClick: handleCancelBooking, enabled: true };
    }
    return null;
  })();

  useTelegramMainButton(
    mainBtnState?.text || '',
    mainBtnState?.onClick || NOOP,
    mainBtnState !== null,
  );

  const navRef = useRef({ page, showCancelConfirm, showSlotModal });
  navRef.current = { page, showCancelConfirm, showSlotModal };

  const handleBack = useCallback(() => {
    const { page: p, showCancelConfirm: scc, showSlotModal: ssm } = navRef.current;
    if (scc) { setShowCancelConfirm(null); return; }
    if (ssm) { setShowSlotModal(false); return; }
    if (p === 'detail') setPage('catalog');
    else if (p === 'slots') setPage('detail');
    else if (p === 'confirm') setPage('slots');
    else if (p === 'bookings') setPage('catalog');
    else if (p === 'profile') setPage('catalog');
  }, []);

  useTelegramBackButton(
    handleBack,
    page !== 'catalog' || showSlotModal || showCancelConfirm !== null,
  );

  return (
    <div className={`${isDark ? 'dark' : ''} atmosfera-shell ${bg} ${text} min-h-screen flex flex-col relative`}>
      {/* Header */}
      <div className={`work-header ${glass} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {(page === 'detail' || page === 'slots' || page === 'confirm' || page === 'bookings') && (
            <button
              onClick={() => {
                if (page === 'detail') setPage('catalog');
                else if (page === 'slots') setPage('detail');
                else if (page === 'confirm') setPage('slots');
                else if (page === 'bookings') setPage('catalog');
              }}
              className={`p-2 rounded-xl ${glass} mr-1`}
            >
              <ArrowLeft size={18} strokeWidth={1.75} />
            </button>
          )}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: primary }}>
            {clientProfile.name ? clientProfile.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="min-w-0">
            <span className="text-base font-bold tracking-tight leading-tight block truncate">{clientProfile.name || 'ATMOSFERA'}</span>
            {clientProfile.car && page === 'catalog' && (
              <div className={`text-[11px] ${sub}`}>{clientProfile.car} · {clientProfile.plate}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              markAllNotificationsRead('client');
              setPage('bookings');
            }}
            className={`p-2 rounded-xl ${glass} relative`}
          >
            <Bell size={18} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          <button onClick={toggleTheme} className={`p-2 rounded-xl ${glass}`}>
            {isDark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="role-nav"><div className="role-nav__scroll">
        <button
          onClick={() => setPage('catalog')}
          className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all`}
        >
          <LayoutGrid size={20} strokeWidth={1.75} style={{ color: page === 'catalog' ? primary : undefined }} className={page !== 'catalog' ? sub : ''} />
          <span className="text-xs" style={{ color: page === 'catalog' ? primary : undefined }}>Каталог</span>
        </button>
        <button
          onClick={() => setPage('bookings')}
          className="flex-1 py-3 flex flex-col items-center gap-1 relative"
        >
          <CalendarDays size={20} strokeWidth={1.75} style={{ color: page === 'bookings' ? primary : undefined }} className={page !== 'bookings' ? sub : ''} />
          <span className="text-xs" style={{ color: page === 'bookings' ? primary : undefined }}>Мои записи</span>
          {upcomingBookings.length > 0 && (
            <span className="absolute top-2 right-8 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {upcomingBookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setPage('profile')}
          className="flex-1 py-3 flex flex-col items-center gap-1"
        >
          <User size={20} strokeWidth={1.75} style={{ color: page === 'profile' ? primary : undefined }} className={page !== 'profile' ? sub : ''} />
          <span className="text-xs" style={{ color: page === 'profile' ? primary : undefined }}>Профиль</span>
        </button>
      </div></div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {/* CATALOG PAGE */}
          {/* CATALOG */}
          {page === 'catalog' && (
            <CatalogScreen onSelectService={(service) => { setSelectedService(service); setPage('detail'); }} />
          )}

          {/* DETAIL */}
          {page === 'detail' && selectedService && (
            <DetailScreen
              serviceName={selectedService.name}
              serviceCategory={selectedService.category}
              serviceDesc={selectedService.desc || ''}
              durationMinutes={selectedDuration}
              price={selectedPrice}
              vehicles={bookingVehicles}
              vehicleIndex={selectedBookingVehicleIndex}
              onVehicleIndexChange={setSelectedBookingVehicleIndex}
              isBoxRental={selectedServiceIsBoxRental}
              isDetailing={selectedServiceIsDetailing}
              boxHours={boxRentalHours}
              onBoxHoursChange={setBoxRentalHours}
              note={detailingNote}
              onNoteChange={setDetailingNote}
              onNext={() => setPage('slots')}
            />
          )}

          {/* SLOTS PAGE */}
          {page === 'slots' && selectedService && (
            <SlotsScreen
              dates={upcomingDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              dateLabel={selectedDate || formatDate(new Date())}
              workingHoursLabel={selectedDayWorkingHours}
              isBoxRental={selectedServiceIsBoxRental}
              boxHours={boxRentalHours}
              onBoxHoursChange={setBoxRentalHours}
              durationMinutes={selectedDuration}
              price={selectedPrice}
              availableCount={availableSlotCards}
              occupiedCount={occupiedSlotCards}
              isDetailing={selectedServiceIsDetailing}
              slots={slotAvailability}
              loading={slotsLoading}
              emptyLabel={slotAvailabilityEmptyLabel}
              selectedSlot={selectedSlot}
              onSelectSlot={(time) => { setSelectedSlot(time); setShowSlotModal(true); }}
            />
          )}

          {page === 'confirm' && selectedService && (
            <ConfirmSuccessScreen
              serviceName={selectedService.name}
              date={selectedDate}
              time={selectedSlot}
              price={selectedPrice}
              durationMinutes={selectedDuration}
              onGoHome={() => setPage('catalog')}
              onMyBookings={() => setPage('bookings')}
            />
          )}

          {/* MY BOOKINGS PAGE */}
          {page === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="px-4 py-4"
            >
              <h2 className="text-lg font-semibold mb-4">Мои записи</h2>
              <BookingsScreen
                onNavigateToCatalog={() => setPage('catalog')}
                onRequestCancel={setShowCancelConfirm}
              />
            </motion.div>
          )}

          {page === 'profile' && (
            <ProfileScreen upcomingCount={upcomingBookings.length} completedCount={completedBookings.length} totalSpent={totalSpent} />
          )}
        </AnimatePresence>
      </div>

      {/* Slot confirmation — DS Sheet (состояние в ClientApp: TG MainButton/BackButton) */}
      <Sheet
        open={showSlotModal && Boolean(selectedService && selectedSlot)}
        onClose={() => setShowSlotModal(false)}
        title="Подтверждение записи"
        footer={
          <>
            <Button size="lg" className="flex-1" onClick={() => { setShowSlotModal(false); handleConfirmBooking(); }}>
              Подтвердить запись
            </Button>
          </>
        }
      >
        <SummaryRows
          rows={[
            { label: 'Услуга', value: selectedService?.name || '' },
            { label: 'Дата', value: selectedDate },
            { label: 'Время', value: selectedSlot || '' },
            { label: 'Стоимость', value: <Money amount={selectedPrice} /> },
            { label: 'Длительность', value: `${selectedDuration} мин` },
          ]}
        />
        <button onClick={() => setShowSlotModal(false)} className="mt-4 w-full py-2 text-sm text-[var(--fg-secondary,#5A6072)]">
          Выбрать другой
        </button>
      </Sheet>

      {/* Cancel confirm — DS Dialog (состояние в ClientApp: TG MainButton/BackButton) */}
      <Dialog
        open={Boolean(showCancelConfirm)}
        onClose={() => setShowCancelConfirm(null)}
        title="Отменить запись?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setShowCancelConfirm(null)}>
              Назад
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleCancelBooking}>
              Отменить
            </Button>
          </>
        }
      >
        Это действие нельзя отменить.
      </Dialog>

      <Toaster />
    </div>
  );
}

