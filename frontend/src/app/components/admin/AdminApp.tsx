import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu, Bell, Plus, X, Phone, Edit3, Play, CheckCircle, XCircle,
  Users, Sun, Moon, Calendar, Settings, BarChart3, Check, AlertCircle,
  User, ChevronRight, ArrowLeft, TrendingUp, Clock, Box, CreditCard,
  Shield, Sliders, BellOff, Save, Toggle, Trash2, Eye, EyeOff, DollarSign
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import { useApp, Booking, BookingStatus, type EmployeeSetting, type PayrollEntryKind } from '../../context/AppContext';
import { formatDate, getLastNDates, getScheduleDayIndex, isPastTimeSlot, parseFlexibleDate } from '../../utils/date';
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
  admin_review: 'На уточнении',
};
const STATUS_COLORS: Record<BookingStatus, string> = {
  new: 'bg-indigo-500',
  confirmed: 'bg-cyan-500',
  scheduled: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  completed: 'bg-green-500',
  no_show: 'bg-orange-500',
  cancelled: 'bg-red-500',
  admin_review: 'bg-amber-500',
};
const STATUS_BADGE: Record<BookingStatus, string> = {
  new: 'bg-indigo-500/15 text-indigo-600',
  confirmed: 'bg-cyan-500/15 text-cyan-600',
  scheduled: 'bg-blue-500/15 text-blue-600',
  in_progress: 'bg-yellow-500/15 text-yellow-600',
  completed: 'bg-green-500/15 text-green-600',
  no_show: 'bg-orange-500/15 text-orange-600',
  cancelled: 'bg-red-500/15 text-red-500',
  admin_review: 'bg-amber-500/15 text-amber-600',
};

const READY_TO_START_STATUSES: BookingStatus[] = ['new', 'confirmed', 'scheduled'];

type AdminPage = 'calendar' | 'stats' | 'clients' | 'settings';
type SettingsSection = null | 'boxes' | 'schedule' | 'notifications' | 'profile' | 'security' | 'pricing' | 'payroll';
type EditModalMode = 'edit' | 'reschedule';

function isDetailingService(serviceId: string, services: Array<{ id: string; category: string }>) {
  return services.some((service) => service.id === serviceId && service.category === 'Детейлинг');
}

function hasManualScheduling(booking: Booking, services: Array<{ id: string; category: string }>) {
  return isDetailingService(booking.serviceId, services) && (!booking.time || booking.time === '00:00');
}

export function AdminApp() {
  const {
    isDark,
    toggleTheme,
    bookings,
    clients: registeredClients,
    updateClientCard,
    updateBooking,
    addBooking,
    addNotification,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    activeSessions,
    workers,
    services: liveServices,
    boxes: liveBoxes,
    schedule: liveSchedule,
    settings,
    saveServices,
    saveBoxes,
    saveSchedule,
    saveAdminProfile,
    saveAdminNotificationSettings,
    saveAdminWorkerPayroll,
    createPayrollEntry,
    createTelegramLinkCode,
    deleteClient,
    changePassword,
    refreshActiveSessions,
    revokeSession,
    todayLabel,
    tomorrowLabel,
  } = useApp();
  const [page, setPage] = useState<AdminPage>('calendar');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [editModalMode, setEditModalMode] = useState<EditModalMode>('edit');
  const [saveSuccess, setSaveSuccess] = useState<'notify' | 'silent' | null>(null);
  const [assignedWorkers, setAssignedWorkers] = useState<{ id: string; percent: number }[]>([]);
  const [newBookingWorkers, setNewBookingWorkers] = useState<{ id: string; percent: number }[]>([]);
  const [newBookingForm, setNewBookingForm] = useState({
    clientName: '', clientPhone: '', service: '', serviceId: '', date: tomorrowLabel,
    time: '10:00', box: liveBoxes[0]?.name || 'Бокс 1', price: 0, duration: 30, car: '', plate: '', notes: '',
  });

  // Settings state
  const [boxes, setBoxes] = useState(liveBoxes);
  const [schedule, setScheduleState] = useState(liveSchedule);
  const [services, setServicesState] = useState(liveServices);
  const [notifSettings, setNotifSettings] = useState(settings.adminNotificationSettings);
  const [profile, setProfile] = useState(settings.adminProfile);
  const [showPass, setShowPass] = useState(false);
  const [password, setPassword] = useState({ current: '', new_: '', confirm: '' });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [payrollDrafts, setPayrollDrafts] = useState<Record<string, { kind: PayrollEntryKind; amount: string; note: string }>>({});
  const [payrollEntryLoading, setPayrollEntryLoading] = useState<string | null>(null);
  const [securitySaved, setSecuritySaved] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [telegramLinkCode, setTelegramLinkCode] = useState<{ code: string; expiresAt: Date; linked: boolean } | null>(null);
  const [completeAmount, setCompleteAmount] = useState('');
  const [completeNote, setCompleteNote] = useState('');
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [newBookingSaving, setNewBookingSaving] = useState(false);
  const [newBookingErrors, setNewBookingErrors] = useState<{ clientName?: string; clientPhone?: string; car?: string; plate?: string; date?: string; time?: string; general?: string }>({});
  const [editBookingDraft, setEditBookingDraft] = useState({ status: 'scheduled' as BookingStatus, date: tomorrowLabel, time: '10:00', box: liveBoxes[0]?.name || 'Бокс 1', notes: '' });
  const [editBookingSaving, setEditBookingSaving] = useState(false);
  const [editBookingError, setEditBookingError] = useState<string | null>(null);
  const [clientCardDrafts, setClientCardDrafts] = useState<Record<string, { adminRating: number; adminNote: string }>>({});
  const [savingClientId, setSavingClientId] = useState<string | null>(null);
  const [payrollSettings, setPayrollSettings] = useState<EmployeeSetting[]>([]);

  useEffect(() => setBoxes(liveBoxes), [liveBoxes]);
  useEffect(() => setScheduleState(liveSchedule), [liveSchedule]);
  useEffect(() => setServicesState(liveServices), [liveServices]);
  useEffect(() => {
    if (!newBookingForm.serviceId) return;
    const selectedService = liveServices.find((service) => service.id === newBookingForm.serviceId);
    if (!selectedService) return;
    setNewBookingForm((current) => {
      if (
        current.service === selectedService.name
        && current.price === selectedService.price
        && current.duration === selectedService.duration
      ) {
        return current;
      }
      return {
        ...current,
        service: selectedService.name,
        price: selectedService.price,
        duration: selectedService.duration,
      };
    });
  }, [liveServices, newBookingForm.serviceId]);
  useEffect(() => setNotifSettings(settings.adminNotificationSettings), [settings.adminNotificationSettings]);
  useEffect(() => setProfile(settings.adminProfile), [settings.adminProfile]);
  useEffect(() => {
    setClientCardDrafts(
      Object.fromEntries(registeredClients.map((client) => [
        client.id,
        { adminRating: client.adminRating || 0, adminNote: client.adminNote || '' },
      ])),
    );
  }, [registeredClients]);
  useEffect(() => {
    setPayrollSettings(
      workers
        .filter((worker) => worker.role === 'worker')
        .map((worker) => ({
          id: worker.id,
          role: 'worker',
          name: worker.name,
          percent: worker.defaultPercent,
          salaryBase: worker.salaryBase,
          active: worker.active,
          telegramChatId: worker.telegramChatId,
        })),
    );
    setPayrollDrafts((current) =>
      Object.fromEntries(
        workers
          .filter((worker) => worker.role === 'worker')
          .map((worker) => [worker.id, current[worker.id] || { kind: 'advance', amount: '', note: '' }]),
      ),
    );
  }, [workers]);
  useEffect(() => {
    if (page === 'settings' && settingsSection === 'security') {
      void refreshActiveSessions();
    }
  }, [page, settingsSection]);

  const adminNotifications = notifications.filter(n => n.recipientRole === 'admin');
  const unreadCount = adminNotifications.filter(n => !n.read).length;
  const masterWorkers = workers.filter((worker) => worker.role === 'worker');
  const todayBookings = bookings.filter(b => b.date === todayLabel);
  const completedAll = bookings.filter(b => b.status === 'completed');
  const totalRevenue = completedAll.reduce((s, b) => s + b.price, 0);

  const glass = isDark ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm';
  const bg = isDark ? 'bg-[#0B1226]' : 'bg-[#F6F7FA]';
  const text = isDark ? 'text-[#E6EEF8]' : 'text-[#0B1226]';
  const sub = isDark ? 'text-[#9AA6B2]' : 'text-[#6B7280]';
  const primary = isDark ? '#4AA8FF' : '#0A84FF';
  const accent = '#34C759';
  const surface = isDark ? '#0E1624' : '#ffffff';
  const inputCls = `${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-white border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const selectCls = `${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8]' : 'bg-white border-black/10 text-[#0B1226]'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const timeToMinutes = (value: string): number | null => {
    const match = value.trim().match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  // Stats calculations
  const byService = services.map(s => ({
    name: s.name.split(' ')[0],
    count: bookings.filter(b => b.serviceId === s.id).length,
    revenue: bookings.filter(b => b.serviceId === s.id && b.status === 'completed').reduce((acc, b) => acc + b.price, 0),
  })).filter(s => s.count > 0);

  const byStatus = [
    { name: 'Новые', value: bookings.filter(b => b.status === 'new').length, color: '#6366F1' },
    { name: 'Подтверждены', value: bookings.filter(b => b.status === 'confirmed').length, color: '#06B6D4' },
    { name: 'Запланировано', value: bookings.filter(b => b.status === 'scheduled').length, color: '#3B82F6' },
    { name: 'В работе', value: bookings.filter(b => b.status === 'in_progress').length, color: '#EAB308' },
    { name: 'Завершено', value: bookings.filter(b => b.status === 'completed').length, color: '#22C55E' },
    { name: 'На уточнении', value: bookings.filter(b => b.status === 'admin_review').length, color: '#F59E0B' },
    { name: 'Не приехал', value: bookings.filter(b => b.status === 'no_show').length, color: '#F97316' },
    { name: 'Отменено', value: bookings.filter(b => b.status === 'cancelled').length, color: '#EF4444' },
  ].filter(s => s.value > 0);

  const byPayment = [
    { name: 'Наличные', value: bookings.filter(b => b.paymentType === 'cash').length, color: accent },
    { name: 'Карта', value: bookings.filter(b => b.paymentType === 'card').length, color: primary },
    { name: 'Онлайн', value: bookings.filter(b => b.paymentType === 'online').length, color: '#A855F7' },
  ].filter(p => p.value > 0);

  const workerStats = masterWorkers.map(w => ({
    ...w,
    tasks: completedAll.filter(b => b.workers.some(bw => bw.workerId === w.id)).length,
    earned: completedAll.filter(b => b.workers.some(bw => bw.workerId === w.id)).reduce((s, b) => {
      const bw = b.workers.find(bwk => bwk.workerId === w.id);
      return s + Math.round(b.price * (bw?.percent || 0) / 100);
    }, 0),
  }));

  const avgCheck = completedAll.length > 0 ? Math.round(totalRevenue / completedAll.length) : 0;
  const conversionRate = bookings.length > 0 ? Math.round((completedAll.length / bookings.length) * 100) : 0;
  const scheduleSummary = schedule.filter((day) => day.active).map((day) => `${day.day} ${day.open}-${day.close}`).join(' · ') || 'График не задан';
  const revenueData = getLastNDates(7).map((date) => {
    const formatted = formatDate(date);
    return {
      day: date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', ''),
      revenue: bookings.filter((booking) => booking.date === formatted && booking.status === 'completed').reduce((sum, booking) => sum + booking.price, 0),
    };
  });
  const hourData = Array.from(new Set(todayBookings.map((booking) => booking.time.slice(0, 2)))).sort().map((hour) => ({
    hour: `${hour}:00`,
    count: todayBookings.filter((booking) => booking.time.startsWith(hour)).length,
  }));
  const handleStatusChange = async (id: string, status: BookingStatus) => {
    await updateBooking(id, { status });
    if (selectedBooking?.id === id) setSelectedBooking(prev => prev ? { ...prev, status } : null);
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    const confirmed = window.confirm(`Удалить клиента "${clientName}"? Профиль и доступ в Mini App будут удалены, история записей останется.`);
    if (!confirmed) return;
    await deleteClient(clientId);
  };

  const handleSaveClientCard = async (clientId: string) => {
    const draft = clientCardDrafts[clientId];
    if (!draft) return;
    try {
      setSavingClientId(clientId);
      await updateClientCard(clientId, {
        adminRating: draft.adminRating,
        adminNote: draft.adminNote,
      });
    } finally {
      setSavingClientId(null);
    }
  };

  const validateClientName = (value: string): string | null => {
    return validatePersonName(value);
  };

  const validateClientPhone = (value: string): string | null => {
    return validatePhoneValue(value);
  };

  const validateBookingDate = (dateValue: string, timeValue: string, durationMinutes: number): { date?: string; time?: string } => {
    const nextErrors: { date?: string; time?: string } = {};
    const parsedDate = parseFlexibleDate(dateValue.trim());
    if (!parsedDate) {
      nextErrors.date = 'Укажите дату в формате ДД.ММ.ГГГГ';
      return nextErrors;
    }
    const scheduleDay = schedule.find((entry) => entry.dayIndex === getScheduleDayIndex(parsedDate));
    if (!scheduleDay || !scheduleDay.active) {
      nextErrors.date = 'На выбранную дату запись недоступна';
    }

    const normalizedTime = timeValue.trim();
    const slotStart = timeToMinutes(normalizedTime);
    if (slotStart === null) {
      nextErrors.time = 'Укажите время в формате ЧЧ:ММ';
      return nextErrors;
    }
    if (!nextErrors.date && isPastTimeSlot(formatDate(parsedDate), normalizedTime)) {
      nextErrors.time = 'Нельзя создать запись на прошедшее время';
    }
    if (!nextErrors.date && scheduleDay) {
      const openMinutes = timeToMinutes(scheduleDay.open);
      const closeMinutes = timeToMinutes(scheduleDay.close);
      const slotEnd = slotStart + Math.max(1, durationMinutes);
      if (openMinutes === null || closeMinutes === null) {
        nextErrors.time = 'Для этого дня не настроены часы работы';
      } else if (slotStart < openMinutes || slotEnd > closeMinutes) {
        nextErrors.time = `Рабочее время: ${scheduleDay.open}-${scheduleDay.close}`;
      }
    }
    return nextErrors;
  };

  const validateNewBookingForm = () => {
    const nextErrors: { clientName?: string; clientPhone?: string; car?: string; plate?: string; date?: string; time?: string; general?: string } = {};
    const selectedService = services.find((service) => service.id === newBookingForm.serviceId);
    const nameError = validateClientName(newBookingForm.clientName);
    if (nameError) nextErrors.clientName = nameError;
    const phoneError = validateClientPhone(newBookingForm.clientPhone);
    if (phoneError) nextErrors.clientPhone = phoneError;
    const carError = validateVehicleName(newBookingForm.car);
    if (carError) nextErrors.car = carError;
    const plateError = validatePlateValue(newBookingForm.plate);
    if (plateError) nextErrors.plate = plateError;
    Object.assign(nextErrors, validateBookingDate(newBookingForm.date, newBookingForm.time, selectedService?.duration || newBookingForm.duration || 30));
    if (!newBookingForm.serviceId) nextErrors.general = 'Выберите услугу';
    if (totalNewBookingPercent > 100) nextErrors.general = 'Сумма процентов мастеров не должна превышать 100%';
    setNewBookingErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetNewBookingDraft = () => {
    setSaveSuccess(null);
    setNewBookingSaving(false);
    setNewBookingErrors({});
    setNewBookingWorkers([]);
    setNewBookingForm({
      clientName: '',
      clientPhone: '',
      service: '',
      serviceId: '',
      date: tomorrowLabel,
      time: '10:00',
      box: boxes[0]?.name || 'Бокс 1',
      price: 0,
      duration: 30,
      car: '',
      plate: '',
      notes: '',
    });
  };

  const openNewBookingModal = () => {
    resetNewBookingDraft();
    setShowNewBooking(true);
  };

  const closeNewBookingModal = () => {
    setShowNewBooking(false);
    resetNewBookingDraft();
  };

  const openEditModal = (booking: Booking, mode: EditModalMode = 'edit') => {
    setEditBookingDraft({
      status: booking.status,
      date: booking.date || todayLabel,
      time: booking.time || '10:00',
      box: booking.box && booking.box !== 'По согласованию' ? booking.box : boxes[0]?.name || 'Бокс 1',
      notes: booking.notes || '',
    });
    setEditBookingError(null);
    setEditBookingSaving(false);
    setEditModalMode(mode);
    setShowEditModal(true);
  };

  const handleSaveEditedBooking = async () => {
    if (!selectedBooking) return;
    const detailingBooking = isDetailingService(selectedBooking.serviceId, services);
    const requiresScheduledSlot = !detailingBooking || editBookingDraft.status !== 'admin_review';
    if (requiresScheduledSlot) {
      const validationErrors = validateBookingDate(editBookingDraft.date, editBookingDraft.time, selectedBooking.duration);
      if (validationErrors.date || validationErrors.time) {
        setEditBookingError(validationErrors.date || validationErrors.time || 'Проверьте дату и время');
        return;
      }
      if (!editBookingDraft.box.trim()) {
        setEditBookingError('Укажите бокс для записи');
        return;
      }
    }

    try {
      setEditBookingSaving(true);
      setEditBookingError(null);
      await updateBooking(selectedBooking.id, {
        status: editBookingDraft.status,
        date: requiresScheduledSlot ? editBookingDraft.date.trim() : '',
        time: requiresScheduledSlot ? editBookingDraft.time.trim() : '',
        box: requiresScheduledSlot ? editBookingDraft.box.trim() : 'По согласованию',
        notes: editBookingDraft.notes.trim() || undefined,
      });
      setSelectedBooking((current) => (current ? {
        ...current,
        status: editBookingDraft.status,
        date: requiresScheduledSlot ? editBookingDraft.date.trim() : '',
        time: requiresScheduledSlot ? editBookingDraft.time.trim() : '',
        box: requiresScheduledSlot ? editBookingDraft.box.trim() : 'По согласованию',
        notes: editBookingDraft.notes.trim(),
      } : null));
      setShowEditModal(false);
    } catch (error) {
      setEditBookingError(error instanceof Error ? error.message : 'Не удалось сохранить изменения');
    } finally {
      setEditBookingSaving(false);
    }
  };

  const handleAssignWorkers = async (notify: boolean) => {
    if (!selectedBooking) return;
    const updatedWorkers = assignedWorkers.map(aw => {
      const w = masterWorkers.find(wk => wk.id === aw.id);
      return { workerId: aw.id, workerName: w?.name || '', percent: aw.percent };
    });
    await updateBooking(selectedBooking.id, { workers: updatedWorkers, notifyWorkers: notify });
    setSelectedBooking(prev => prev ? { ...prev, workers: updatedWorkers } : null);
    setShowAssignModal(false);
  };

  const handleSaveNewBooking = async (notify: boolean) => {
    setNewBookingErrors({});
    if (!validateNewBookingForm()) return;
    const svc = services.find(s => s.id === newBookingForm.serviceId);
    const parsedDate = parseFlexibleDate(newBookingForm.date.trim());
    if (!parsedDate) {
      setNewBookingErrors({ date: 'Укажите дату в формате ДД.ММ.ГГГГ' });
      return;
    }
    const normalizedClientName = normalizePersonName(newBookingForm.clientName);
    const normalizedCar = normalizeVehicleInput(newBookingForm.car);
    const normalizedPlate = normalizePlateInput(newBookingForm.plate);
    const carLabel = [normalizedCar, normalizedPlate].filter(Boolean).join(', ') || 'Авто не указано';
    const createdWorkers = newBookingWorkers.map((item) => {
      const worker = masterWorkers.find((candidate) => candidate.id === item.id);
      return {
        workerId: item.id,
        workerName: worker?.name || '',
        percent: item.percent,
      };
    });
    const normalizedDate = formatDate(parsedDate);
    try {
      setNewBookingSaving(true);
      await addBooking({
        clientId: '',
        clientName: normalizedClientName,
        clientPhone: newBookingForm.clientPhone.trim(),
        service: svc?.name || newBookingForm.service,
        serviceId: newBookingForm.serviceId || 's1',
        date: normalizedDate,
        time: newBookingForm.time.trim(),
        duration: svc?.duration || newBookingForm.duration,
        price: svc?.price || newBookingForm.price,
        status: 'confirmed',
        workers: createdWorkers,
        box: newBookingForm.box,
        paymentType: 'cash',
        car: normalizedCar,
        plate: normalizedPlate,
        notes: newBookingForm.notes,
        notifyWorkers: notify,
      });
      await addNotification({ recipientRole: 'admin', message: `${normalizedClientName} • ${carLabel} • ${normalizedDate} ${newBookingForm.time.trim()}`, read: false });
      setSaveSuccess(notify ? 'notify' : 'silent');
      setTimeout(() => {
        closeNewBookingModal();
      }, 1800);
    } catch (error) {
      setNewBookingErrors({
        general: error instanceof Error ? error.message : 'Не удалось сохранить запись',
      });
    } finally {
      setNewBookingSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (settingsSection === 'security') {
      setSecurityError(null);
      setSecuritySaved(false);
      if (!password.current || !password.new_ || !password.confirm) {
        setSecurityError('Заполните все поля для смены пароля');
        return;
      }
      if (password.new_.length < 8) {
        setSecurityError('Новый пароль должен содержать минимум 8 символов');
        return;
      }
      if (password.new_ !== password.confirm) {
        setSecurityError('Подтверждение пароля не совпадает');
        return;
      }
      try {
        await changePassword(password.current, password.new_);
        setPassword({ current: '', new_: '', confirm: '' });
        setSecuritySaved(true);
        setTimeout(() => setSecuritySaved(false), 2000);
      } catch (error) {
        setSecurityError(error instanceof Error ? error.message : 'Не удалось изменить пароль');
      }
      return;
    }

    if (settingsSection === 'boxes') await saveBoxes(boxes);
    if (settingsSection === 'schedule') await saveSchedule(schedule);
    if (settingsSection === 'pricing') await saveServices(services);
    if (settingsSection === 'notifications') await saveAdminNotificationSettings(notifSettings);
    if (settingsSection === 'profile') await saveAdminProfile(profile);
    if (settingsSection === 'payroll') await saveAdminWorkerPayroll(payrollSettings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleGenerateTelegramCode = async () => {
    setTelegramLinkCode(await createTelegramLinkCode());
  };

  const handleCreatePayrollEntry = async (workerId: string, workerName: string) => {
    const draft = payrollDrafts[workerId];
    const amount = Number(draft?.amount || 0);
    if (!draft) return;
    if (!Number.isFinite(amount) || amount === 0) {
      return;
    }

    try {
      setPayrollEntryLoading(workerId);
      await createPayrollEntry({
        workerId,
        kind: draft.kind,
        amount: Math.round(amount),
        note: draft.note.trim(),
      });
      setPayrollDrafts((current) => ({
        ...current,
        [workerId]: { kind: draft.kind, amount: '', note: '' },
      }));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } finally {
      setPayrollEntryLoading(null);
    }
  };

  const openCompleteModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setCompleteAmount(String(booking.price));
    setCompleteNote(booking.notes || '');
    setCompleteError(null);
    setShowCompleteModal(true);
  };

  const handleCompleteBooking = async () => {
    if (!selectedBooking) return;
    const normalizedAmount = Number(completeAmount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
      setCompleteError('Укажите корректную итоговую сумму');
      return;
    }
    const nextNote = completeNote.trim();
    const nextPrice = Math.round(normalizedAmount);
    try {
      await updateBooking(selectedBooking.id, {
        status: 'completed',
        price: nextPrice,
        notes: nextNote || selectedBooking.notes || '',
      });
      setSelectedBooking(prev => prev ? {
        ...prev,
        status: 'completed',
        price: nextPrice,
        notes: nextNote || prev.notes,
      } : null);
      setShowCompleteModal(false);
    } catch (error) {
      setCompleteError(error instanceof Error ? error.message : 'Не удалось завершить запись');
    }
  };

  const totalPercent = assignedWorkers.reduce((s, w) => s + w.percent, 0);
  const totalNewBookingPercent = newBookingWorkers.reduce((sum, worker) => sum + worker.percent, 0);

  const tooltipStyle = { background: surface, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, color: text };

  return (
    <div className={`${isDark ? 'dark' : ''} ${bg} ${text} min-h-screen flex flex-col`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 ${glass} px-4 py-3 flex items-center justify-between`}>
        <button onClick={() => setShowMenu(true)} className={`p-2 rounded-xl ${glass}`}><Menu size={20} /></button>
        <div className="text-center">
          <div className="font-semibold text-sm">Администратор</div>
          <div className={`text-xs ${sub}`}>{todayLabel}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setShowNotifPanel(true); markAllNotificationsRead('admin'); }} className={`p-2 rounded-xl ${glass} relative`}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>}
          </button>
          <button onClick={toggleTheme} className={`p-2 rounded-xl ${glass}`}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button onClick={openNewBookingModal} className="p-2 rounded-xl text-white" style={{ background: primary }}><Plus size={18} /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">

          {/* CALENDAR */}
          {page === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Сегодня — {todayLabel}</h2>
                <span className={`text-sm ${sub}`}>{todayBookings.length} записей</span>
              </div>
              <div className="space-y-3">
                {todayBookings.length === 0 ? (
                  <div className={`${glass} rounded-2xl p-8 text-center`}>
                    <Calendar size={36} className={`mx-auto mb-3 ${sub}`} />
                    <p className={sub}>Записей на сегодня нет</p>
                  </div>
                ) : todayBookings.map(booking => (
                  <motion.button key={booking.id} whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedBooking(booking); setShowSlideOver(true); }}
                    className={`${glass} rounded-2xl p-4 w-full text-left`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-1 self-stretch rounded-full ${STATUS_COLORS[booking.status]}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-semibold text-sm">{booking.time} · {booking.clientName}</div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[booking.status]}`}>{STATUS_LABELS[booking.status]}</span>
                        </div>
                        <div className={`text-sm ${sub}`}>{booking.service}</div>
                        <div className="flex justify-between mt-2">
                          <span className={`text-xs ${sub}`}>{booking.box} · {booking.duration} мин</span>
                          <span className="text-sm font-semibold">{booking.price.toLocaleString('ru')} ₽</span>
                        </div>
                        {booking.workers.length > 0 && (
                          <div className={`text-xs ${sub} mt-1`}>Мастера: {booking.workers.map(w => `${w.workerName} ${w.percent}%`).join(', ')}</div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
              {bookings.filter(b => b.date !== todayLabel).length > 0 && (
                <div className="mt-6">
                  <h3 className={`text-sm font-medium ${sub} mb-3`}>Другие записи</h3>
                  {bookings.filter(b => b.date !== todayLabel).map(booking => (
                    <motion.button key={booking.id} whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedBooking(booking); setShowSlideOver(true); }}
                      className={`${glass} rounded-2xl p-4 w-full text-left mb-3`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">{booking.clientName}</div>
                          <div className={`text-xs ${sub}`}>{booking.service} · {booking.date}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[booking.status]}`}>{STATUS_LABELS[booking.status]}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* STATS */}
          {page === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4 space-y-4">
              <h2 className="font-semibold">Статистика</h2>

              {/* KPI row */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Всего записей', value: bookings.length, icon: Calendar, color: primary },
                  { label: 'Выручка', value: `${totalRevenue.toLocaleString('ru')} ₽`, icon: TrendingUp, color: accent },
                  { label: 'Средний чек', value: `${avgCheck.toLocaleString('ru')} ₽`, icon: CreditCard, color: '#A855F7' },
                  { label: 'Конверсия', value: `${conversionRate}%`, icon: BarChart3, color: '#FF9500' },
                  { label: 'Завершено', value: completedAll.length, icon: CheckCircle, color: '#22C55E' },
                  { label: 'Отменено', value: bookings.filter(b => b.status === 'cancelled').length, icon: XCircle, color: '#EF4444' },
                  { label: 'На сегодня', value: todayBookings.length, icon: Clock, color: '#F59E0B' },
                  { label: 'В работе', value: bookings.filter(b => b.status === 'in_progress').length, icon: Play, color: '#EC4899' },
                ].map(item => (
                  <div key={item.label} className={`${glass} rounded-2xl p-3`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <item.icon size={13} style={{ color: item.color }} />
                      <span className={`text-xs ${sub}`}>{item.label}</span>
                    </div>
                    <div className="font-bold" style={{ color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CLIENTS */}
          {page === 'clients' && (
            <motion.div key="clients" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <h2 className="font-semibold mb-4">Клиенты</h2>
              {registeredClients.length === 0 && (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <Users size={36} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>Пока нет зарегистрированных клиентов</p>
                </div>
              )}
              {registeredClients.map(client => {
                const clientBookings = bookings.filter(b => b.clientId === client.id);
                const spent = clientBookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.price, 0);
                return (
                  <div key={client.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: primary }}>{client.name.charAt(0)}</div>
                      <div className="flex-1">
                        <div className="font-semibold">{client.name}</div>
                        <div className={`text-xs ${sub}`}>{client.car || 'Автомобиль не указан'}</div>
                        <a href={`tel:${client.phone}`} className="text-xs flex items-center gap-1 mt-0.5" style={{ color: primary }}>
                          <Phone size={10} />{client.phone}
                        </a>
                      </div>
                      <button
                        onClick={() => void handleDeleteClient(client.id, client.name)}
                        className={`p-2 rounded-xl ${isDark ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-500'}`}
                        aria-label={`Удалить клиента ${client.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Записей', value: clientBookings.length },
                        { label: 'Завершено', value: clientBookings.filter(b => b.status === 'completed').length },
                        { label: 'Потрачено', value: `${spent.toLocaleString('ru')} ₽` },
                      ].map(s => (

                        <div key={s.label} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-2 text-center`}>
                          <div className="font-semibold text-sm">{s.value}</div>
                          <div className={`text-xs ${sub}`}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Рейтинг клиента для админа</label>
                        <select
                          className={selectCls}
                          value={clientCardDrafts[client.id]?.adminRating ?? 0}
                          onChange={(event) => setClientCardDrafts((current) => ({
                            ...current,
                            [client.id]: {
                              adminRating: Number(event.target.value),
                              adminNote: current[client.id]?.adminNote ?? client.adminNote ?? '',
                            },
                          }))}
                        >
                          {[0, 1, 2, 3, 4, 5].map((value) => (
                            <option key={value} value={value}>{value === 0 ? 'Без оценки' : `${value}/5`}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Внутреннее примечание</label>
                        <textarea
                          className={`${inputCls} min-h-[88px] resize-none`}
                          placeholder="Видно только администратору"
                          value={clientCardDrafts[client.id]?.adminNote ?? ''}
                          onChange={(event) => setClientCardDrafts((current) => ({
                            ...current,
                            [client.id]: {
                              adminRating: current[client.id]?.adminRating ?? client.adminRating ?? 0,
                              adminNote: event.target.value,
                            },
                          }))}
                        />
                      </div>
                      <button
                        onClick={() => { void handleSaveClientCard(client.id); }}
                        disabled={savingClientId === client.id}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                        style={{ background: primary }}
                      >
                        {savingClientId === client.id ? 'Сохраняем...' : 'Сохранить рейтинг и заметку'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* SETTINGS */}
          {page === 'settings' && !settingsSection && (
            <motion.div key="settings-main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <h2 className="font-semibold mb-4">Настройки</h2>
              {[
                { id: 'boxes', icon: Box, label: 'Управление боксами', desc: `${boxes.filter(box => box.active).length} активных бокса`, color: primary },
                { id: 'schedule', icon: Clock, label: 'Расписание работы', desc: scheduleSummary, color: '#F59E0B' },
                { id: 'pricing', icon: DollarSign, label: 'Цены на услуги', desc: `${services.length} услуг`, color: '#34C759' },
                { id: 'payroll', icon: Users, label: 'Зарплаты мастеров', desc: `${masterWorkers.length} мастеров`, color: '#F97316' },
                { id: 'notifications', icon: Bell, label: 'Уведомления', desc: 'Email, Telegram', color: '#A855F7' },
                { id: 'profile', icon: User, label: 'Профиль', desc: 'admin@atmosfera.ru', color: accent },
                { id: 'security', icon: Shield, label: 'Безопасность', desc: 'Изменить пароль', color: '#EF4444' },
              ].map(item => (
                <motion.button key={item.id} whileTap={{ scale: 0.98 }}
                  onClick={() => setSettingsSection(item.id as SettingsSection)}
                  className={`${glass} rounded-2xl p-4 w-full text-left mb-3 flex items-center gap-3`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}18` }}>
                    <item.icon size={18} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className={`text-xs ${sub}`}>{item.desc}</div>
                  </div>
                  <ChevronRight size={16} className={sub} />
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* SETTINGS: PRICING */}
          {page === 'settings' && settingsSection === 'pricing' && (
            <motion.div key="settings-pricing" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-1">Цены на услуги</h2>
              <p className={`text-xs ${sub} mb-4`}>Изменения отображаются у клиентов после сохранения</p>
              {services.map((svc, i) => (
                <div key={svc.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="font-medium text-sm mb-3">{svc.name}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                      <input className={inputCls} type="number" value={svc.price}
                        onChange={e => setServicesState(p => p.map((s, j) => j === i ? { ...s, price: +e.target.value } : s))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Длит. (мин)</label>
                      <input className={inputCls} type="number" value={svc.duration}
                        onChange={e => setServicesState(p => p.map((s, j) => j === i ? { ...s, duration: +e.target.value } : s))} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить цены'}
              </button>
            </motion.div>
          )}

          {/* SETTINGS: BOXES */}
          {page === 'settings' && settingsSection === 'boxes' && (
            <motion.div key="settings-boxes" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Управление боксами</h2>
              {boxes.map((box, i) => (
                <div key={box.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">{box.name}</div>
                    <button onClick={() => setBoxes(prev => prev.map((b, j) => j === i ? { ...b, active: !b.active } : b))}
                      className="w-11 h-6 rounded-full relative transition-all" style={{ background: box.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${box.active ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Цена (₽/час)</label>
                    <input className={inputCls} type="number" value={box.pricePerHour}
                      onChange={e => setBoxes(prev => prev.map((b, j) => j === i ? { ...b, pricePerHour: +e.target.value } : b))} />
                  </div>
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* SETTINGS: SCHEDULE */}
          {page === 'settings' && settingsSection === 'schedule' && (
            <motion.div key="settings-schedule" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Расписание работы</h2>
              {schedule.map((day, i) => (
                <div key={day.day} className={`${glass} rounded-2xl p-4 mb-2`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{day.day}</span>
                    <button onClick={() => setScheduleState(prev => prev.map((d, j) => j === i ? { ...d, active: !d.active } : d))}
                      className="w-11 h-6 rounded-full relative transition-all" style={{ background: day.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${day.active ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  {day.active && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Открытие</label>
                        <input className={inputCls} type="time" value={day.open} onChange={e => setScheduleState(prev => prev.map((d, j) => j === i ? { ...d, open: e.target.value } : d))} />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Закрытие</label>
                        <input className={inputCls} type="time" value={day.close} onChange={e => setScheduleState(prev => prev.map((d, j) => j === i ? { ...d, close: e.target.value } : d))} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* SETTINGS: NOTIFICATIONS */}
          {page === 'settings' && settingsSection === 'notifications' && (
            <motion.div key="settings-notifs" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Уведомления</h2>
              {[
                { key: 'newBooking', label: 'Новая запись', desc: 'При создании новой записи' },
                { key: 'cancelled', label: 'Отмена записи', desc: 'При отмене клиентом' },
                { key: 'paymentDue', label: 'Ожидание оплаты', desc: 'Напоминание об оплате' },
                { key: 'workerAssigned', label: 'Назначение мастера', desc: 'После назначения мастера' },
                { key: 'reminders', label: 'Напоминания', desc: 'За 1 час до записи' },
              ].map(item => (
                <div key={item.key} className={`${glass} rounded-2xl p-4 mb-2 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <Bell size={16} style={{ color: primary }} />
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className={`text-xs ${sub}`}>{item.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                    className="w-11 h-6 rounded-full relative transition-all"
                    style={{ background: notifSettings[item.key as keyof typeof notifSettings] ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifSettings[item.key as keyof typeof notifSettings] ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* SETTINGS: PROFILE */}
          {page === 'settings' && settingsSection === 'profile' && (
            <motion.div key="settings-profile" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Профиль</h2>
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-2" style={{ background: primary }}>
                  {(profile.name || 'A').charAt(0).toUpperCase()}
                </div>
                <div className={`text-xs ${sub}`}>Аватар формируется из имени профиля</div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Имя</label>
                  <input className={inputCls} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Email</label>
                  <input className={inputCls} type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Телефон</label>
                  <input className={inputCls} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Telegram chat id</label>
                  <input className={inputCls} value={profile.telegramChatId} onChange={e => setProfile(p => ({ ...p, telegramChatId: e.target.value }))} />
                </div>
                <div className={`${glass} rounded-2xl p-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Автопривязка Telegram</div>
                      <div className={`text-xs ${sub}`}>
                        {profile.telegramChatId ? 'Telegram уже привязан' : 'Сгенерируйте код и отправьте боту /link CODE'}
                      </div>
                    </div>
                    <button onClick={handleGenerateTelegramCode} className="px-3 py-2 rounded-xl text-sm text-white" style={{ background: primary }}>
                      Получить код
                    </button>
                  </div>
                  {telegramLinkCode && (
                    <div className="mt-3">
                      <div className="text-2xl font-bold tracking-[0.3em]">{telegramLinkCode.code}</div>
                      <div className={`text-xs ${sub} mt-1`}>
                        До {telegramLinkCode.expiresAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} отправьте боту `/link {telegramLinkCode.code}`
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-4" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить изменения'}
              </button>
            </motion.div>
          )}

          {/* SETTINGS: SECURITY */}
          {page === 'settings' && settingsSection === 'security' && (
            <motion.div key="settings-security" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Безопасность</h2>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-3`}>СМЕНА ПАРОЛЯ</div>
                <div className="space-y-3">
                  {[
                    { key: 'current', label: 'Текущий пароль', placeholder: '••••••••' },
                    { key: 'new_', label: 'Новый пароль', placeholder: '8+ символов' },
                    { key: 'confirm', label: 'Повторите пароль', placeholder: '••••••••' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className={`text-xs ${sub} block mb-1`}>{field.label}</label>
                      <div className="relative">
                        <input className={inputCls} type={showPass ? 'text' : 'password'} placeholder={field.placeholder}
                          value={password[field.key as keyof typeof password]}
                          onChange={e => {
                            setSecurityError(null);
                            setSecuritySaved(false);
                            setPassword(p => ({ ...p, [field.key]: e.target.value }));
                          }} />
                        <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                          {showPass ? <EyeOff size={14} className={sub} /> : <Eye size={14} className={sub} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {securityError && <div className="mt-3 text-xs text-red-500">{securityError}</div>}
                {securitySaved && <div className="mt-3 text-xs text-green-600">Пароль обновлён</div>}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-2`}>АКТИВНЫЕ СЕССИИ</div>
                {activeSessions.length === 0 ? (
                  <div className={`text-xs ${sub}`}>Нет активных сессий</div>
                ) : activeSessions.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0 gap-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.device}{item.current ? ' · Текущая' : ''}
                      </div>
                      <div className={`text-xs ${sub}`}>
                        {item.ipAddress} · {item.lastSeenAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button onClick={() => void revokeSession(item.id)} className="text-xs text-red-500 shrink-0">
                      Завершить
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={!password.current || !password.new_ || password.new_ !== password.confirm}
                className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#EF4444' }}>
                <Shield size={16} />{securitySaved ? 'Пароль изменён!' : 'Изменить пароль'}
              </button>
            </motion.div>
          )}

          {page === 'settings' && settingsSection === 'payroll' && (
            <motion.div key="settings-payroll" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-1">Контроль зарплат мастеров</h2>
              <p className={`text-xs ${sub} mb-4`}>Администратор может менять процент, оклад, активность и вести операции по зарплате мастеров с примечанием</p>
              {payrollSettings.map((worker, index) => {
                const liveWorker = workers.find((item) => item.id === worker.id);
                const payrollSummary = liveWorker?.payrollSummary;
                return (
                  <div key={worker.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-medium">{worker.name}</div>
                        <div className={`text-xs ${sub}`}>{payrollSummary?.completedBookings || 0} завершённых записей</div>
                      </div>
                      <div className={`text-right text-xs ${sub}`}>
                        <div className="font-semibold text-sm" style={{ color: accent }}>{(payrollSummary?.balance || 0).toLocaleString('ru')} ₽</div>
                        <div>к выплате сейчас</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className={`${glass} rounded-xl p-3`}>
                        <div className={`text-[11px] ${sub} mb-1`}>Начислено всего</div>
                        <div className="text-sm font-semibold">{(payrollSummary?.totalAccrued || 0).toLocaleString('ru')} ₽</div>
                        <div className={`text-[11px] ${sub} mt-1`}>
                          С заказов: {(payrollSummary?.accruedFromBookings || 0).toLocaleString('ru')} ₽ · Оклад: {(payrollSummary?.baseSalary || worker.salaryBase).toLocaleString('ru')} ₽
                        </div>
                      </div>
                      <div className={`${glass} rounded-xl p-3`}>
                        <div className={`text-[11px] ${sub} mb-1`}>Списания и выплаты</div>
                        <div className="text-sm font-semibold">{(payrollSummary?.totalDeducted || 0).toLocaleString('ru')} ₽</div>
                        <div className={`text-[11px] ${sub} mt-1`}>
                          Авансы: {(payrollSummary?.advanceTotal || 0).toLocaleString('ru')} ₽ · Удержания: {(payrollSummary?.deductionTotal || 0).toLocaleString('ru')} ₽
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Процент мастера</label>
                        <input className={inputCls} type="number" min={0} max={40} value={worker.percent} onChange={(event) => setPayrollSettings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, percent: Math.max(0, Math.min(40, Number(event.target.value) || 0)) } : item))} />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Оклад</label>
                        <input className={inputCls} type="number" min={0} value={worker.salaryBase} onChange={(event) => setPayrollSettings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, salaryBase: Math.max(0, Number(event.target.value) || 0) } : item))} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Активен в расписании</div>
                        <div className={`text-xs ${sub}`}>Отключенный мастер не будет доступен для назначения</div>
                      </div>
                      <button
                        onClick={() => setPayrollSettings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, active: !item.active } : item))}
                        className="w-11 h-6 rounded-full relative transition-all"
                        style={{ background: worker.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${worker.active ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className={`${glass} rounded-xl p-3 mt-3`}>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <select
                          className={selectCls}
                          value={payrollDrafts[worker.id]?.kind || 'advance'}
                          onChange={(event) => setPayrollDrafts((current) => ({
                            ...current,
                            [worker.id]: {
                              ...(current[worker.id] || { amount: '', note: '' }),
                              kind: event.target.value as PayrollEntryKind,
                            },
                          }))}
                        >
                          <option value="advance">Аванс</option>
                          <option value="deduction">Удержание</option>
                          <option value="bonus">Премия</option>
                          <option value="payout">Выплата</option>
                          <option value="adjustment">Корректировка +/-</option>
                        </select>
                        <input
                          className={inputCls}
                          type="number"
                          value={payrollDrafts[worker.id]?.amount || ''}
                          onChange={(event) => setPayrollDrafts((current) => ({
                            ...current,
                            [worker.id]: {
                              ...(current[worker.id] || { kind: 'advance', note: '' }),
                              amount: event.target.value,
                            },
                          }))}
                          placeholder="Сумма"
                        />
                      </div>
                      <textarea
                        className={`${inputCls} h-20 resize-none mb-2`}
                        value={payrollDrafts[worker.id]?.note || ''}
                        onChange={(event) => setPayrollDrafts((current) => ({
                          ...current,
                          [worker.id]: {
                            ...(current[worker.id] || { kind: 'advance', amount: '' }),
                            note: event.target.value,
                          },
                        }))}
                        placeholder="Примечание к авансу, удержанию или выплате"
                      />
                      <button
                        onClick={() => { void handleCreatePayrollEntry(worker.id, worker.name); }}
                        disabled={payrollEntryLoading === worker.id || !payrollDrafts[worker.id]?.amount}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                        style={{ background: primary }}
                      >
                        {payrollEntryLoading === worker.id ? 'Сохраняю...' : 'Добавить операцию'}
                      </button>
                    </div>
                    {(payrollSummary?.bookingItems?.length || 0) > 0 && (
                      <div className="mt-3 space-y-2">
                        {payrollSummary?.bookingItems.slice(0, 4).map((item) => (
                          <div key={item.bookingId} className={`${glass} rounded-xl p-3 flex items-center justify-between gap-3`}>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{item.service}</div>
                              <div className={`text-[11px] ${sub}`}>{item.date} · {item.time}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-semibold">+{item.earned.toLocaleString('ru')} ₽</div>
                              <div className={`text-[11px] ${sub}`}>{item.percent}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(payrollSummary?.entries?.length || 0) > 0 && (
                      <div className="mt-3 space-y-2">
                        {payrollSummary?.entries.slice(0, 4).map((entry) => (
                          <div key={entry.id} className={`${glass} rounded-xl p-3`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium">
                                {{
                                  advance: 'Аванс',
                                  deduction: 'Удержание',
                                  bonus: 'Премия',
                                  payout: 'Выплата',
                                  adjustment: 'Корректировка',
                                }[entry.kind]}
                              </div>
                              <div className="text-sm font-semibold">{entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString('ru')} ₽</div>
                            </div>
                            <div className={`text-[11px] ${sub} mt-1`}>
                              {entry.createdByName} · {entry.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {entry.note && <div className={`text-xs ${sub} mt-1`}>{entry.note}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить зарплаты'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div className={`fixed bottom-0 left-0 right-0 z-10 ${glass} border-t ${isDark ? 'border-white/10' : 'border-black/5'} flex`}>
        {[
          { id: 'calendar', icon: Calendar, label: 'Календарь' },
          { id: 'stats', icon: BarChart3, label: 'Статистика' },
          { id: 'clients', icon: Users, label: 'Клиенты' },
          { id: 'settings', icon: Settings, label: 'Настройки' },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setPage(tab.id as AdminPage); setSettingsSection(null); }} className="flex-1 py-3 flex flex-col items-center gap-1">
            <tab.icon size={20} style={{ color: page === tab.id ? primary : undefined }} className={page !== tab.id ? sub : ''} />
            <span className="text-xs" style={{ color: page === tab.id ? primary : undefined }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* HAMBURGER MENU */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowMenu(false)} />
            <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed left-0 top-0 bottom-0 z-50 w-72 ${isDark ? 'bg-[#0E1624]' : 'bg-white'} shadow-2xl flex flex-col`}>
              <div className="p-5 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: primary }}>А</div>
                    <div>
                      <div className="font-semibold">Администратор</div>
                      <div className={`text-xs ${sub}`}>admin@atmosfera.ru</div>
                    </div>
                  </div>
                  <button onClick={() => setShowMenu(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
                </div>
              </div>
              <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                {[
                  { icon: Calendar, label: 'Календарь', action: () => { setPage('calendar'); setSettingsSection(null); setShowMenu(false); } },
                  { icon: Plus, label: 'Новая запись', action: () => { openNewBookingModal(); setShowMenu(false); } },
                  { icon: Users, label: 'Клиенты', action: () => { setPage('clients'); setShowMenu(false); } },
                  { icon: BarChart3, label: 'Статистика', action: () => { setPage('stats'); setShowMenu(false); } },
                  { icon: Bell, label: 'Уведомления', action: () => { setShowNotifPanel(true); setShowMenu(false); } },
                  { icon: Box, label: 'Боксы', action: () => { setPage('settings'); setSettingsSection('boxes'); setShowMenu(false); } },
                  { icon: Clock, label: 'Расписание', action: () => { setPage('settings'); setSettingsSection('schedule'); setShowMenu(false); } },
                  { icon: Settings, label: 'Настройки', action: () => { setPage('settings'); setSettingsSection(null); setShowMenu(false); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action} className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-colors text-left`} style={{ color: text }}>
                    <item.icon size={18} style={{ color: primary }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* NOTIFICATIONS PANEL */}
      <AnimatePresence>
        {showNotifPanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowNotifPanel(false)} />
            <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed right-0 top-0 bottom-0 z-50 w-80 ${isDark ? 'bg-[#0E1624]' : 'bg-white'} shadow-2xl flex flex-col`}>
              <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <h3 className="font-semibold">Уведомления</h3>
                <button onClick={() => setShowNotifPanel(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {adminNotifications.length === 0 ? (
                  <p className={`text-sm ${sub} text-center py-8`}>Нет уведомлений</p>
                ) : adminNotifications.map(n => (
                  <div key={n.id} onClick={() => markNotificationRead(n.id)} className={`${glass} rounded-xl p-3 cursor-pointer border-l-2`} style={{ borderLeftColor: n.read ? 'transparent' : primary }}>
                    <div className="flex items-start gap-2">
                      <Bell size={13} style={{ color: primary }} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm">{n.message}</p>
                        <p className={`text-xs ${sub} mt-1`}>{n.createdAt.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* BOOKING SLIDE-OVER */}
      <AnimatePresence>
        {showSlideOver && selectedBooking && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowSlideOver(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm ${isDark ? 'bg-[#0E1624]' : 'bg-white'} shadow-2xl flex flex-col overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0 z-10" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', background: surface }}>
                <div>
                  <div className="font-semibold text-sm">#{selectedBooking.id.toUpperCase()}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[selectedBooking.status]}`}>{STATUS_LABELS[selectedBooking.status]}</span>
                </div>
                <button onClick={() => setShowSlideOver(false)} className={`p-2 rounded-xl ${glass}`}><X size={18} /></button>
              </div>
              <div className="p-4 space-y-3">
                <div className={`${glass} rounded-2xl p-4`}>
                  <div className={`text-xs font-medium ${sub} mb-2`}>КЛИЕНТ</div>
                  <div className="font-semibold">{selectedBooking.clientName}</div>
                  <a href={`tel:${selectedBooking.clientPhone}`} className="flex items-center gap-2 mt-1" style={{ color: primary }}>
                    <Phone size={13} /><span className="text-sm">{selectedBooking.clientPhone}</span>
                  </a>
                  {selectedBooking.car && <div className={`text-sm ${sub} mt-1`}>{selectedBooking.car} · {selectedBooking.plate}</div>}
                </div>
                <div className={`${glass} rounded-2xl p-4`}>
                  <div className={`text-xs font-medium ${sub} mb-2`}>УСЛУГА</div>
                  <div className="font-semibold">{selectedBooking.service}</div>
                  <div className={`text-sm ${sub} mt-1`}>
                    {hasManualScheduling(selectedBooking, services)
                      ? 'Время и бокс будут назначены после согласования с клиентом'
                      : `${selectedBooking.date} в ${selectedBooking.time} · ${selectedBooking.duration} мин · ${selectedBooking.box}`}
                  </div>
                  <div className="font-semibold mt-2">{selectedBooking.price.toLocaleString('ru')} ₽</div>
                </div>
                <div className={`${glass} rounded-2xl p-4`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className={`text-xs font-medium ${sub}`}>МАСТЕРА</div>
                    <button onClick={() => { setAssignedWorkers(selectedBooking.workers.map(w => ({ id: w.workerId, percent: w.percent }))); setShowAssignModal(true); }}
                      className="text-xs px-2 py-1 rounded-lg" style={{ color: primary, background: `${primary}15` }}>Назначить</button>
                  </div>
                  {selectedBooking.workers.length > 0 ? selectedBooking.workers.map(w => (
                    <div key={w.workerId} className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white" style={{ background: primary }}>{w.workerName.charAt(0)}</div>
                        <span className="text-sm">{w.workerName}</span>
                      </div>
                      <span className={`text-sm ${sub}`}>{w.percent}%</span>
                    </div>
                  )) : <p className={`text-sm ${sub}`}>Мастера не назначены</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => openEditModal(selectedBooking, 'edit')} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm ${glass}`}><Edit3 size={15} />Редактировать</button>
                  {!['completed', 'cancelled', 'no_show'].includes(selectedBooking.status) && (
                    <button onClick={() => openEditModal(selectedBooking, 'reschedule')} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm bg-blue-500/15 text-blue-600"><Clock size={15} />Перенести</button>
                  )}
                  {READY_TO_START_STATUSES.includes(selectedBooking.status) && (
                    <button onClick={() => { void handleStatusChange(selectedBooking.id, 'in_progress'); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm bg-yellow-500/15 text-yellow-600"><Play size={15} />Начать</button>
                  )}
                  {(selectedBooking.status === 'in_progress' || selectedBooking.status === 'admin_review') && (
                    <button onClick={() => openCompleteModal(selectedBooking)} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm bg-green-500/15 text-green-600"><CheckCircle size={15} />Закрыть</button>
                  )}
                  {(READY_TO_START_STATUSES.includes(selectedBooking.status) || selectedBooking.status === 'in_progress' || selectedBooking.status === 'admin_review') && (
                    <button onClick={() => { void handleStatusChange(selectedBooking.id, 'cancelled'); }} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm bg-red-500/15 text-red-500"><XCircle size={15} />Отменить</button>
                  )}
                  {selectedBooking.status === 'completed' && (
                    <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm bg-green-500/15 text-green-600"><Check size={15} />Завершено</button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ASSIGN WORKERS MODAL */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-2xl p-5 w-full max-w-sm`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Назначить мастеров</h3>
                <button onClick={() => setShowAssignModal(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                {masterWorkers.map(worker => {
                  const assigned = assignedWorkers.find(aw => aw.id === worker.id);
                  return (
                    <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${worker.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <span className="text-sm font-medium">{worker.name}</span>
                          <span className={`text-xs ${sub}`}>{worker.experience}</span>
                        </div>
                        <button onClick={() => assigned ? setAssignedWorkers(p => p.filter(aw => aw.id !== worker.id)) : setAssignedWorkers(p => [...p, { id: worker.id, percent: worker.defaultPercent }])}
                          className="px-3 py-1 rounded-lg text-xs transition-all"
                          style={assigned ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}>
                          {assigned ? 'Выбран' : 'Выбрать'}
                        </button>
                      </div>
                      {assigned && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs ${sub}`}>%</span>
                          <input type="number" min={0} max={40} value={assigned.percent}
                            onChange={e => setAssignedWorkers(p => p.map(aw => aw.id === worker.id ? { ...aw, percent: Math.min(40, Math.max(0, +e.target.value)) } : aw))}
                            className={`flex-1 ${inputCls} py-1.5`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {totalPercent > 100 && (
                <div className="flex items-center gap-2 text-red-500 text-xs mb-3"><AlertCircle size={14} />Сумма процентов превышает 100%</div>
              )}
              <button onClick={() => { void handleAssignWorkers(true); }} className="w-full py-3 rounded-xl text-sm text-white font-medium mb-2" style={{ background: primary }}>Назначить и уведомить</button>
              <button onClick={() => { void handleAssignWorkers(false); }} className={`w-full py-3 rounded-xl text-sm ${glass}`}>Назначить без уведомления</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompleteModal && selectedBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Завершить запись</h3>
                <button onClick={() => setShowCompleteModal(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Итоговая сумма (₽)</label>
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    value={completeAmount}
                    onChange={e => {
                      setCompleteError(null);
                      setCompleteAmount(e.target.value);
                    }}
                  />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Комментарий</label>
                  <input
                    className={inputCls}
                    placeholder="Комментарий по завершению"
                    value={completeNote}
                    onChange={e => {
                      setCompleteError(null);
                      setCompleteNote(e.target.value);
                    }}
                  />
                </div>
                {completeError && <div className="text-xs text-red-500">{completeError}</div>}
              </div>
              <button onClick={() => { void handleCompleteBooking(); }} className="w-full py-3 rounded-xl text-sm text-white font-medium mb-2" style={{ background: primary }}>Подтвердить завершение</button>
              <button onClick={() => setShowCompleteModal(false)} className={`w-full py-2 text-sm ${sub}`}>Отмена</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {showEditModal && selectedBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{editModalMode === 'reschedule' ? 'Перенести запись' : 'Редактировать запись'}</h3>
                <button onClick={() => setShowEditModal(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                {editModalMode === 'reschedule' && (
                  <div className={`rounded-2xl px-3 py-3 text-sm ${glass}`}>
                    Перенос меняет дату, время и бокс клиента без отмены записи.
                  </div>
                )}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Статус</label>
                  <select
                    className={selectCls}
                    value={editBookingDraft.status}
                    onChange={e => {
                      setEditBookingError(null);
                      setEditBookingDraft((current) => ({ ...current, status: e.target.value as BookingStatus }));
                    }}
                  >
                    <option value="scheduled">Запланировано</option>
                    <option value="new">Новая заявка</option>
                    <option value="confirmed">Подтверждена</option>
                    <option value="in_progress">В работе</option>
                    <option value="admin_review">На уточнении у админа</option>
                    <option value="completed">Завершено</option>
                    <option value="no_show">Не приехал</option>
                    <option value="cancelled">Отменено</option>
                  </select>
                </div>
                {(editBookingDraft.status !== 'admin_review' || !isDetailingService(selectedBooking.serviceId, services)) && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Дата</label>
                        <input
                          className={inputCls}
                          placeholder="ДД.ММ.ГГГГ"
                          value={editBookingDraft.date}
                          onChange={e => {
                            setEditBookingError(null);
                            setEditBookingDraft((current) => ({ ...current, date: e.target.value }));
                          }}
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Время</label>
                        <input
                          className={inputCls}
                          placeholder="ЧЧ:ММ"
                          value={editBookingDraft.time}
                          onChange={e => {
                            setEditBookingError(null);
                            setEditBookingDraft((current) => ({ ...current, time: e.target.value }));
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Бокс</label>
                      <select
                        className={selectCls}
                        value={editBookingDraft.box}
                        onChange={e => {
                          setEditBookingError(null);
                          setEditBookingDraft((current) => ({ ...current, box: e.target.value }));
                        }}
                      >
                        {boxes.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
                {editBookingDraft.status === 'admin_review' && isDetailingService(selectedBooking.serviceId, services) && (
                  <div className={`rounded-2xl px-3 py-3 text-sm ${glass}`}>
                    Это заявка на детейлинг без фиксированного времени. Оставьте статус "На уточнении", если нужно сначала созвониться с клиентом.
                  </div>
                )}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Примечание</label>
                  <textarea
                    className={`${inputCls} min-h-[96px] resize-none`}
                    placeholder="Добавить примечание..."
                    value={editBookingDraft.notes}
                    onChange={e => {
                      setEditBookingError(null);
                      setEditBookingDraft((current) => ({ ...current, notes: e.target.value }));
                    }}
                  />
                </div>
                {editBookingError && <div className="text-xs text-red-500">{editBookingError}</div>}
              </div>
              <button
                onClick={() => { void handleSaveEditedBooking(); }}
                disabled={editBookingSaving}
                className="w-full py-3 rounded-xl text-sm text-white font-medium disabled:opacity-60"
                style={{ background: primary }}
              >
                {editBookingSaving ? 'Сохраняем...' : editModalMode === 'reschedule' ? 'Перенести запись' : 'Сохранить'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW BOOKING MODAL */}
      <AnimatePresence>
        {showNewBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto relative`}>
              <div className="sticky top-0 z-10 p-4 border-b flex justify-between items-center" style={{ background: surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Новая запись</h3>
                <button onClick={closeNewBookingModal} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center z-10" style={{ background: isDark ? 'rgba(14,22,36,0.95)' : 'rgba(255,255,255,0.95)' }}>
                    <div className="text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${primary}20` }}>
                        <Check size={28} style={{ color: primary }} />
                      </motion.div>
                      <div className="font-semibold">Запись создана!</div>
                      <div className={`text-sm ${sub} mt-1`}>{saveSuccess === 'notify' ? 'Назначенные мастера уведомлены' : 'Без уведомления мастеров'}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="p-4 space-y-3">
                {[
                  { label: 'Клиент', key: 'clientName', placeholder: 'Введите имя клиента', type: 'text' },
                  { label: 'Телефон', key: 'clientPhone', placeholder: '+7 (___) ___-__-__', type: 'tel' },
                  { label: 'Автомобиль', key: 'car', placeholder: 'Lada Vesta', type: 'text' },
                  { label: 'Номер', key: 'plate', placeholder: 'У999УУ', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className={`text-xs ${sub} block mb-1`}>{f.label}</label>
                    <input className={`${inputCls} ${newBookingErrors[f.key as keyof typeof newBookingErrors] ? 'border-red-400' : ''}`} type={f.type} placeholder={f.placeholder}
                      maxLength={f.key === 'plate' ? 6 : undefined}
                      value={(newBookingForm as any)[f.key]} onChange={e => {
                        const nextValue = f.key === 'plate' ? normalizePlateInput(e.target.value) : e.target.value;
                        setNewBookingForm(p => ({ ...p, [f.key]: nextValue }));
                        if (f.key === 'clientName' || f.key === 'clientPhone' || f.key === 'car' || f.key === 'plate') {
                          setNewBookingErrors((current) => ({ ...current, [f.key]: undefined, general: undefined }));
                        }
                      }} />
                    {(f.key === 'clientName' && newBookingErrors.clientName) && <div className="mt-1 text-xs text-red-500">{newBookingErrors.clientName}</div>}
                    {(f.key === 'clientPhone' && newBookingErrors.clientPhone) && <div className="mt-1 text-xs text-red-500">{newBookingErrors.clientPhone}</div>}
                    {(f.key === 'car' && newBookingErrors.car) && <div className="mt-1 text-xs text-red-500">{newBookingErrors.car}</div>}
                    {(f.key === 'plate' && newBookingErrors.plate) && <div className="mt-1 text-xs text-red-500">{newBookingErrors.plate}</div>}
                  </div>
                ))}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Услуга</label>
                  <select className={selectCls} value={newBookingForm.serviceId} onChange={e => {
                    const svc = services.find(s => s.id === e.target.value);
                    setNewBookingForm(p => ({ ...p, serviceId: e.target.value, service: svc?.name || '', price: svc?.price || 0, duration: svc?.duration || 30 }));
                  }}>
                    <option value="">Выберите услугу</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} — {s.price.toLocaleString('ru')} ₽</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Дата</label>
                    <input className={inputCls} placeholder="ДД.ММ.ГГГГ" value={newBookingForm.date} onChange={e => {
                      setNewBookingForm(p => ({ ...p, date: e.target.value }));
                      setNewBookingErrors((current) => ({ ...current, date: undefined, general: undefined }));
                    }} />
                    {newBookingErrors.date && <div className="mt-1 text-xs text-red-500">{newBookingErrors.date}</div>}
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Время</label>
                    <input className={inputCls} placeholder="ЧЧ:ММ" value={newBookingForm.time} onChange={e => {
                      setNewBookingForm(p => ({ ...p, time: e.target.value }));
                      setNewBookingErrors((current) => ({ ...current, time: undefined, general: undefined }));
                    }} />
                    {newBookingErrors.time && <div className="mt-1 text-xs text-red-500">{newBookingErrors.time}</div>}
                  </div>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Бокс</label>
                  <select className={selectCls} value={newBookingForm.box} onChange={e => setNewBookingForm(p => ({ ...p, box: e.target.value }))}>
                    {boxes.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-xs ${sub} block`}>Назначить мастеров</label>
                    <span className={`text-xs ${sub}`}>Сумма: {totalNewBookingPercent}%</span>
                  </div>
                  <div className="space-y-2">
                    {masterWorkers.filter(worker => worker.active).map(worker => {
                      const assigned = newBookingWorkers.find(item => item.id === worker.id);
                      return (
                        <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${worker.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span className="text-sm font-medium">{worker.name}</span>
                              </div>
                              <div className={`text-xs ${sub} mt-1 truncate`}>{worker.specialty || worker.experience}</div>
                            </div>
                            <button
                              onClick={() => assigned
                                ? setNewBookingWorkers(current => current.filter(item => item.id !== worker.id))
                                : setNewBookingWorkers(current => [...current, { id: worker.id, percent: worker.defaultPercent }])}
                              className="px-3 py-1 rounded-lg text-xs transition-all shrink-0"
                              style={assigned ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                            >
                              {assigned ? 'Выбран' : 'Выбрать'}
                            </button>
                          </div>
                          {assigned && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs ${sub}`}>%</span>
                              <input
                                type="number"
                                min={0}
                                max={40}
                                value={assigned.percent}
                                onChange={e => setNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.min(40, Math.max(0, +e.target.value)) } : item))}
                                className={`flex-1 ${inputCls} py-1.5`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {totalNewBookingPercent > 100 && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} />Сумма процентов мастеров превышает 100%</div>
                )}
                {newBookingErrors.general && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} />{newBookingErrors.general}</div>
                )}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Примечание</label>
                  <input className={inputCls} placeholder="Доп. информация..." value={newBookingForm.notes} onChange={e => setNewBookingForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div className="p-4 space-y-2">
                <button onClick={() => { void handleSaveNewBooking(true); }} disabled={!newBookingForm.serviceId || totalNewBookingPercent > 100 || newBookingSaving} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: primary }}>
                  {newBookingSaving ? 'Сохранение...' : 'Сохранить и уведомить'}
                </button>
                <button onClick={() => { void handleSaveNewBooking(false); }} disabled={!newBookingForm.serviceId || totalNewBookingPercent > 100 || newBookingSaving} className={`w-full py-3 rounded-2xl font-medium ${glass} disabled:opacity-50`}>
                  Сохранить без уведомления
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings saved toast */}
      <AnimatePresence>
        {settingsSaved && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-16 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${accent}40` }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}20` }}>
              <Check size={14} style={{ color: accent }} />
            </div>
            <span className="text-sm font-medium">Настройки сохранены</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
