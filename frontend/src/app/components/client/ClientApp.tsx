import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu, ChevronRight, ArrowLeft, Check,
  Calendar, Share2, Bell, Sun, Moon, X, CalendarDays, LayoutGrid, User
} from 'lucide-react';
import { Skeleton } from '../shared/Skeleton';
import { useApp, Booking, BookingSlotAvailability, Service } from '../../context/AppContext';
import { formatDate, getScheduleDayIndex, parseFlexibleDate } from '../../utils/date';
import { normalizePlateInput } from '../../utils/validation';
import { useTelegramMainButton } from '../../hooks/useTelegramMainButton';
import { useTelegramBackButton } from '../../hooks/useTelegramBackButton';
import { ProfileScreen } from './screens/ProfileScreen';
import { BookingsScreen } from './screens/BookingsScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { DetailScreen } from './screens/DetailScreen';
import { Button, Dialog, Toaster } from '../atmosfera';

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
  const [calendarAnim, setCalendarAnim] = useState(false);
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
  const primaryBtn = isDark ? 'bg-[#6E76F2] text-white' : 'bg-[#4F46E5] text-white';
  const secondaryBtn = isDark ? 'bg-white/10 text-[#E4E4E7] border border-white/20' : 'bg-white text-[#131316] border border-black/10';
  const slotCards = slotAvailability.filter((slot) => slot.available || slot.occupiedBoxes > 0);
  const availableSlotCards = slotCards.filter((slot) => slot.available).length;
  const occupiedSlotCards = slotCards.filter((slot) => !slot.available).length;
  const slotAvailabilityLoadingLabel = selectedServiceIsDetailing ? 'Обновляем свободные окна для детейлинга...' : 'Обновляем занятость по боксам...';
  const slotAvailabilityEmptyLabel = selectedServiceIsDetailing ? 'На выбранную дату свободных окон для детейлинга пока нет.' : 'На выбранную дату подходящих слотов пока нет.';

  const handleAddToCalendar = () => {
    setCalendarAnim(true);
    setTimeout(() => {
      setCalendarAnim(false);
      setPage('bookings');
    }, 700);
  };

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
            <motion.div
              key="slots"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.22 }}
              className="px-4 py-4"
            >
              <div className="flex gap-2 mb-4 overflow-x-auto">
                {upcomingDates.map(d => (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`shrink-0 px-3 py-2 rounded-xl text-sm transition-all ${
                      selectedDate === d ? `text-white` : `${glass} ${sub}`
                    }`}
                    style={selectedDate === d ? { background: primary } : {}}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {selectedServiceIsBoxRental && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className={`text-sm font-medium ${text}`}>Длительность аренды</div>
                      <div className={`text-xs ${sub} mt-1`}>
                        Выберите, на сколько часов нужен бокс. Занятость ниже пересчитывается сразу.
                      </div>
                    </div>
                    <div
                      className="shrink-0 rounded-2xl px-3 py-2 text-right"
                      style={{ background: `${primary}15`, color: primary }}
                    >
                      <div className="text-base font-semibold">{boxRentalHours} ч</div>
                      <div className="text-[11px]">{selectedPrice.toLocaleString('ru')} ₽</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((hours) => {
                      const selected = boxRentalHours === hours;
                      return (
                        <button
                          key={hours}
                          onClick={() => setBoxRentalHours(hours)}
                          className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${selected ? 'text-white' : glass}`}
                          style={selected ? { background: primary } : {}}
                        >
                          {hours} ч
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl px-3 py-2`}>
                      <div className={`text-[11px] ${sub}`}>Длительность</div>
                      <div className="text-sm font-semibold mt-1">{selectedDuration} мин</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl px-3 py-2`}>
                      <div className={`text-[11px] ${sub}`}>Свободно</div>
                      <div className="text-sm font-semibold mt-1">{availableSlotCards}</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl px-3 py-2`}>
                      <div className={`text-[11px] ${sub}`}>Занято</div>
                      <div className="text-sm font-semibold mt-1">{occupiedSlotCards}</div>
                    </div>
                  </div>
                </div>
              )}
              <h3 className={`text-sm font-medium ${sub} mb-3`}>Доступное время</h3>
              <div className={`${glass} rounded-2xl p-3 mb-4`}>
                <div className={`text-xs ${sub}`}>Часы работы на {selectedDate || formatDate(new Date())}</div>
                <div className="font-medium mt-1">{selectedDayWorkingHours}</div>
              </div>
              {slotsLoading ? (
                <div className="grid grid-cols-2 gap-3 mb-6" aria-busy="true">
                  {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-2xl" />)}
                </div>
              ) : slotCards.length === 0 ? (
                <div className={`${glass} rounded-2xl p-4 text-sm ${sub}`}>
                  {slotAvailabilityEmptyLabel}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {slotCards.map((slot) => {
                    const selected = selectedSlot === slot.time;
                    const slotClass = selected
                      ? 'text-white'
                      : slot.available
                        ? glass
                        : isDark
                          ? 'bg-red-500/15 border border-red-400/50 text-red-100 shadow-[0_0_0_1px_rgba(248,113,113,0.25)]'
                          : 'bg-red-50 border-2 border-red-300 text-red-800 shadow-[0_8px_24px_rgba(239,68,68,0.12)]';
                    return (
                      <motion.button
                        key={slot.time}
                        onClick={() => {
                          if (!slot.available) return;
                          setSelectedSlot(slot.time);
                          setShowSlotModal(true);
                        }}
                        whileTap={slot.available ? { scale: 0.96 } : undefined}
                        animate={{ scale: selected ? 1.03 : 1 }}
                        className={`rounded-2xl p-3 text-left transition-all ${slotClass} ${slot.available ? '' : 'relative overflow-hidden cursor-not-allowed'}`}
                        style={selected ? { background: primary } : {}}
                        disabled={!slot.available}
                      >
                        {!slot.available && (
                          <div className={`absolute inset-x-0 top-0 h-1 ${isDark ? 'bg-red-400/80' : 'bg-red-500'}`} />
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold">{slot.time}</div>
                            <div className={`mt-1 text-xs ${selected ? 'text-white/80' : sub}`}>
                              {selectedServiceIsDetailing
                                ? slot.available
                                  ? 'Свободное окно детейлинга'
                                  : 'Окно детейлинга занято'
                                : slot.available
                                  ? `Свободно боксов: ${slot.freeBoxes}`
                                  : `Занято боксов: ${slot.occupiedBoxes}`}
                            </div>
                            {!slot.available && (
                              <div className={`mt-2 text-[11px] font-medium ${isDark ? 'text-red-100' : 'text-red-700'}`}>
                                Это окно уже занято на выбранные {boxRentalHours} ч
                              </div>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                              selected
                                ? 'bg-white/20 text-white'
                                : slot.available
                                  ? isDark
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-emerald-50 text-emerald-700'
                                  : isDark
                                    ? 'bg-red-500/25 text-red-100 border border-red-400/40'
                                    : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {slot.available ? 'Свободно' : 'Занято'}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* CONFIRM PAGE */}
          {page === 'confirm' && selectedService && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="px-4 py-8 flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{ background: `${primary}20` }}
              >
                <Check size={36} strokeWidth={1.75} style={{ color: primary }} />
              </motion.div>
              <h2 className="text-xl font-semibold mb-2 text-center">
                Заявка отправлена!
              </h2>
              <p className={`text-sm ${sub} mb-6 text-center`}>
                Администратор свяжется с вами для уточнения деталей
              </p>
              <div className={`${glass} rounded-2xl p-4 w-full mb-6`}>
                <div className="space-y-3">
                  {[
                    { label: 'Услуга', value: selectedService.name },
                    { label: 'Дата', value: selectedDate },
                    { label: 'Время', value: selectedSlot || '—' },
                    { label: 'Стоимость', value: `${selectedPrice.toLocaleString('ru')} ₽` },
                    { label: 'Длительность', value: `${selectedDuration} мин` },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between">
                      <span className={`text-sm ${sub}`}>{item.label}</span>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                animate={calendarAnim ? { scale: [1, 1.1, 0.9, 1.05, 1], y: [0, -10, 5, -5, 0] } : {}}
                transition={{ duration: 0.6 }}
                onClick={handleAddToCalendar}
                className={`w-full py-3 rounded-2xl font-medium mb-3 ${secondaryBtn} flex items-center justify-center gap-2`}
              >
                <Calendar size={18} strokeWidth={1.75} />
                Добавить в календарь
              </motion.button>
              <button
                onClick={() => setPage('catalog')}
                className={`w-full py-3 rounded-2xl text-sm ${sub}`}
              >
                На главную
              </button>
            </motion.div>
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

      {/* Slot confirmation modal */}
      <AnimatePresence>
        {showSlotModal && selectedService && selectedSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setShowSlotModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-6 w-full max-w-sm`}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-5" />
              <h3 className="font-semibold text-lg mb-4">Подтверждение записи</h3>
              <div className="space-y-3 mb-6">
                {[
                  { label: 'Услуга', value: selectedService.name },
                  { label: 'Дата', value: selectedDate },
                  { label: 'Время', value: selectedSlot },
                  { label: 'Стоимость', value: `${selectedPrice.toLocaleString('ru')} ₽` },
                  { label: 'Длительность', value: `${selectedDuration} мин` },
                ].map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className={`text-sm ${sub}`}>{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setShowSlotModal(false); handleConfirmBooking(); }}
                className={`w-full py-3.5 rounded-2xl font-semibold mb-3 text-white`}
                style={{ background: primary }}
              >
                Подтвердить запись
              </button>
              <button onClick={() => setShowSlotModal(false)} className={`w-full py-2 text-sm ${sub}`}>
                Выбрать другой
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

