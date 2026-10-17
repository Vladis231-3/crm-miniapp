import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Bell, X, CalendarDays, LayoutGrid, User
} from 'lucide-react';
import { useApp, Booking, BookingSlotAvailability, Service, newClientRequestId } from '../../context/AppContext';
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
  // T3: стабильный ключ попытки — дабл-клик/ретрай той же формы replay'ится,
  // а не двоится. Обновляется после успеха.
  const confirmKeyRef = useRef<string>(newClientRequestId());
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

  const slotCards = slotAvailability.filter((slot) => slot.available || slot.occupiedBoxes > 0);
  const availableSlotCards = slotCards.filter((slot) => slot.available).length;
  const occupiedSlotCards = slotCards.filter((slot) => !slot.available).length;
  const slotAvailabilityEmptyLabel = selectedServiceIsBoxRental
    ? (boxRentalHours > 1
        ? 'Свободных боксов на выбранные дату и часы нет — попробуйте другой день или меньше часов'
        : 'Свободных боксов на выбранный день нет — попробуйте другой день')
    : (selectedService === null ? '' : 'Свободных слотов на этот день нет — попробуйте другой день');

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
      clientRequestId: confirmKeyRef.current,
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
      isOutsource: false,
      outsourceAmount: 0,
      car: primaryVehicle.car,
      plate: primaryVehicle.plate,
      plateType: (primaryVehicle as any).plateType || 'russian',
      notes: detailingNote.trim() || undefined,
    });
    setConfirmedBookingId(booking.id);
    confirmKeyRef.current = newClientRequestId();
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
    <div className="personal-app atmosfera-shell min-h-screen flex flex-col relative">
      {/* Header */}
      {(page === 'detail' || page === 'slots' || page === 'confirm' || page === 'bookings' || page === 'profile') && (
        <div className="work-header flex items-center justify-between" style={{ background: '#fff', borderBottom: '1px solid #e8ede9', backdropFilter: 'none' }}>
          <div className="flex items-center gap-3">
            {(page === 'detail' || page === 'slots' || page === 'confirm' || page === 'bookings') && (
              <button
                onClick={() => {
                  if (page === 'detail') setPage('catalog');
                  else if (page === 'slots') setPage('detail');
                  else if (page === 'confirm') setPage('slots');
                  else if (page === 'bookings') setPage('catalog');
                }}
                className="icon-button"
                aria-label="Назад"
              >
                <ArrowLeft size={18} strokeWidth={1.75} />
              </button>
            )}
            <strong style={{ fontSize: 13 }}>
              {page === 'bookings' ? 'Мои записи' : page === 'profile' ? 'Профиль' : 'Запись'}
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                markAllNotificationsRead('client');
                setPage('bookings');
              }}
              className="icon-button notification"
              aria-label="Уведомления"
            >
              <Bell size={17} strokeWidth={1.75} />
              {unreadCount > 0 && <i aria-hidden />}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* CATALOG (Главная: hero + услуги) */}
          {page === 'catalog' && (
            <CatalogScreen
              onSelectService={(service) => { setSelectedService(service); setPage('detail'); }}
              nextBooking={upcomingBookings[0] ?? null}
            />
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
              className="page-content px-4 py-4"
            >
              <BookingsScreen
                onNavigateToCatalog={() => setPage('catalog')}
                onRequestCancel={setShowCancelConfirm}
              />
            </motion.div>
          )}

          {page === 'profile' && (
            <div className="page-content px-4 py-4">
              <ProfileScreen upcomingCount={upcomingBookings.length} completedCount={completedBookings.length} totalSpent={totalSpent} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Nav — нижняя навигация макета */}
      <div className="bottom-nav">
        <button
          onClick={() => setPage('catalog')}
          className={page === 'catalog' ? 'active' : undefined}
        >
          <LayoutGrid size={19} strokeWidth={1.9} />
          <span>Главная</span>
        </button>
        <button
          onClick={() => setPage('bookings')}
          className={page === 'bookings' ? 'active' : undefined}
        >
          <CalendarDays size={19} strokeWidth={1.9} />
          <span>Мои записи</span>
        </button>
        <button
          onClick={() => setPage('profile')}
          className={page === 'profile' ? 'active' : undefined}
        >
          <User size={19} strokeWidth={1.9} />
          <span>Профиль</span>
        </button>
      </div>

      {/* Slot confirmation  -  DS Sheet (состояние в ClientApp: TG MainButton/BackButton) */}
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

      {/* Cancel confirm  -  DS Dialog (состояние в ClientApp: TG MainButton/BackButton) */}
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

