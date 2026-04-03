import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu, ChevronRight, Clock, Star, ArrowLeft, Check,
  Calendar, Share2, Trash2, Bell, Sun, Moon, X, CalendarDays, LayoutGrid, User
} from 'lucide-react';
import { useApp, Booking, Service } from '../../context/AppContext';
import { formatDate, getScheduleDayIndex, parseFlexibleDate } from '../../utils/date';
import {
  normalizePersonName,
  normalizePlateInput,
  normalizeVehicleInput,
  validatePersonName,
  validatePhoneValue,
  validatePlateValue,
  validateVehicleName,
} from '../../utils/validation';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая заявка',
  confirmed: 'Подтверждена',
  scheduled: 'Запланировано',
  in_progress: 'В работе',
  completed: 'Завершено',
  no_show: 'Не приехал',
  cancelled: 'Отменено',
  admin_review: 'На уточнении у админа',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  confirmed: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  scheduled: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  in_progress: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  completed: 'bg-green-500/15 text-green-600 dark:text-green-400',
  no_show: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  cancelled: 'bg-red-500/15 text-red-600 dark:text-red-400',
  admin_review: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

const UPCOMING_STATUSES = new Set<Booking['status']>(['new', 'confirmed', 'scheduled', 'in_progress']);
const HISTORY_STATUSES = new Set<Booking['status']>(['completed', 'cancelled', 'no_show', 'admin_review']);
const CANCELLABLE_STATUSES = new Set<Booking['status']>(['new', 'confirmed', 'scheduled']);

type Page = 'catalog' | 'detail' | 'slots' | 'confirm' | 'bookings' | 'profile';

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
    getTimeSlotsForDate,
    refreshBootstrap,
    session,
  } = useApp();
  const [page, setPage] = useState<Page>('catalog');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(upcomingDates[0] || '');
  const [activeCategory, setActiveCategory] = useState('Все');
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [calendarAnim, setCalendarAnim] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [profileForm, setProfileForm] = useState(clientProfile);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (!selectedDate && upcomingDates[0]) {
      setSelectedDate(upcomingDates[0]);
    }
  }, [selectedDate, upcomingDates]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate, selectedService?.id]);

  useEffect(() => {
    if (page !== 'slots' || session?.role !== 'client') return;
    void refreshBootstrap().catch(() => undefined);
  }, [page, selectedDate, session?.role]);

  useEffect(() => {
    setProfileForm(clientProfile);
    setProfileErrors({});
    setProfileError('');
  }, [clientProfile]);

  const activeServices = services.filter((service) => service.active);
  const categories = ['Все', ...Array.from(new Set(activeServices.map((service) => service.category)))];
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

  const filteredServices = activeCategory === 'Все'
    ? activeServices
    : activeServices.filter((service) => service.category === activeCategory);
  const defaultBoxName = boxes.find((box) => box.active)?.name || boxes[0]?.name || 'Бокс 1';

  const availableSlots = selectedService
    ? getTimeSlotsForDate(selectedDate, { durationMinutes: selectedService.duration })
    : [];
  const selectedDayDate = parseFlexibleDate(selectedDate);
  const selectedDaySchedule = selectedDayDate
    ? schedule.find((entry) => entry.dayIndex === getScheduleDayIndex(selectedDayDate)) || null
    : null;
  const selectedDayWorkingHours = selectedDaySchedule
    ? selectedDaySchedule.active
      ? `${selectedDaySchedule.open}-${selectedDaySchedule.close}`
      : 'Выходной'
    : 'Не настроено';

  const glass = isDark
    ? 'bg-white/5 backdrop-blur-md border border-white/10'
    : 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm';

  const bg = isDark ? 'bg-[#0B1226]' : 'bg-[#F6F7FA]';
  const text = isDark ? 'text-[#E6EEF8]' : 'text-[#0B1226]';
  const sub = isDark ? 'text-[#9AA6B2]' : 'text-[#6B7280]';
  const primary = isDark ? '#4AA8FF' : '#0A84FF';
  const primaryBtn = isDark ? 'bg-[#4AA8FF] text-white' : 'bg-[#0A84FF] text-white';
  const secondaryBtn = isDark ? 'bg-white/10 text-[#E6EEF8] border border-white/20' : 'bg-white text-[#0B1226] border border-black/10';

  const handleAddToCalendar = () => {
    setCalendarAnim(true);
    setTimeout(() => {
      setCalendarAnim(false);
      setPage('bookings');
    }, 700);
  };

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedSlot || !session) return;
    const booking = await addBooking({
      clientId: session.actorId,
      clientName: clientProfile.name,
      clientPhone: clientProfile.phone,
      service: selectedService.name,
      serviceId: selectedService.id,
      date: selectedDate,
      time: selectedSlot,
      duration: selectedService.duration,
      price: selectedService.price,
      status: 'new',
      workers: [],
      box: defaultBoxName,
      paymentType: 'cash',
      car: clientProfile.car,
      plate: clientProfile.plate,
    });
    setConfirmedBookingId(booking.id);
    setPage('confirm');
  };

  const handleSaveProfile = async () => {
    const nextErrors: Record<string, string> = {};
    const nameError = validatePersonName(profileForm.name);
    const phoneError = validatePhoneValue(profileForm.phone);
    const carError = validateVehicleName(profileForm.car);
    const plateError = validatePlateValue(profileForm.plate);
    if (nameError) nextErrors.name = nameError;
    if (phoneError) nextErrors.phone = phoneError;
    if (carError) nextErrors.car = carError;
    if (plateError) nextErrors.plate = plateError;
    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const normalizedProfile = {
      ...profileForm,
      name: normalizePersonName(profileForm.name),
      phone: profileForm.phone.trim(),
      car: normalizeVehicleInput(profileForm.car),
      plate: normalizePlateInput(profileForm.plate),
    };
    try {
      setProfileError('');
      setProfileForm(normalizedProfile);
      await updateClientProfile(normalizedProfile);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Не удалось сохранить профиль');
    }
  };

  return (
    <div className={`${isDark ? 'dark' : ''} ${bg} ${text} min-h-screen flex flex-col relative`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 ${glass} px-4 py-3 flex items-center justify-between`}>
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
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: primary }}>
            {clientProfile.name ? clientProfile.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <span className="font-semibold text-sm">{clientProfile.name || 'ATMOSFERA'}</span>
            {clientProfile.car && page === 'catalog' && (
              <div className={`text-xs ${sub}`}>{clientProfile.car} · {clientProfile.plate}</div>
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
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          <button onClick={toggleTheme} className={`p-2 rounded-xl ${glass}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className={`fixed bottom-0 left-0 right-0 z-20 ${glass} flex border-t ${isDark ? 'border-white/10' : 'border-black/5'}`}>
        <button
          onClick={() => setPage('catalog')}
          className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all`}
        >
          <LayoutGrid size={20} style={{ color: page === 'catalog' ? primary : undefined }} className={page !== 'catalog' ? sub : ''} />
          <span className="text-xs" style={{ color: page === 'catalog' ? primary : undefined }}>Каталог</span>
        </button>
        <button
          onClick={() => setPage('bookings')}
          className="flex-1 py-3 flex flex-col items-center gap-1 relative"
        >
          <CalendarDays size={20} style={{ color: page === 'bookings' ? primary : undefined }} className={page !== 'bookings' ? sub : ''} />
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
          <User size={20} style={{ color: page === 'profile' ? primary : undefined }} className={page !== 'profile' ? sub : ''} />
          <span className="text-xs" style={{ color: page === 'profile' ? primary : undefined }}>Профиль</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {/* CATALOG PAGE */}
          {page === 'catalog' && (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              {/* Category chips */}
              <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm transition-all ${
                      activeCategory === cat
                        ? `text-white` : `${glass} ${sub}`
                    }`}
                    style={activeCategory === cat ? { background: primary } : {}}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Services grid */}
              <div className="px-4 grid grid-cols-1 gap-3">
                {filteredServices.map((service, i) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`${glass} rounded-2xl p-4`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block`} style={{ background: `${primary}20`, color: primary }}>
                          {service.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{service.price.toLocaleString('ru')} ₽</div>
                        <div className={`text-xs ${sub} flex items-center gap-1 justify-end mt-0.5`}>
                          <Clock size={11} />
                          {service.duration} мин
                        </div>
                      </div>
                    </div>
                    <p className={`text-sm ${sub} mb-3 line-clamp-2`}>{service.desc}</p>
                    <button
                      onClick={() => { setSelectedService(service); setPage('detail'); }}
                      className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all active:scale-98 ${primaryBtn}`}
                    >
                      Записаться
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* DETAIL PAGE */}
          {page === 'detail' && selectedService && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.22 }}
              className="px-4 py-4"
            >
              <div className={`${glass} rounded-2xl p-5 mb-4`}>
                <div className="w-full h-32 rounded-xl mb-4 flex items-center justify-center" style={{ background: `${primary}15` }}>
                  <Star size={40} style={{ color: primary }} />
                </div>
                <h2 className="text-xl font-semibold mb-1">{selectedService.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full inline-block mb-3" style={{ background: `${primary}20`, color: primary }}>
                  {selectedService.category}
                </span>
                <p className={`text-sm ${sub} mb-4`}>{selectedService.desc}</p>
                <div className="flex gap-4">
                  <div className={`flex-1 ${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3 text-center`}>
                    <div className="font-semibold">{selectedService.price.toLocaleString('ru')} ₽</div>
                    <div className={`text-xs ${sub}`}>Стоимость</div>
                  </div>
                  <div className={`flex-1 ${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3 text-center`}>
                    <div className="font-semibold">{selectedService.duration} мин</div>
                    <div className={`text-xs ${sub}`}>Длительность</div>
                  </div>
                </div>
              </div>
              {selectedService.category === 'Аренда бокса' && (
                <p className={`text-xs ${sub} text-center mb-4`}>Минимум 1 час для аренды бокса</p>
              )}
              <button
                onClick={() => setPage('slots')}
                className={`w-full py-3.5 rounded-2xl font-semibold transition-all active:scale-98 ${primaryBtn}`}
              >
                Выбрать время
              </button>
            </motion.div>
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
              <h3 className={`text-sm font-medium ${sub} mb-3`}>Доступное время</h3>
              <div className={`${glass} rounded-2xl p-3 mb-4`}>
                <div className={`text-xs ${sub}`}>Часы работы на {selectedDate || formatDate(new Date())}</div>
                <div className="font-medium mt-1">{selectedDayWorkingHours}</div>
              </div>
              {availableSlots.length === 0 ? (
                <div className={`${glass} rounded-2xl p-4 text-sm ${sub}`}>
                  На выбранную дату свободных слотов пока нет.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {availableSlots.map(slot => {
                    const selected = selectedSlot === slot;
                    return (
                      <motion.button
                        key={slot}
                        onClick={() => { setSelectedSlot(slot); setShowSlotModal(true); }}
                        whileTap={{ scale: 0.96 }}
                        animate={{ scale: selected ? 1.04 : 1 }}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all ${selected ? `text-white` : `${glass}`}`}
                        style={selected ? { background: primary } : {}}
                      >
                        {slot}
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
                <Check size={36} style={{ color: primary }} />
              </motion.div>
              <h2 className="text-xl font-semibold mb-2 text-center">Запись подтверждена!</h2>
              <p className={`text-sm ${sub} mb-6 text-center`}>Напоминание придёт за 60 минут</p>
              <div className={`${glass} rounded-2xl p-4 w-full mb-6`}>
                <div className="space-y-3">
                  {[
                    { label: 'Услуга', value: selectedService.name },
                    { label: 'Дата', value: selectedDate },
                    { label: 'Время', value: selectedSlot || '—' },
                    { label: 'Стоимость', value: `${selectedService.price.toLocaleString('ru')} ₽` },
                    { label: 'Длительность', value: `${selectedService.duration} мин` },
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
                <Calendar size={18} />
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
              {clientBookings.length === 0 ? (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <CalendarDays size={40} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>У вас пока нет записей</p>
                  <button
                    onClick={() => setPage('catalog')}
                    className={`mt-4 px-6 py-2 rounded-xl text-sm text-white`}
                    style={{ background: primary }}
                  >
                    Записаться
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { label: 'Визитов', value: completedBookings.length },
                      { label: 'Потрачено', value: `${Math.round(totalSpent / 1000)}к ₽` },
                      { label: 'Любимая', value: favoriteService.split(' ')[0] || 'Нет' },
                    ].map((item) => (
                      <div key={item.label} className={`${glass} rounded-2xl px-3 py-3`}>
                        <div className={`text-[11px] ${sub}`}>{item.label}</div>
                        <div className="font-semibold text-sm mt-1">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Upcoming */}
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>Предстоящие</div>
                  {upcomingBookings.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      glass={glass}
                      sub={sub}
                      primary={primary}
                      isDark={isDark}
                      onCancel={() => setShowCancelConfirm(booking.id)}
                    />
                  ))}
                  {upcomingBookings.length === 0 && (
                    <p className={`text-sm ${sub} text-center py-2`}>Нет предстоящих записей</p>
                  )}

                  {/* Past */}
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mt-4 mb-2`}>Прошедшие</div>
                  {pastBookings.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      glass={glass}
                      sub={sub}
                      primary={primary}
                      isDark={isDark}
                      onCancel={() => setShowCancelConfirm(booking.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {page === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="px-4 py-4"
            >
              <h2 className="text-lg font-semibold mb-4">Профиль</h2>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Активные', value: upcomingBookings.length },
                  { label: 'Завершено', value: completedBookings.length },
                  { label: 'Средний чек', value: completedBookings.length ? `${Math.round(totalSpent / completedBookings.length).toLocaleString('ru')} ₽` : '0 ₽' },
                ].map((item) => (
                  <div key={item.label} className={`${glass} rounded-2xl px-3 py-3`}>
                    <div className={`text-[11px] ${sub}`}>{item.label}</div>
                    <div className="font-semibold text-sm mt-1">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ background: primary }}>
                    {(profileForm.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{profileForm.name || 'Клиент'}</div>
                    <div className={`text-xs ${sub}`}>{profileForm.phone || 'Укажите телефон'}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Имя</label>
                    <input className={`${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-white border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none ${profileErrors.name ? 'border-red-400' : ''}`} value={profileForm.name} onChange={(e) => {
                      setProfileForm((current) => ({ ...current, name: e.target.value }));
                      setProfileErrors((current) => ({ ...current, name: '' }));
                      setProfileError('');
                    }} />
                    {profileErrors.name && <div className="mt-1 text-xs text-red-500">{profileErrors.name}</div>}
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Телефон</label>
                    <input className={`${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-white border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none ${profileErrors.phone ? 'border-red-400' : ''}`} value={profileForm.phone} onChange={(e) => {
                      setProfileForm((current) => ({ ...current, phone: e.target.value }));
                      setProfileErrors((current) => ({ ...current, phone: '' }));
                      setProfileError('');
                    }} />
                    {profileErrors.phone && <div className="mt-1 text-xs text-red-500">{profileErrors.phone}</div>}
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Автомобиль</label>
                    <input className={`${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-white border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none ${profileErrors.car ? 'border-red-400' : ''}`} placeholder="Lada Vesta" value={profileForm.car} onChange={(e) => {
                      setProfileForm((current) => ({ ...current, car: e.target.value }));
                      setProfileErrors((current) => ({ ...current, car: '' }));
                      setProfileError('');
                    }} />
                    {profileErrors.car && <div className="mt-1 text-xs text-red-500">{profileErrors.car}</div>}
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Госномер</label>
                    <input className={`${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-white border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none ${profileErrors.plate ? 'border-red-400' : ''}`} placeholder="У999УУ" maxLength={6} value={profileForm.plate} onChange={(e) => {
                      setProfileForm((current) => ({ ...current, plate: normalizePlateInput(e.target.value) }));
                      setProfileErrors((current) => ({ ...current, plate: '' }));
                      setProfileError('');
                    }} />
                    {profileErrors.plate && <div className="mt-1 text-xs text-red-500">{profileErrors.plate}</div>}
                  </div>
                </div>
              </div>
              {profileError && <div className="mb-3 text-sm text-red-500">{profileError}</div>}
              <button
                onClick={handleSaveProfile}
                className={`w-full py-3.5 rounded-2xl font-semibold mb-3 ${primaryBtn}`}
              >
                {profileSaved ? 'Сохранено' : 'Сохранить изменения'}
              </button>
              <button
                onClick={logout}
                className={`w-full py-3 rounded-2xl text-sm ${secondaryBtn}`}
              >
                Выйти
              </button>
            </motion.div>
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
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-6 w-full max-w-sm`}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-5" />
              <h3 className="font-semibold text-lg mb-4">Подтверждение записи</h3>
              <div className="space-y-3 mb-6">
                {[
                  { label: 'Услуга', value: selectedService.name },
                  { label: 'Дата', value: selectedDate },
                  { label: 'Время', value: selectedSlot },
                  { label: 'Стоимость', value: `${selectedService.price.toLocaleString('ru')} ₽` },
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

      {/* Cancel confirm modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setShowCancelConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-2xl p-5 w-full max-w-xs`}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-semibold mb-2">Отменить запись?</h3>
              <p className={`text-sm ${sub} mb-5`}>Это действие нельзя отменить.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(null)}
                  className={`flex-1 py-2.5 rounded-xl text-sm ${secondaryBtn}`}
                >
                  Назад
                </button>
                <button
                  onClick={() => { deleteBooking(showCancelConfirm!); setShowCancelConfirm(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm bg-red-500 text-white"
                >
                  Отменить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileSaved && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-16 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: isDark ? '#0E1624' : '#ffffff', border: `1px solid ${primary}40` }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${primary}20` }}>
              <Check size={14} style={{ color: primary }} />
            </div>
            <span className="text-sm font-medium">Профиль обновлен</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BookingCard({
  booking, glass, sub, primary, isDark, onCancel
}: {
  booking: Booking;
  glass: string;
  sub: string;
  primary: string;
  isDark: boolean;
  onCancel: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className={`${glass} rounded-2xl p-4`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-semibold">{booking.service}</div>
          <div className={`text-sm ${sub}`}>{booking.date} в {booking.time}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{booking.price.toLocaleString('ru')} ₽</div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[booking.status]}`}>
            {STATUS_LABELS[booking.status]}
          </span>
        </div>
      </div>
      <div className={`text-xs ${sub} mb-3`}>{booking.box} · {booking.duration} мин</div>
      {CANCELLABLE_STATUSES.has(booking.status) && (
        <button
          onClick={onCancel}
          className={`w-full py-2 rounded-xl text-sm border flex items-center justify-center gap-2 ${isDark ? 'border-red-400/30 text-red-400' : 'border-red-500/30 text-red-500'}`}
        >
          <Trash2 size={14} />
          Отменить запись
        </button>
      )}
    </motion.div>
  );
}
