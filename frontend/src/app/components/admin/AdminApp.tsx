import React, { useEffect, useState } from 'react';
import { useVisualViewport } from '../../utils/useVisualViewport';
import { AttendanceTable } from '../shared/AttendanceTable';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu, Bell, Plus, X, Phone, Edit3, Play, CheckCircle, XCircle,
  Users, Sun, Moon, Calendar, Settings, BarChart3, Check, AlertCircle,
  User, ChevronRight, ArrowLeft, TrendingUp, Clock, Box, CreditCard,
  Shield, Sliders, BellOff, Save, Toggle, Trash2, Eye, EyeOff, DollarSign, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import { useApp, Booking, BookingStatus, type AdminShiftInspection, type EmployeeSetting, type PayrollEntryKind, type RegisteredClient, type Role, type ContentData } from '../../context/AppContext';
import { ContentEditor } from './ContentEditor';
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

const SERVICE_TYPE_OPTIONS = [
  { value: 'Мойка', label: 'Мойка', resourceGroup: 'wash' },
  { value: 'Детейлинг', label: 'Детейлинг', resourceGroup: 'detailing' },
  { value: 'Аренда бокса', label: 'Аренда бокса', resourceGroup: 'wash' },
] as const;

function adminServiceResourceGroupForCategory(category: string) {
  return SERVICE_TYPE_OPTIONS.find((option) => option.value === category)?.resourceGroup || 'wash';
}

const READY_TO_START_STATUSES: BookingStatus[] = ['new', 'confirmed', 'scheduled'];
const STAFF_SCHEDULED_STATUSES: BookingStatus[] = ['new', 'confirmed', 'scheduled', 'in_progress'];
const NEW_BOOKING_STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
  { value: 'admin_review', label: 'На уточнении' },
  { value: 'confirmed', label: 'Подтверждена' },
  { value: 'scheduled', label: 'Запланирована' },
  { value: 'completed', label: 'Прошлая завершённая' },
];
const DEFAULT_SHIFT_SUPPLIES = [
  { id: 'preset-foam', name: 'Активная пена', category: 'Химия', unit: 'шт', qty: 0 },
  { id: 'preset-shampoo', name: 'Автошампунь', category: 'Химия', unit: 'шт', qty: 0 },
  { id: 'preset-microfiber', name: 'Микрофибра', category: 'Расходники', unit: 'шт', qty: 0 },
  { id: 'preset-gloves', name: 'Перчатки', category: 'Расходники', unit: 'шт', qty: 0 },
];
const SHIFT_PHOTO_CATEGORIES = [
  { id: 'floor', label: 'Полы' },
  { id: 'cloths', label: 'Тряпки' },
  { id: 'chemistry', label: 'Химия' },
  { id: 'sinks', label: 'Раковины и зона воды' },
  { id: 'buckets', label: 'Ведра и ёмкости' },
  { id: 'tools', label: 'Инструменты' },
  { id: 'machines', label: 'Аппараты и техника' },
  { id: 'vacuum', label: 'Пылесосы' },
  { id: 'boxes', label: 'Боксы' },
  { id: 'detailRoom', label: 'Детейлинг зона' },
  { id: 'warehouse', label: 'Склад' },
  { id: 'consumables', label: 'Расходники' },
  { id: 'uniform', label: 'Форма и экипировка' },
  { id: 'waiting', label: 'Зона ожидания' },
  { id: 'other', label: 'Прочее' },
] as const;
const SHIFT_PHOTO_MAX_DIMENSION = 1280;
const SHIFT_PHOTO_TARGET_BYTES = 450 * 1024;
const SHIFT_PHOTO_MIN_QUALITY = 0.45;
const PAYROLL_KIND_LABELS: Record<PayrollEntryKind, string> = {
  advance: 'Аванс',
  deduction: 'Списание',
  bonus: 'Премия',
  payout: 'Выплата',
  adjustment: 'Корректировка',
};

type AdminPage = 'calendar' | 'stats' | 'clients' | 'settings';

type SettingsSection = null | 'boxes' | 'schedule' | 'notifications' | 'profile' | 'security' | 'pricing' | 'payroll' | 'shift' | 'attendance' | 'content';
type EditModalMode = 'edit' | 'reschedule';
type ClientSearchMode = 'phone' | 'plate';
type ShiftPhotoCategoryId = typeof SHIFT_PHOTO_CATEGORIES[number]['id'];
function isDetailingService(serviceId: string, services: Array<{ id: string; category: string }>) {
  return services.some((service) => service.id === serviceId && service.category === 'Детейлинг');
}

function serviceResourceGroup(serviceId: string, services: Array<{ id: string; resourceGroup?: string }>) {
  return services.find((service) => service.id === serviceId)?.resourceGroup || 'wash';
}

function hasManualScheduling(booking: Booking, services: Array<{ id: string; category: string }>) {
  return isDetailingService(booking.serviceId, services) && (!booking.time || booking.time === '00:00');
}

function bookingBoxesForService(
  _serviceId: string,
  _services: Array<{ id: string; resourceGroup?: string }>,
  boxes: Array<{ id: string; name: string; resourceGroup: string; pricePerHour: number; active: boolean; description: string }>,
) {
  return boxes.filter((box) => box.active);
}

function bookingLocationLabel(_serviceId: string, _services: Array<{ id: string; resourceGroup?: string }>) {
  return 'Помещение';
}

function parseBookingMinutes(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function bookingBlocksBox(booking: Booking, date: string, time: string, duration: number, boxName: string) {
  if (!STAFF_SCHEDULED_STATUSES.includes(booking.status)) return false;
  if (booking.date !== date || booking.box !== boxName) return false;
  const nextStart = parseBookingMinutes(time);
  const existingStart = parseBookingMinutes(booking.time);
  if (nextStart === null || existingStart === null) return false;
  const nextEnd = nextStart + Math.max(1, duration);
  const existingEnd = existingStart + Math.max(1, booking.duration);
  return nextStart < existingEnd && nextEnd > existingStart;
}

function pickDefaultBookingBox(
  serviceId: string,
  services: Array<{ id: string; resourceGroup?: string }>,
  boxes: Array<{ id: string; name: string; resourceGroup: string; active: boolean }>,
  bookings: Booking[],
  date: string,
  time: string,
  duration: number,
) {
  const resourceGroup = serviceResourceGroup(serviceId, services);
  const preferred = boxes.filter((box) => box.active && box.resourceGroup === resourceGroup);
  const fallback = boxes.filter((box) => box.active && !preferred.some((preferredBox) => preferredBox.id === box.id));
  const candidates = [...preferred, ...fallback];
  if (!date.trim() || !time.trim()) return candidates[0]?.name || '';
  return candidates.find((box) => !bookings.some((booking) => bookingBlocksBox(booking, date, time, duration, box.name)))?.name || candidates[0]?.name || '';
}

function paymentLabel(paymentType: 'cash' | 'card' | 'online', paymentSettled: boolean) {
  if (!paymentSettled) return 'Не оплачено';
  return {
    cash: 'Наличные',
    card: 'Карта',
    online: 'Онлайн',
  }[paymentType];
}

function normalizePhoneSearchValue(value: string) {
  return value.replace(/\D/g, '');
}

function bookingStatusRequiresScheduledSlot(status: BookingStatus) {
  return STAFF_SCHEDULED_STATUSES.includes(status);
}

function numberInputValue(value: number) {
  return value === 0 ? '' : String(value);
}

function numberFromInput(value: string) {
  return value === '' ? 0 : Number(value);
}

function toISODate(value: string) {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = String((i % 2) * 30).padStart(2, '0');
  return `${h}:${m}`;
});

function dataUrlApproxBytes(dataUrl: string) {
  const [, encoded = ''] = dataUrl.split(',', 2);
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((encoded.length * 3) / 4) - padding);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Не удалось обработать фото'));
    image.src = src;
  });
}

async function compressShiftPhoto(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, SHIFT_PHOTO_MAX_DIMENSION / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Не удалось подготовить фото');
    }
    context.drawImage(image, 0, 0, width, height);

    let quality = 0.82;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrlApproxBytes(dataUrl) > SHIFT_PHOTO_TARGET_BYTES && quality > SHIFT_PHOTO_MIN_QUALITY) {
      quality = Math.max(SHIFT_PHOTO_MIN_QUALITY, quality - 0.08);
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function AdminApp() {
  const {
    session,
    isDark,
    toggleTheme,
    bookings,
    clients: registeredClients,
    addClient,
    updateClientCard,
    updateBooking,
    addBooking,
    addBookingService,
    addNotification,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    activeSessions,
    workers,
    stockItems,
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
    saveContent,
    content,
    createPayrollEntry,
    listAdminShiftInspections,
    submitAdminShiftInspection,
    createTelegramLinkCode,
    deleteClient,
    deleteBooking,
    changePassword,
    refreshActiveSessions,
    revokeSession,
    staffProfile,
    switchRole,
    todayLabel,
    tomorrowLabel,
    upcomingDates,
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
  const [assignedWorkers, setAssignedWorkers] = useState<{ id: string; percent: number | '' }[]>([]);
  const [newBookingWorkers, setNewBookingWorkers] = useState<{ id: string; percent: number | '' }[]>([]);
  const [newBookingForm, setNewBookingForm] = useState({
    clientId: '', clientName: '', clientPhone: '', service: '', serviceId: '', date: '',
    time: '', box: '', price: 0, duration: 30, car: '', plate: '', notes: '', status: 'admin_review' as BookingStatus,
    paymentSettled: false,
  });
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [addServiceTargetBooking, setAddServiceTargetBooking] = useState<Booking | null>(null);
  const [addServiceDraft, setAddServiceDraft] = useState({ serviceId: '', price: 0, duration: 30 });
  const [addServiceWorkers, setAddServiceWorkers] = useState<{ id: string; percent: number | '' }[]>([]);
  const [addServiceSaving, setAddServiceSaving] = useState(false);
  const [addServiceError, setAddServiceError] = useState<string | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [createClientSaving, setCreateClientSaving] = useState(false);
  const [createClientErrors, setCreateClientErrors] = useState<{ name?: string; phone?: string; car?: string; plate?: string; general?: string }>({});
  const [createClientForm, setCreateClientForm] = useState({ name: '', phone: '', car: '', plate: '', notes: '' });

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
  const [completePaymentType, setCompletePaymentType] = useState<'cash' | 'card' | 'online'>('cash');
  const [completeNote, setCompleteNote] = useState('');
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [newBookingSaving, setNewBookingSaving] = useState(false);
  const [newBookingErrors, setNewBookingErrors] = useState<{ clientName?: string; clientPhone?: string; car?: string; plate?: string; date?: string; time?: string; general?: string }>({});
  const [editBookingDraft, setEditBookingDraft] = useState({ status: 'scheduled' as BookingStatus, date: tomorrowLabel, time: '10:00', box: liveBoxes[0]?.name || 'Бокс 1', notes: '', car: '', plate: '', clientName: '', clientPhone: '' });
  const [editBookingSaving, setEditBookingSaving] = useState(false);
  const [editBookingError, setEditBookingError] = useState<string | null>(null);
  const [clientCardDrafts, setClientCardDrafts] = useState<Record<string, { adminRating: number; adminNote: string }>>({});
  const [savingClientId, setSavingClientId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearchMode, setClientSearchMode] = useState<ClientSearchMode>('phone');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [payrollSettings, setPayrollSettings] = useState<EmployeeSetting[]>([]);
  const [shiftInspections, setShiftInspections] = useState<AdminShiftInspection[]>([]);
  const [shiftDraft, setShiftDraft] = useState({
    note: '',
    masterIds: [] as string[],
  });
  const [shiftPhotos, setShiftPhotos] = useState<Record<string, { dataUrl: string; fileName: string }>>({});
  const [shiftSubmitting, setShiftSubmitting] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [payrollError, setPayrollError] = useState<string | null>(null);
  const selectableBookingDates = Array.from(new Set([
    todayLabel,
    tomorrowLabel,
    ...upcomingDates.slice(0, 7),
    ...bookings.map((booking) => booking.date).filter(Boolean),
  ])).slice(0, 10);
  const masterWorkers = workers.filter((worker) => worker.role === 'worker');
  const selectedClient = registeredClients.find((client) => client.id === selectedClientId) ?? null;
  const normalizedClientSearchQuery = clientSearchMode === 'phone'
    ? normalizePhoneSearchValue(clientSearchQuery)
    : normalizePlateInput(clientSearchQuery);
  const filteredClients = registeredClients.filter((client) => {
    if (!normalizedClientSearchQuery) return true;
    if (clientSearchMode === 'phone') {
      return normalizePhoneSearchValue(client.phone).includes(normalizedClientSearchQuery);
    }
    const plates = [
      client.plate,
      ...(client.vehicles || []).map((vehicle) => vehicle.plate),
    ]
      .map((plate) => normalizePlateInput(plate || ''))
      .filter(Boolean);
    return plates.some((plate) => plate.includes(normalizedClientSearchQuery));
  });
  const selectedClientBookings = selectedClient
    ? bookings
      .filter((booking) => booking.clientId === selectedClient.id)
      .sort((left, right) => {
        const leftDate = parseFlexibleDate(left.date)?.getTime() ?? 0;
        const rightDate = parseFlexibleDate(right.date)?.getTime() ?? 0;
        if (rightDate !== leftDate) return rightDate - leftDate;
        return right.time.localeCompare(left.time);
      })
    : [];
  const selectedClientVehicles = selectedClient
    ? (selectedClient.vehicles?.length ? selectedClient.vehicles : [{ car: selectedClient.car, plate: selectedClient.plate }])
      .filter((vehicle) => vehicle.car || vehicle.plate)
    : [];
  const selectedClientSpent = selectedClientBookings
    .filter((booking) => booking.status === 'completed')
    .reduce((sum, booking) => sum + booking.price, 0);
  const selectedClientCompletedCount = selectedClientBookings.filter((booking) => booking.status === 'completed').length;
  const selectedClientUpcoming = selectedClientBookings.find((booking) => ['new', 'confirmed', 'scheduled', 'in_progress'].includes(booking.status));
  const selectedClientLastVisit = selectedClientBookings.find((booking) => booking.status === 'completed');
  const shiftSupplies = (
    stockItems.filter((item) => item.category === 'Химия' || item.category === 'Расходники').length > 0
      ? stockItems.filter((item) => item.category === 'Химия' || item.category === 'Расходники')
      : DEFAULT_SHIFT_SUPPLIES
  );
  const uploadedShiftPhotos = SHIFT_PHOTO_CATEGORIES
    .map((category) => ({
      ...category,
      dataUrl: shiftPhotos[category.id]?.dataUrl || '',
      fileName: shiftPhotos[category.id]?.fileName || '',
    }))
    .filter((item) => item.dataUrl);

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
  function defaultBoxForService(svcId: string, svcs: Array<{ id: string; resourceGroup?: string }>, bxs: Array<{ id: string; name: string; resourceGroup: string; active: boolean }>) {
    return pickDefaultBookingBox(
      svcId,
      svcs,
      bxs,
      bookings,
      newBookingForm.date,
      newBookingForm.time,
      newBookingForm.duration,
    );
  }

  const settingsBoxes = boxes.filter((box) => box.resourceGroup === 'wash');
  const bookingFormBoxes = bookingBoxesForService(newBookingForm.serviceId, services, boxes);
  const editBookingBoxes = selectedBooking
    ? bookingBoxesForService(selectedBooking.serviceId, services, boxes)
    : settingsBoxes.filter((box) => box.active);
  const newBookingLocationLabel = bookingLocationLabel(newBookingForm.serviceId, services);
  const editBookingLocationLabel = selectedBooking ? bookingLocationLabel(selectedBooking.serviceId, services) : 'Бокс мойки';
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
    if (selectedClientId && !registeredClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(null);
    }
  }, [registeredClients, selectedClientId]);
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
    setPayrollError(null);
  }, [settingsSection]);
  useEffect(() => {
    if (page === 'settings' && settingsSection === 'security') {
      void refreshActiveSessions();
    }
  }, [page, settingsSection]);
  useEffect(() => {
    if (page === 'settings' && settingsSection === 'shift') {
      void listAdminShiftInspections().then(setShiftInspections);
    }
  }, [page, settingsSection]);

  const modalMaxHeight = useVisualViewport();

  // Auto-scroll active field into view when virtual keyboard resizes the viewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const el = document.activeElement as HTMLElement | null;
      el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  const staffRoleTitle = session?.role === 'accountant' ? 'Бухгалтер' : 'Администратор';
  const staffNotificationsRole = session?.role === 'accountant' ? 'accountant' : 'admin';
  const adminNotifications = notifications.filter((notification) =>
    staffNotificationsRole === 'accountant'
      ? notification.recipientRole === 'accountant' || notification.recipientRole === 'admin'
      : notification.recipientRole === 'admin',
  );
  const unreadCount = adminNotifications.filter((notification) => !notification.read).length;
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
    { name: 'Наличные', value: bookings.filter(b => b.paymentSettled && b.paymentType === 'cash').length, color: accent },
    { name: 'Карта', value: bookings.filter(b => b.paymentSettled && b.paymentType === 'card').length, color: primary },
    { name: 'Онлайн', value: bookings.filter(b => b.paymentSettled && b.paymentType === 'online').length, color: '#A855F7' },
    { name: 'Не оплачено', value: bookings.filter(b => !b.paymentSettled).length, color: '#EF4444' },
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

  const handleCreateClient = async () => {
    const nextErrors: { name?: string; phone?: string; car?: string; plate?: string; general?: string } = {};
    const nameError = validateClientName(createClientForm.name);
    if (nameError) nextErrors.name = nameError;
    // Телефон необязателен — валидируем только если введён
    if (createClientForm.phone.trim()) {
      const phoneError = validateClientPhone(createClientForm.phone);
      if (phoneError) nextErrors.phone = phoneError;
    }
    if (normalizeVehicleInput(createClientForm.car)) {
      const carError = validateVehicleName(createClientForm.car);
      if (carError) nextErrors.car = carError;
    }
    if (normalizePlateInput(createClientForm.plate)) {
      const plateError = validatePlateValue(createClientForm.plate);
      if (plateError) nextErrors.plate = plateError;
    }
    setCreateClientErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setCreateClientSaving(true);
      const created = await addClient({
        name: normalizePersonName(createClientForm.name),
        phone: createClientForm.phone.trim(),
        car: normalizeVehicleInput(createClientForm.car),
        plate: normalizePlateInput(createClientForm.plate),
        notes: createClientForm.notes.trim(),
      });
      setCreateClientForm({ name: '', phone: '', car: '', plate: '', notes: '' });
      setCreateClientErrors({});
      setShowCreateClient(false);
      setSelectedClientId(created.id);
    } catch (error) {
      setCreateClientErrors({
        general: error instanceof Error ? error.message : 'Не удалось создать клиента',
      });
    } finally {
      setCreateClientSaving(false);
    }
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

  const handleShiftPhotoChange = async (categoryId: ShiftPhotoCategoryId, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setShiftError(null);
      const dataUrl = await compressShiftPhoto(file);
      setShiftPhotos((current) => ({
        ...current,
        [categoryId]: { dataUrl, fileName: file.name },
      }));
    } catch (error) {
      setShiftError(error instanceof Error ? error.message : 'Не удалось подготовить фото');
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmitShiftInspection = async () => {
    setShiftError(null);
    setShiftSubmitting(true);
    try {
      const primaryPhoto = uploadedShiftPhotos[0]?.dataUrl || '';
      if (!primaryPhoto) {
        throw new Error('Загрузите хотя бы одно фото для открытия смены');
      }
      if (shiftDraft.masterIds.length === 0) {
        throw new Error('Отметьте мастеров, которые вышли в смену');
      }
      const uploadedCategoriesLabel = uploadedShiftPhotos.map((item) => item.label).join(', ');
      const composedNote = [
        shiftDraft.note.trim(),
        uploadedCategoriesLabel ? `Фото по категориям: ${uploadedCategoriesLabel}` : '',
      ].filter(Boolean).join('\n');
      const saved = await submitAdminShiftInspection({
        floorPhotoUrl: primaryPhoto,
        clothsReady: true,
        note: composedNote,
        supplies: shiftSupplies.map((item) => ({ stockItemId: item.id, checked: false })),
        masters: masterWorkers.map((worker) => ({ workerId: worker.id, checked: shiftDraft.masterIds.includes(worker.id) })),
      });
      setShiftInspections((current) => [saved, ...current]);
      setShiftDraft({ note: '', masterIds: [] });
      setShiftPhotos({});
    } catch (error) {
      setShiftError(error instanceof Error ? error.message : 'Не удалось отправить чек-лист смены');
    } finally {
      setShiftSubmitting(false);
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

  const validateBookingDateForEdit = (dateValue: string, timeValue: string, durationMinutes: number): { date?: string; time?: string } => {
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

  const validateBookingDateTimeFormat = (dateValue: string, timeValue: string): { date?: string; time?: string; parsedDate?: Date } => {
    const nextErrors: { date?: string; time?: string; parsedDate?: Date } = {};
    const parsedDate = parseFlexibleDate(dateValue.trim());
    if (!parsedDate) {
      nextErrors.date = 'Укажите дату в формате ДД.ММ.ГГГГ';
      return nextErrors;
    }
    if (timeToMinutes(timeValue.trim()) === null) {
      nextErrors.time = 'Укажите время в формате ЧЧ:ММ';
      return nextErrors;
    }
    nextErrors.parsedDate = parsedDate;
    return nextErrors;
  };

  const validateNewBookingForm = () => {
    const nextErrors: { clientName?: string; clientPhone?: string; car?: string; plate?: string; date?: string; time?: string; general?: string } = {};
    const selectedService = services.find((service) => service.id === newBookingForm.serviceId);
    if (normalizePersonName(newBookingForm.clientName)) {
      const nameError = validateClientName(newBookingForm.clientName);
      if (nameError) nextErrors.clientName = nameError;
    }
    if (newBookingForm.clientPhone.trim()) {
      const phoneError = validateClientPhone(newBookingForm.clientPhone);
      if (phoneError) nextErrors.clientPhone = phoneError;
    }
    if (normalizeVehicleInput(newBookingForm.car)) {
      const carError = validateVehicleName(newBookingForm.car);
      if (carError) nextErrors.car = carError;
    }
    if (normalizePlateInput(newBookingForm.plate)) {
      const plateError = validatePlateValue(newBookingForm.plate);
      if (plateError) nextErrors.plate = plateError;
    }
    const hasDate = Boolean(newBookingForm.date.trim());
    const hasTime = Boolean(newBookingForm.time.trim());
    const requiresScheduledSlot = bookingStatusRequiresScheduledSlot(newBookingForm.status);
    if (requiresScheduledSlot || newBookingForm.status === 'completed') {
      if (!hasDate) {
        nextErrors.date = 'Укажите дату записи';
      }
      if (!hasTime) {
        nextErrors.time = 'Укажите время записи';
      }
      if (hasDate && hasTime) {
        if (newBookingForm.status === 'completed') {
          const validation = validateBookingDateTimeFormat(newBookingForm.date, newBookingForm.time);
          if (validation.date) nextErrors.date = validation.date;
          if (validation.time) nextErrors.time = validation.time;
          if (!validation.date && !validation.time && !isPastTimeSlot(formatDate(validation.parsedDate as Date), newBookingForm.time.trim())) {
            nextErrors.time = 'Для прошлой записи укажите прошедшие дату и время';
          }
        } else {
          Object.assign(nextErrors, validateBookingDate(newBookingForm.date, newBookingForm.time, selectedService?.duration || newBookingForm.duration || 30));
        }
      }
    } else if (hasDate || hasTime) {
      if (!hasDate) {
        nextErrors.date = 'Укажите дату или очистите дату и время';
      } else if (!hasTime) {
        nextErrors.time = 'Укажите время или очистите дату и время';
      } else {
        const validation = validateBookingDateTimeFormat(newBookingForm.date, newBookingForm.time);
        if (validation.date) nextErrors.date = validation.date;
        if (validation.time) nextErrors.time = validation.time;
      }
    }
    if (!newBookingForm.serviceId) nextErrors.general = 'Выберите услугу';
    if (requiresScheduledSlot && !newBookingForm.box.trim()) nextErrors.general = 'Укажите помещение для записи';
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
      clientId: '',
      clientName: '',
      clientPhone: '',
      service: '',
      serviceId: '',
      date: '',
      time: '',
      box: '',
      price: 0,
      duration: 30,
      car: '',
      plate: '',
      notes: '',
      status: 'admin_review',
      paymentSettled: false,
    });
  };

  const openNewBookingModal = () => {
    resetNewBookingDraft();
    setShowNewBooking(true);
  };

  const openAdditionalServiceModal = (booking: Booking) => {
    setAddServiceTargetBooking(booking);
    setAddServiceDraft({ serviceId: '', price: 0, duration: 30 });
    setAddServiceWorkers([]);
    setAddServiceError(null);
    setAddServiceSaving(false);
    setShowAddServiceModal(true);
  };

  const openNewBookingForClient = (client: RegisteredClient, status: BookingStatus = 'completed') => {
    resetNewBookingDraft();
    const historyDate = new Date();
    historyDate.setDate(historyDate.getDate() - 1);
    setNewBookingForm((current) => ({
      ...current,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      car: client.car || '',
      plate: client.plate || '',
      status,
      date: status === 'completed' ? formatDate(historyDate) : current.date,
      time: status === 'completed' ? '10:00' : current.time,
    }));
    setShowNewBooking(true);
  };

  const closeNewBookingModal = () => {
    setShowNewBooking(false);
    resetNewBookingDraft();
  };

  const handleAddService = async () => {
    if (!addServiceTargetBooking) return;
    if (!addServiceDraft.serviceId) {
      setAddServiceError('Выберите услугу');
      return;
    }
    setAddServiceSaving(true);
    setAddServiceError(null);
    try {
      const svc = services.find(s => s.id === addServiceDraft.serviceId);
      const updatedBooking = await addBookingService(addServiceTargetBooking.id, {
        name: svc?.name || 'Доп. услуга',
        serviceId: addServiceDraft.serviceId,
        price: addServiceDraft.price,
        duration: addServiceDraft.duration,
      });
      if (addServiceWorkers.length > 0) {
        const currentWorkers = addServiceTargetBooking.workers.map(w => ({ workerId: w.workerId, workerName: w.workerName, percent: w.percent }));
        const newWorkerIds = new Set(addServiceWorkers.map(w => w.id));
        const mergedWorkers = [
          ...currentWorkers.filter(w => !newWorkerIds.has(w.workerId)),
          ...addServiceWorkers.map(w => {
            const worker = masterWorkers.find(wk => wk.id === w.id);
            return { workerId: w.id, workerName: worker?.name || '', percent: w.percent === '' ? 0 : w.percent };
          }),
        ];
        await updateBooking(addServiceTargetBooking.id, { workers: mergedWorkers });
      }
      setSelectedBooking(updatedBooking);
      setShowAddServiceModal(false);
      setAddServiceTargetBooking(null);
    } catch (err: any) {
      setAddServiceError(err?.detail || err?.message || 'Ошибка при добавлении услуги');
    } finally {
      setAddServiceSaving(false);
    }
  };

  const handleRemoveService = (serviceId: string) => {
    setServicesState((current) => current.filter((s) => s.id !== serviceId));
  };

  const closeAddServiceModal = () => {
    setShowAddServiceModal(false);
    setAddServiceTargetBooking(null);
    setAddServiceError(null);
  };

  const openEditModal = (booking: Booking, mode: EditModalMode = 'edit') => {
    setEditBookingDraft({
      status: booking.status,
      date: booking.date || todayLabel,
      time: booking.time || '10:00',
      box: booking.box && booking.box !== 'По согласованию' ? booking.box : boxes[0]?.name || 'Бокс 1',
      notes: booking.notes || '',
      car: booking.car || '',
      plate: booking.plate || '',
      clientName: booking.clientName || '',
      clientPhone: booking.clientPhone || '',
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
      const dateChanged = editBookingDraft.date !== selectedBooking.date;
      const timeChanged = editBookingDraft.time !== selectedBooking.time;
      if (dateChanged || timeChanged) {
        const validationErrors = validateBookingDateForEdit(editBookingDraft.date, editBookingDraft.time, selectedBooking.duration);
        if (validationErrors.date || validationErrors.time) {
          setEditBookingError(validationErrors.date || validationErrors.time || 'Проверьте дату и время');
          return;
        }
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
        car: editBookingDraft.car.trim() || undefined,
        plate: editBookingDraft.plate.trim() || undefined,
        clientName: editBookingDraft.clientName.trim() || undefined,
        clientPhone: editBookingDraft.clientPhone.trim() || undefined,
      });
      setSelectedBooking((current) => (current ? {
        ...current,
        status: editBookingDraft.status,
        date: requiresScheduledSlot ? editBookingDraft.date.trim() : '',
        time: requiresScheduledSlot ? editBookingDraft.time.trim() : '',
        box: requiresScheduledSlot ? editBookingDraft.box.trim() : 'По согласованию',
        notes: editBookingDraft.notes.trim(),
        car: editBookingDraft.car.trim(),
        plate: editBookingDraft.plate.trim(),
        clientName: editBookingDraft.clientName.trim(),
        clientPhone: editBookingDraft.clientPhone.trim(),
      } : null));
      setShowEditModal(false);
    } catch (error) {
      setEditBookingError(error instanceof Error ? error.message : 'Не удалось сохранить изменения');
    } finally {
      setEditBookingSaving(false);
    }
  };

  const handleDeleteBooking = () => {
    if (!selectedBooking) return;
    const name = selectedBooking.clientName || `запись #${selectedBooking.id.slice(0, 6)}`;
    if (!window.confirm(`Удалить запись клиента "${name}"? Это действие нельзя отменить.`)) return;
    deleteBooking(selectedBooking.id);
    setShowEditModal(false);
    setSelectedBooking(null);
  };

  const handleAssignWorkers = async (notify: boolean) => {
    if (!selectedBooking) return;
    const updatedWorkers = assignedWorkers.map(aw => {
      const w = masterWorkers.find(wk => wk.id === aw.id);
      return { workerId: aw.id, workerName: w?.name || '', percent: aw.percent === '' ? 0 : aw.percent };
    });
    await updateBooking(selectedBooking.id, { workers: updatedWorkers, notifyWorkers: notify });
    setSelectedBooking(prev => prev ? { ...prev, workers: updatedWorkers } : null);
    setShowAssignModal(false);
  };

  const handleSaveNewBooking = async (notify: boolean) => {
    setNewBookingErrors({});
    // Если нет телефона — принудительно admin_review (запись на уточнении)
    const effectiveStatus = !newBookingForm.clientPhone.trim() && newBookingForm.status !== 'completed'
      ? 'admin_review'
      : newBookingForm.status;
    if (effectiveStatus !== newBookingForm.status) {
      setNewBookingForm(p => ({ ...p, status: 'admin_review' }));
    }
    if (!validateNewBookingForm()) return;
    const svc = services.find(s => s.id === newBookingForm.serviceId);
    const normalizedClientName = normalizePersonName(newBookingForm.clientName);
    const normalizedCar = normalizeVehicleInput(newBookingForm.car);
    const normalizedPlate = normalizePlateInput(newBookingForm.plate);
    const hasDateTime = Boolean(newBookingForm.date.trim() && newBookingForm.time.trim());
    const parsedDate = hasDateTime ? parseFlexibleDate(newBookingForm.date.trim()) : null;
    if (hasDateTime && !parsedDate) {
      setNewBookingErrors({ date: 'Укажите дату в формате ДД.ММ.ГГГГ' });
      return;
    }
    const clientLabel = normalizedClientName || 'Клиент без имени';
    const carLabel = [normalizedCar, normalizedPlate].filter(Boolean).join(', ') || 'Авто не указано';
    const createdWorkers = newBookingWorkers.map((item) => {
      const worker = masterWorkers.find((candidate) => candidate.id === item.id);
      return {
        workerId: item.id,
        workerName: worker?.name || '',
        percent: item.percent === '' ? 0 : item.percent,
      };
    });
    const normalizedDate = parsedDate ? formatDate(parsedDate) : '';
    try {
      setNewBookingSaving(true);
      await addBooking({
        clientId: newBookingForm.clientId,
        clientName: normalizedClientName,
        clientPhone: newBookingForm.clientPhone.trim(),
        service: svc?.name || newBookingForm.service,
        serviceId: newBookingForm.serviceId,
        date: normalizedDate,
        time: newBookingForm.time.trim(),
        duration: newBookingForm.duration || svc?.duration || 30,
        price: newBookingForm.price || svc?.price || 0,
        status: !newBookingForm.clientPhone.trim() ? 'admin_review' : newBookingForm.status,
        workers: createdWorkers,
        box: newBookingForm.box.trim() || 'По согласованию',
        paymentType: 'cash',
        paymentSettled: newBookingForm.paymentSettled,
        car: normalizedCar,
        plate: normalizedPlate,
        notes: newBookingForm.notes,
        notifyWorkers: notify,
      });
      const requestScheduleLabel = hasDateTime
        ? `${normalizedDate} ${newBookingForm.time.trim()}`
        : 'без даты и времени';
      await addNotification({ recipientRole: 'admin', message: `${clientLabel} • ${carLabel} • ${requestScheduleLabel}`, read: false });
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

    if (settingsSection === 'boxes') await saveBoxes(settingsBoxes);
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
    const liveWorker = workers.find((item) => item.id === workerId);
    const accruedFromBookings = liveWorker?.payrollSummary?.accruedFromBookings || 0;
    if (draft.kind === 'advance' && accruedFromBookings < 1000) {
      setPayrollError(`Админ не может выдать аванс ${workerName}, пока он не заработал минимум 1000 ₽`);
      return;
    }

    try {
      setPayrollError(null);
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
    } catch (error) {
      setPayrollError(error instanceof Error ? error.message : 'Не удалось сохранить операцию по зарплате');
    } finally {
      setPayrollEntryLoading(null);
    }
  };

  const openCompleteModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setCompleteAmount(String(booking.price));
    setCompletePaymentType(booking.paymentType || 'cash');
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
          paymentType: completePaymentType,
          notes: nextNote || selectedBooking.notes || '',
        });
        setSelectedBooking(prev => prev ? {
          ...prev,
          status: 'completed',
          price: nextPrice,
          paymentType: completePaymentType,
          notes: nextNote || prev.notes,
        } : null);
      setShowCompleteModal(false);
    } catch (error) {
      setCompleteError(error instanceof Error ? error.message : 'Не удалось завершить запись');
    }
  };

  const totalPercent = assignedWorkers.reduce((s, w) => s + (w.percent === '' ? 0 : w.percent), 0);
  const totalNewBookingPercent = newBookingWorkers.reduce((sum, worker) => sum + (worker.percent === '' ? 0 : worker.percent), 0);

  const tooltipStyle = { background: surface, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, color: text };

  return (
    <div className={`${isDark ? 'dark' : ''} ${bg} ${text} min-h-screen flex flex-col`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 ${glass} px-4 py-3 flex items-center justify-between`}>
        <button onClick={() => setShowMenu(true)} className={`p-2 rounded-xl ${glass}`}><Menu size={20} /></button>
        <div className="text-center">
          <div className="font-semibold text-sm">{staffRoleTitle}</div>
          <div className={`text-xs ${sub}`}>{todayLabel}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {staffProfile?.extraRoles && staffProfile.extraRoles.length > 0 && (
            <div className="relative">
              <button onClick={() => {
                const nextRole = staffProfile.extraRoles?.find(r => r !== session?.role) || staffProfile.role;
                if (nextRole && nextRole !== session?.role) {
                  void switchRole(nextRole as Role);
                }
              }} className={`px-2 py-1.5 rounded-xl text-xs font-medium ${glass}`} style={{ color: primary }}>
                {session?.role === 'admin' ? 'Админ → Владелец' : session?.role === 'owner' ? 'Владелец → Админ' : 'Сменить роль'}
              </button>
            </div>
          )}
          <button onClick={() => { setShowNotifPanel(true); markAllNotificationsRead(staffNotificationsRole); }} className={`p-2 rounded-xl ${glass} relative`}>
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
                        <div className={`text-sm ${sub}`}>{booking.service}{booking.services && booking.services.length > 0 ? <span className="ml-1 text-xs" style={{ color: primary }}>+{booking.services.length}</span> : ''}</div>
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
                          <div className={`text-xs ${sub}`}>{booking.service}{booking.services && booking.services.length > 0 ? <span className="ml-1" style={{ color: primary }}> +{booking.services.length}</span> : ''} · {booking.date}</div>
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
              <div className="flex items-center justify-between mb-4 gap-3">
                <div>
                  <h2 className="font-semibold">Клиенты</h2>
                  <p className={`text-xs ${sub} mt-1`}>
                    {selectedClient ? 'История услуг, оплаты, авто и внутренняя заметка по клиенту' : 'Открой клиента, чтобы посмотреть всю историю посещений'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedClient && (
                    <button
                      onClick={() => setShowCreateClient(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white"
                      style={{ background: primary }}
                    >
                      <Plus size={14} />
                      Новый
                    </button>
                  )}
                  {selectedClient && (
                    <button
                      onClick={() => setSelectedClientId(null)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
                    >
                      <ArrowLeft size={14} />
                      Назад
                    </button>
                  )}
                </div>
              </div>
              {!selectedClient && registeredClients.length > 0 && (
                <div className={`${glass} rounded-2xl p-3 mb-4`}>
                  <div className="flex gap-2 mb-3">
                    {([
                      { id: 'phone', label: 'По телефону' },
                      { id: 'plate', label: 'По госномеру' },
                    ] as const).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setClientSearchMode(option.id);
                          setClientSearchQuery('');
                        }}
                        className={`flex-1 rounded-xl px-3 py-2 text-sm ${clientSearchMode === option.id ? 'text-white' : sub}`}
                        style={clientSearchMode === option.id ? { background: primary } : undefined}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <input
                    className={inputCls}
                    type={clientSearchMode === 'phone' ? 'tel' : 'text'}
                    placeholder={clientSearchMode === 'phone' ? '+7 (___) ___-__-__' : 'A123BC777'}
                    value={clientSearchQuery}
                    onChange={(event) => setClientSearchQuery(event.target.value)}
                  />
                </div>
              )}
              {registeredClients.length === 0 && (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <Users size={36} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>Пока нет зарегистрированных клиентов</p>
                </div>
              )}
              {!selectedClient && filteredClients.map(client => {
                const clientBookings = bookings.filter(b => b.clientId === client.id);
                const spent = clientBookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.price, 0);
                const lastBooking = [...clientBookings].sort((left, right) => {
                  const leftDate = parseFlexibleDate(left.date)?.getTime() ?? 0;
                  const rightDate = parseFlexibleDate(right.date)?.getTime() ?? 0;
                  if (rightDate !== leftDate) return rightDate - leftDate;
                  return right.time.localeCompare(left.time);
                })[0];
                const clientDisplayName = client.name.trim() || 'Клиент без имени';
                const clientPhone = client.phone.trim();
                return (
                  <div
                    key={client.id}
                    className={`${glass} rounded-2xl p-4 mb-3 cursor-pointer transition-transform hover:-translate-y-0.5`}
                    onClick={() => setSelectedClientId(client.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedClientId(client.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: primary }}>{clientDisplayName.charAt(0).toUpperCase() || '?'}</div>
                      <div className="flex-1">
                        <div className="font-semibold">{clientDisplayName}</div>
                        <div className={`text-xs ${sub}`}>{client.car || 'Автомобиль не указан'}</div>
                        {client.plate && <div className={`text-xs ${sub} font-mono`}>{client.plate}</div>}
                        {clientPhone ? (
                          <a href={`tel:${clientPhone}`} className="text-xs flex items-center gap-1 mt-0.5" style={{ color: primary }}>
                            <Phone size={10} />{clientPhone}
                          </a>
                        ) : (
                          <div className={`text-xs ${sub} mt-0.5`}>Телефон не указан</div>
                        )}
                        <div className={`text-[11px] ${sub} mt-1`}>
                          {lastBooking ? `Последний визит: ${lastBooking.date} ${lastBooking.time}` : 'Истории посещений пока нет'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteClient(client.id, client.name);
                          }}
                          className={`p-2 rounded-xl ${isDark ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-500'}`}
                          aria-label={`Удалить клиента ${client.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={16} className={sub} />
                      </div>
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
                    <div className={`mt-3 text-xs ${sub} flex items-center justify-between gap-3`}>
                      <span>Открой карточку, чтобы увидеть все услуги и детали клиента</span>
                      <span>Рейтинг: {client.adminRating ? `${client.adminRating}/5` : 'без оценки'}</span>
                    </div>
                  </div>
                );
              })}
              {!selectedClient && registeredClients.length > 0 && filteredClients.length === 0 && (
                <div className={`${glass} rounded-2xl p-6 text-center`}>
                  <div className="font-medium mb-1">Ничего не найдено</div>
                  <div className={`text-sm ${sub}`}>Попробуйте другой телефон или госномер</div>
                </div>
              )}
              {selectedClient && (
                <div className="space-y-3">
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0" style={{ background: primary }}>
                        {(selectedClient.name.trim() || 'К').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg">{selectedClient.name.trim() || 'Клиент без имени'}</div>
                        <div className={`text-sm ${sub} mt-1`}>
                          Основное авто: {selectedClient.car || 'не указано'}{selectedClient.plate ? `, ${selectedClient.plate}` : ''}
                        </div>
                        {selectedClient.phone.trim() ? (
                          <a href={`tel:${selectedClient.phone}`} className="text-sm flex items-center gap-1 mt-1" style={{ color: primary }}>
                            <Phone size={12} />{selectedClient.phone}
                          </a>
                        ) : (
                          <div className={`text-sm ${sub} mt-1`}>Телефон не указан</div>
                        )}
                      </div>
                      <button
                        onClick={() => void handleDeleteClient(selectedClient.id, selectedClient.name)}
                        className={`p-2 rounded-xl ${isDark ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-500'}`}
                        aria-label={`Удалить клиента ${selectedClient.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {selectedClient.adminNote && (
                      <div className={`rounded-xl px-3 py-2.5 mb-4 text-sm border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                        <div className={`text-xs font-medium mb-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>⚑ Примечание:</div>
                        {selectedClient.adminNote}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openNewBookingForClient(selectedClient)}
                      className="w-full mb-4 py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                      style={{ background: primary }}
                    >
                      <Plus size={16} />
                      Добавить прошлую запись
                    </button>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        { label: 'Всего записей', value: selectedClientBookings.length },
                        { label: 'Завершённых', value: selectedClientCompletedCount },
                        { label: 'Потрачено', value: `${selectedClientSpent.toLocaleString('ru')} ₽` },
                        { label: 'Долг', value: `${selectedClient.debtBalance.toLocaleString('ru')} ₽` },
                      ].map((item) => (
                        <div key={item.label} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                          <div className="font-semibold">{item.value}</div>
                          <div className={`text-xs ${sub}`}>{item.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                        <div className={`text-xs ${sub} mb-1`}>Ближайшая запись</div>
                        <div className="text-sm">
                          {selectedClientUpcoming
                            ? `${selectedClientUpcoming.date} ${selectedClientUpcoming.time} • ${selectedClientUpcoming.service}`
                            : 'Нет активных записей'}
                        </div>
                      </div>
                      <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                        <div className={`text-xs ${sub} mb-1`}>Последний завершённый визит</div>
                        <div className="text-sm">
                          {selectedClientLastVisit
                            ? `${selectedClientLastVisit.date} ${selectedClientLastVisit.time} • ${selectedClientLastVisit.service}`
                            : 'Пока нет завершённых услуг'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Рейтинг клиента для админа</label>
                        <select
                          className={selectCls}
                          value={clientCardDrafts[selectedClient.id]?.adminRating ?? 0}
                          onChange={(event) => setClientCardDrafts((current) => ({
                            ...current,
                            [selectedClient.id]: {
                              adminRating: Number(event.target.value),
                              adminNote: current[selectedClient.id]?.adminNote ?? selectedClient.adminNote ?? '',
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
                          className={`${inputCls} min-h-[100px] resize-none`}
                          placeholder="Видно только администратору"
                          value={clientCardDrafts[selectedClient.id]?.adminNote ?? ''}
                          onChange={(event) => setClientCardDrafts((current) => ({
                            ...current,
                            [selectedClient.id]: {
                              adminRating: current[selectedClient.id]?.adminRating ?? selectedClient.adminRating ?? 0,
                              adminNote: event.target.value,
                            },
                          }))}
                        />
                      </div>
                      <button
                        onClick={() => { void handleSaveClientCard(selectedClient.id); }}
                        disabled={savingClientId === selectedClient.id}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                        style={{ background: primary }}
                      >
                        {savingClientId === selectedClient.id ? 'Сохраняем...' : 'Сохранить карточку клиента'}
                      </button>
                    </div>
                  </div>

                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className="font-semibold mb-3">Автомобили клиента</div>
                    {selectedClientVehicles.length === 0 ? (
                      <div className={`text-sm ${sub}`}>Автомобили ещё не добавлены</div>
                    ) : (
                      <div className="space-y-2">
                        {selectedClientVehicles.map((vehicle, index) => (
                          <div key={`${vehicle.car}-${vehicle.plate}-${index}`} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3 flex items-center justify-between gap-3`}>
                            <div className="min-w-0">
                              <div className="font-medium text-sm">{vehicle.car || 'Авто без названия'}</div>
                              <div className={`text-xs ${sub}`}>{vehicle.plate || 'Номер не указан'}</div>
                            </div>
                            <div className={`text-[11px] ${sub}`}>{index === 0 ? 'Основное' : `Авто ${index + 1}`}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className="font-semibold mb-3">История услуг</div>
                    {selectedClientBookings.length === 0 ? (
                      <div className={`text-sm ${sub}`}>У клиента пока нет записей</div>
                    ) : (
                      <div className="space-y-3">
                        {selectedClientBookings.map((booking) => (
                          <div key={booking.id} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-2xl p-3`}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="min-w-0">
                                <div className="font-medium text-sm">{booking.service}{booking.services && booking.services.length > 0 ? <span className="ml-1 text-xs" style={{ color: primary }}>+{booking.services.length}</span> : ''}</div>
                                <div className={`text-xs ${sub} mt-0.5`}>
                                  {booking.date} • {booking.time} • {booking.box || 'Без бокса'}
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-[11px] ${STATUS_BADGE[booking.status]}`}>
                                {STATUS_LABELS[booking.status]}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                                <div className={`text-[11px] ${sub}`}>Стоимость</div>
                                <div>{booking.price.toLocaleString('ru')} ₽</div>
                              </div>
                              <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                                <div className={`text-[11px] ${sub}`}>Оплата</div>
                                <div>{paymentLabel(booking.paymentType, booking.paymentSettled)}</div>
                              </div>
                              <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                                <div className={`text-[11px] ${sub}`}>Авто</div>
                                <div>{booking.car || 'Не указано'}</div>
                              </div>
                              <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                                <div className={`text-[11px] ${sub}`}>Номер</div>
                                <div>{booking.plate || 'Не указан'}</div>
                              </div>
                            </div>

                            <div className="mt-2 space-y-1 text-xs">
                              <div className={sub}>
                                Длительность: {booking.duration} мин
                              </div>
                              <div className={sub}>
                                Мастера: {booking.workers.length ? booking.workers.map((worker) => worker.workerName).join(', ') : 'Не назначены'}
                              </div>
                              <div className={sub}>
                                Комментарий: {booking.notes?.trim() ? booking.notes : 'Нет комментария'}
                              </div>
                              <div className={sub}>
                                Создано: {booking.createdAt.toLocaleString('ru-RU')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* SETTINGS */}
          {page === 'settings' && !settingsSection && (
            <motion.div key="settings-main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <h2 className="font-semibold mb-4">Настройки</h2>
              {[
                { id: 'boxes', icon: Box, label: 'Управление боксами', desc: `${settingsBoxes.filter(box => box.active).length} активных бокса`, color: primary },
                { id: 'schedule', icon: Clock, label: 'Расписание работы', desc: scheduleSummary, color: '#F59E0B' },
                { id: 'pricing', icon: DollarSign, label: 'Цены на услуги', desc: `${services.length} услуг`, color: '#34C759' },
                { id: 'payroll', icon: Users, label: 'Зарплаты мастеров', desc: `${masterWorkers.length} мастеров`, color: '#F97316' },
                { id: 'shift', icon: CheckCircle, label: 'Открытие смены', desc: 'Фото, расходники и мастера', color: '#0EA5E9' },
                { id: 'attendance', icon: TrendingUp, label: 'Посещаемость', desc: 'Выходы мастеров на смену', color: '#8B5CF6' },
                { id: 'notifications', icon: Bell, label: 'Уведомления', desc: 'Email, Telegram', color: '#A855F7' },
                { id: 'profile', icon: User, label: 'Профиль', desc: 'admin@atmosfera.ru', color: accent },
                { id: 'security', icon: Shield, label: 'Безопасность', desc: 'Изменить пароль', color: '#EF4444' },
                { id: 'content', icon: FileText, label: 'Контент сайта', desc: 'О студии, услуги, портфолио', color: '#06B6D4' },
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
                  <div className="flex justify-end -mt-1 -mr-1 mb-1">
                    <button onClick={() => handleRemoveService(svc.id)} className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Название</label>
                      <input className={inputCls} value={svc.name} onChange={e => setServicesState(p => p.map((s, j) => j === i ? { ...s, name: e.target.value } : s))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Тип услуги</label>
                      <select className={selectCls} value={svc.category} onChange={e => setServicesState(p => p.map((s, j) => j === i ? { ...s, category: e.target.value, resourceGroup: adminServiceResourceGroupForCategory(e.target.value) } : s))}>
                        {SERVICE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                        <input className={inputCls} type="number" value={numberInputValue(svc.price)}
                          onChange={e => setServicesState(p => p.map((s, j) => j === i ? { ...s, price: numberFromInput(e.target.value) } : s))} />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Длит. (мин)</label>
                        <input className={inputCls} type="number" value={numberInputValue(svc.duration)}
                          onChange={e => setServicesState(p => p.map((s, j) => j === i ? { ...s, duration: numberFromInput(e.target.value) } : s))} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить цены'}
              </button>
            </motion.div>
          )}

          {page === 'settings' && settingsSection === 'shift' && (
            <motion.div key="settings-shift" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-1">Открытие смены</h2>
              <p className={`text-xs ${sub} mb-4`}>Перед стартом смены загрузи фото по всем нужным категориям. Чекбоксы убраны, теперь подтверждение идёт через фотофиксацию.</p>

              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="font-medium mb-3">Фото-чеклист открытия смены</div>
                <div className={`mb-3 rounded-xl px-3 py-2 text-xs ${sub}`} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  Загрузи до 15 фото. Первое загруженное фото уйдёт владельцу как основное, а список категорий сохранится в комментарии смены.
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {SHIFT_PHOTO_CATEGORIES.map((category) => {
                    const photo = shiftPhotos[category.id];
                    return (
                      <div key={category.id} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-2xl p-3`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="text-sm font-medium">{category.label}</div>
                            <div className={`text-xs ${sub}`}>{photo?.fileName || 'Фото ещё не загружено'}</div>
                          </div>
                          {photo && <div className={`text-[11px] ${sub}`}>Загружено</div>}
                        </div>
                        <label className={`block rounded-2xl border border-dashed px-4 py-4 text-center ${isDark ? 'border-white/15' : 'border-black/10'}`}>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => { void handleShiftPhotoChange(category.id, event); }}
                          />
                          <div className="text-sm font-medium">{photo ? 'Заменить фото' : `Загрузить фото: ${category.label}`}</div>
                          <div className={`text-xs ${sub} mt-1`}>Фото категории {category.label.toLowerCase()}</div>
                        </label>
                        {photo?.dataUrl && (
                          <img src={photo.dataUrl} alt={category.label} className="mt-3 h-40 w-full rounded-2xl object-cover" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="font-medium mb-3">Мастера на смене</div>
                <div className="space-y-2">
                  {masterWorkers.filter((worker) => worker.active).map((worker) => {
                    const checked = shiftDraft.masterIds.includes(worker.id);
                    return (
                      <button
                        key={worker.id}
                        type="button"
                        onClick={() => setShiftDraft((current) => ({
                          ...current,
                          masterIds: checked
                            ? current.masterIds.filter((id) => id !== worker.id)
                            : [...current.masterIds, worker.id],
                        }))}
                        className={`${glass} w-full rounded-2xl p-3 text-left transition-all ${checked ? 'ring-2' : ''}`}
                        style={checked ? { ringColor: primary, outline: `2px solid ${primary}`, outlineOffset: '-2px' } : undefined}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">{worker.name}</div>
                            <div className={`text-xs ${sub}`}>{worker.specialty || worker.experience || 'Мастер'}</div>
                          </div>
                          <div
                            className="h-6 min-w-6 rounded-full px-2 flex items-center justify-center text-[11px] font-semibold text-white"
                            style={{ background: checked ? primary : '#9CA3AF' }}
                          >
                            {checked ? 'Есть' : 'Нет'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className={`mt-3 text-xs ${sub}`}>
                  Отметь только тех мастеров, которые реально вышли в смену. Проверку расходников подтверждает владелец после фото.
                </div>
              </div>

              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="font-medium mb-3">Комментарий к открытию смены</div>
                <textarea
                  className={`${inputCls} min-h-[88px] resize-none`}
                  placeholder="Комментарий для владельца"
                  value={shiftDraft.note}
                  onChange={(event) => setShiftDraft((current) => ({ ...current, note: event.target.value }))}
                />
                {shiftError && <div className="mt-3 text-xs text-red-500">{shiftError}</div>}
                <button onClick={() => { void handleSubmitShiftInspection(); }} disabled={shiftSubmitting} className="mt-3 w-full py-3 rounded-2xl text-white font-semibold disabled:opacity-60" style={{ background: primary }}>
                  {shiftSubmitting ? 'Отправляем владельцу...' : 'Начать смену и отправить владельцу'}
                </button>
              </div>

              <div className="space-y-3">
                {shiftInspections.map((inspection) => (
                  <div key={inspection.id} className={`${glass} rounded-2xl p-4`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-medium">
                          {inspection.status === 'pending' ? 'Ожидает подтверждения владельца' : inspection.status === 'approved' ? 'Смена подтверждена' : 'Смена отклонена'}
                        </div>
                        <div className={`text-xs ${sub}`}>{inspection.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${inspection.status === 'pending' ? 'bg-amber-500/15 text-amber-600' : inspection.status === 'approved' ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'}`}>
                        {inspection.status === 'pending' ? 'На проверке' : inspection.status === 'approved' ? 'Подтверждено' : 'Отказ'}
                      </div>
                    </div>
                    <div className={`text-xs ${sub}`}>Мастера: {inspection.masters.filter((item) => item.checked).map((item) => item.workerName).join(', ') || 'Не выбраны'}</div>
                    <div className={`text-xs ${sub} mt-1`}>Расходники: {inspection.supplies.filter((item) => item.checked).map((item) => item.name).join(', ') || 'Не отмечены'}</div>
                    {inspection.issueNote && <div className="mt-2 text-xs text-red-500">Проблема: {inspection.issueNote}</div>}
                  </div>
                ))}
              </div>

              <div className={`${glass} rounded-2xl p-4 mt-4`}>
                <div className="font-medium mb-4">Посещаемость мастеров</div>
                <AttendanceTable mode="admin" primary={primary} />
              </div>
            </motion.div>
          )}

          {/* SETTINGS: ATTENDANCE */}
          {page === 'settings' && settingsSection === 'attendance' && (
            <motion.div key="settings-attendance" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Посещаемость мастеров</h2>
              <p className={`text-xs ${sub} mb-4`}>Количество выходов каждого мастера на смену за выбранный период.</p>
              <AttendanceTable mode="admin" primary={primary} />
            </motion.div>
          )}

          {/* SETTINGS: BOXES */}
          {page === 'settings' && settingsSection === 'boxes' && (
            <motion.div key="settings-boxes" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Управление боксами</h2>
              {settingsBoxes.map((box) => (
                <div key={box.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">{box.name}</div>
                    <button onClick={() => setBoxes(prev => prev.map((b) => b.id === box.id ? { ...b, active: !b.active } : b))}
                      className="w-11 h-6 rounded-full relative transition-all" style={{ background: box.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${box.active ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Цена (₽/час)</label>
                    <input className={inputCls} type="number" value={numberInputValue(box.pricePerHour)}
                      onChange={e => setBoxes(prev => prev.map((b) => b.id === box.id ? { ...b, pricePerHour: numberFromInput(e.target.value) } : b))} />
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

          {/* SETTINGS: CONTENT */}
          {page === 'settings' && settingsSection === 'content' && (
            <motion.div key="settings-content" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <ContentEditor
                initialContent={content}
                onSave={saveContent}
                glass={glass}
                inputCls={inputCls}
                sub={sub}
                primary={primary}
                isDark={isDark}
              />
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
                        <input className={inputCls} type="number" step="0.00001" min={0} max={40} value={worker.percent === '' ? '' : worker.percent} onChange={(event) => { const r = event.target.value; if (r === '') { setPayrollSettings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, percent: '' } : item)); return; } const n = parseFloat(r); if (!isNaN(n)) { setPayrollSettings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, percent: Math.min(40, Math.max(0, n)) } : item)); } }} onBlur={() => setPayrollSettings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, percent: item.percent === '' ? 0 : item.percent } : item))} />
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
                          <option value="deduction">Списание</option>
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
                        placeholder="Примечание к авансу, списанию или выплате"
                      />
                      {payrollError && (
                        <div className="mb-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">
                          {payrollError}
                        </div>
                      )}
                      <button
                        onClick={() => { void handleCreatePayrollEntry(worker.id, worker.name); }}
                        disabled={payrollEntryLoading === worker.id || !payrollDrafts[worker.id]?.amount}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                        style={{ background: primary }}
                      >
                        {payrollEntryLoading === worker.id ? 'Сохраняю...' : `${PAYROLL_KIND_LABELS[payrollDrafts[worker.id]?.kind || 'advance']} мастеру`}
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
                                {PAYROLL_KIND_LABELS[entry.kind]}
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
          { id: 'payroll', icon: DollarSign, label: 'Зарплаты', action: () => { setPage('settings'); setSettingsSection('payroll'); } },
          { id: 'settings', icon: Settings, label: 'Настройки' },
        ].map(tab => {
          const isActive = tab.id === 'payroll'
            ? page === 'settings' && settingsSection === 'payroll'
            : page === tab.id;
          return (
          <button key={tab.id} onClick={() => {
            if (tab.action) {
              tab.action();
              return;
            }
            setPage(tab.id as AdminPage);
            setSettingsSection(null);
          }} className="flex-1 py-3 flex flex-col items-center gap-1">
            <tab.icon size={20} style={{ color: isActive ? primary : undefined }} className={!isActive ? sub : ''} />
            <span className="text-[11px]" style={{ color: isActive ? primary : undefined }}>{tab.label}</span>
          </button>
        )})}
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
                      <div className="font-semibold">{staffRoleTitle}</div>
                      <div className={`text-xs ${sub}`}>admin@atmosfera.ru</div>
                    </div>
                  </div>
                  <button onClick={() => setShowMenu(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
                </div>
              </div>
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                <button
                  onClick={() => { setPage('settings'); setSettingsSection('shift'); setShowMenu(false); }}
                  className="w-full rounded-2xl px-4 py-4 text-left text-white"
                  style={{ background: `linear-gradient(135deg, ${primary}, #0EA5E9)` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Старт смены</div>
                      <div className="text-xs text-white/80">Фото пола, расходники, мастера и отправка владельцу</div>
                    </div>
                  </div>
                </button>
                {[
                  { icon: Calendar, label: 'Календарь', action: () => { setPage('calendar'); setSettingsSection(null); setShowMenu(false); } },
                  { icon: Plus, label: 'Новая запись', action: () => { openNewBookingModal(); setShowMenu(false); } },
                  { icon: Users, label: 'Клиенты', action: () => { setPage('clients'); setShowMenu(false); } },
                  { icon: BarChart3, label: 'Статистика', action: () => { setPage('stats'); setShowMenu(false); } },
                  { icon: DollarSign, label: 'Зарплаты мастерам', action: () => { setPage('settings'); setSettingsSection('payroll'); setShowMenu(false); } },
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
                  <div className={`text-xs font-medium ${sub} mb-2`}>УСЛУГИ</div>
                  <div className="font-semibold">{selectedBooking.service}</div>
                  {selectedBooking.services && selectedBooking.services.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {selectedBooking.services.map((svc, idx) => (
                        <div key={idx} className="rounded-xl px-3 py-2" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{svc.name}</span>
                            <span className="font-semibold">{svc.price.toLocaleString('ru')} ₽</span>
                          </div>
                          {selectedBooking.workers.length > 0 && selectedBooking.workers.map(w => {
                            const earned = Math.round(svc.price * (w.percent || 0) / 100);
                            return (
                              <div key={w.workerId} className="flex justify-between items-center mt-1">
                                <span className={`text-xs ${sub}`}>{w.workerName} · {w.percent}%</span>
                                <span className="text-xs font-medium text-green-500">+{earned.toLocaleString('ru')} ₽</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
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
                    <button onClick={() => openAdditionalServiceModal(selectedBooking)} className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm bg-violet-500/15 text-violet-600"><Plus size={15} />Доп. услуга</button>
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

      {/* ADD SERVICE MODAL */}
      <AnimatePresence>
        {showAddServiceModal && addServiceTargetBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className={`w-full max-w-sm mx-4 rounded-3xl p-5 max-h-[85vh] overflow-y-auto ${isDark ? 'bg-[#0E1624]' : 'bg-white'}`}>
              <h3 className={`text-lg font-semibold ${text} mb-1`}>Добавить услугу</h3>
              <p className={`text-xs ${sub} mb-4`}>Для: {addServiceTargetBooking.clientName} ({addServiceTargetBooking.service})</p>

              {/* ── Услуга ── */}
              <div>
                <label className={`text-xs ${sub} block mb-1`}>Услуга</label>
                <select className={selectCls} value={addServiceDraft.serviceId} onChange={e => {
                  const svc = services.find(s => s.id === e.target.value);
                  setAddServiceDraft({
                    serviceId: e.target.value,
                    price: svc?.price || 0,
                    duration: svc?.duration || 30,
                  });
                  setAddServiceError(null);
                }}>
                  <option value="">Выберите услугу</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

              {/* ── Цена и длительность ── */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                  <input className={inputCls} type="number" value={numberInputValue(addServiceDraft.price)} onChange={e => setAddServiceDraft(p => ({ ...p, price: numberFromInput(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Длит. (мин)</label>
                  <input className={inputCls} type="number" value={numberInputValue(addServiceDraft.duration)} onChange={e => setAddServiceDraft(p => ({ ...p, duration: numberFromInput(e.target.value) }))} />
                </div>
              </div>

              <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

              {/* ── Мастера ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-medium ${sub} uppercase tracking-wider`}>Назначить мастеров</label>
                  {addServiceWorkers.length > 0 && (
                    <span className={`text-xs ${sub}`}>Выбрано: {addServiceWorkers.length}</span>
                  )}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {masterWorkers.filter(w => w.active).map(worker => {
                    const assigned = addServiceWorkers.find(item => item.id === worker.id);
                    return (
                      <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${worker.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-sm font-medium">{worker.name}</span>
                          </div>
                          <button
                            onClick={() => assigned
                              ? setAddServiceWorkers(current => current.filter(item => item.id !== worker.id))
                              : setAddServiceWorkers(current => [...current, { id: worker.id, percent: worker.defaultPercent }])}
                            className="px-3 py-1 rounded-lg text-xs shrink-0"
                            style={assigned ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                          >
                            {assigned ? 'Выбран' : 'Выбрать'}
                          </button>
                        </div>
                        {assigned && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs ${sub}`}>%</span>
                            <input type="number" step="0.00001" min={0} max={40} value={assigned.percent === '' ? '' : assigned.percent}
                              onChange={e => { const r = e.target.value; if (r === '') { setAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: '' } : item)); return; } const n = parseFloat(r); if (!isNaN(n)) { setAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.min(40, Math.max(0, n)) } : item)); } }}
                              onBlur={() => setAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: item.percent === '' ? 0 : item.percent } : item))}
                              className={`flex-1 ${inputCls} py-1.5`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Итого ── */}
              {addServiceDraft.serviceId && (
                <>
                  <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                  <div className={`${glass} rounded-2xl p-4 space-y-2`}>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>Итого</div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${sub}`}>Клиент заплатит</span>
                      <span className="text-sm font-semibold">{addServiceDraft.price.toLocaleString('ru')} ₽</span>
                    </div>
                    {addServiceWorkers.length > 0 && addServiceWorkers.map(item => {
                      const w = masterWorkers.find(wk => wk.id === item.id);
                      const pct = item.percent === '' ? 0 : item.percent;
                      const earned = Math.round(addServiceDraft.price * pct / 100);
                      return (
                        <div key={item.id} className="flex justify-between items-center">
                          <span className={`text-sm ${sub}`}>{w?.name || 'Мастер'} · {pct}%</span>
                          <span className="text-sm font-medium text-green-500">{earned.toLocaleString('ru')} ₽</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {addServiceError && <div className="text-xs text-red-500 mt-2">{addServiceError}</div>}

              <div className="flex gap-2 mt-4">
                <button onClick={closeAddServiceModal} className={`flex-1 py-3 rounded-2xl text-sm font-medium ${glass}`}>Отмена</button>
                <button onClick={handleAddService} disabled={!addServiceDraft.serviceId || addServiceSaving} className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]" style={{ background: primary }}>
                  {addServiceSaving ? 'Сохранение...' : 'Добавить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
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
                          <input type="number" step="0.00001" min={0} max={40} value={assigned.percent === '' ? '' : assigned.percent}
                            onChange={e => { const r = e.target.value; if (r === '') { setAssignedWorkers(p => p.map(aw => aw.id === worker.id ? { ...aw, percent: '' } : aw)); return; } const n = parseFloat(r); if (!isNaN(n)) { setAssignedWorkers(p => p.map(aw => aw.id === worker.id ? { ...aw, percent: Math.min(40, Math.max(0, n)) } : aw)); } }}
                            onBlur={() => setAssignedWorkers(p => p.map(aw => aw.id === worker.id ? { ...aw, percent: aw.percent === '' ? 0 : aw.percent } : aw))}
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
                    value={completeAmount === '0' ? '' : completeAmount}
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
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Способ оплаты</label>
                    <select
                      className={selectCls}
                      value={completePaymentType}
                      onChange={e => {
                        setCompleteError(null);
                        setCompletePaymentType(e.target.value as 'cash' | 'card' | 'online');
                      }}
                    >
                      <option value="cash">Наличные</option>
                      <option value="card">Карта</option>
                      <option value="online">Онлайн</option>
                    </select>
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
                        <select
                          className={selectCls}
                          value={editBookingDraft.time}
                          onChange={e => {
                            setEditBookingError(null);
                            setEditBookingDraft((current) => ({ ...current, time: e.target.value }));
                          }}
                        >
                          {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>{editBookingLocationLabel}</label>
                      <select
                        className={selectCls}
                        value={editBookingDraft.box}
                        onChange={e => {
                          setEditBookingError(null);
                          setEditBookingDraft((current) => ({ ...current, box: e.target.value }));
                        }}
                      >
                        {editBookingBoxes.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Имя клиента</label>
                    <input
                      className={inputCls}
                      placeholder="Имя"
                      value={editBookingDraft.clientName}
                      onChange={e => setEditBookingDraft((current) => ({ ...current, clientName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Телефон</label>
                    <input
                      className={inputCls}
                      placeholder="+7..."
                      value={editBookingDraft.clientPhone}
                      onChange={e => setEditBookingDraft((current) => ({ ...current, clientPhone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Автомобиль</label>
                    <input
                      className={inputCls}
                      placeholder="Марка модель"
                      value={editBookingDraft.car}
                      onChange={e => setEditBookingDraft((current) => ({ ...current, car: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Номер</label>
                    <input
                      className={inputCls}
                      placeholder="А123БВ77"
                      value={editBookingDraft.plate}
                      onChange={e => setEditBookingDraft((current) => ({ ...current, plate: e.target.value }))}
                    />
                  </div>
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
              {editModalMode !== 'reschedule' && (
                <button onClick={handleDeleteBooking} className={`w-full mt-2 py-3 rounded-xl text-sm font-medium ${glass} text-red-500 hover:bg-red-500/10 transition-colors`}>
                  <Trash2 size={15} className="inline mr-1.5 -mt-0.5" />Удалить запись
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE CLIENT MODAL */}
      <AnimatePresence>
        {showCreateClient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0 z-10" style={{ background: surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <h3 className="font-semibold">Новый клиент</h3>
                <button
                  onClick={() => {
                    setShowCreateClient(false);
                    setCreateClientErrors({});
                  }}
                  className={`p-2 rounded-xl ${glass}`}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label: 'Имя', key: 'name', placeholder: 'Иван Иванов', type: 'text' },
                  { label: 'Телефон (необязательно)', key: 'phone', placeholder: '+7 (___) ___-__-__', type: 'tel' },
                  { label: 'Автомобиль', key: 'car', placeholder: 'Lada Vesta', type: 'text' },
                  { label: 'Госномер', key: 'plate', placeholder: 'A123BC777', type: 'text' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className={`text-xs ${sub} block mb-1`}>{field.label}</label>
                    <input
                      className={`${inputCls} ${createClientErrors[field.key as keyof typeof createClientErrors] ? 'border-red-400' : ''}`}
                      type={field.type}
                      placeholder={field.placeholder}
                      maxLength={field.key === 'plate' ? 9 : undefined}
                      value={(createClientForm as any)[field.key]}
                      onChange={(event) => {
                        const nextValue = field.key === 'plate' ? normalizePlateInput(event.target.value) : event.target.value;
                        setCreateClientForm((current) => ({ ...current, [field.key]: nextValue }));
                        setCreateClientErrors((current) => ({ ...current, [field.key]: undefined, general: undefined }));
                      }}
                    />
                    {(field.key === 'name' && createClientErrors.name) && <div className="mt-1 text-xs text-red-500">{createClientErrors.name}</div>}
                    {(field.key === 'phone' && createClientErrors.phone) && <div className="mt-1 text-xs text-red-500">{createClientErrors.phone}</div>}
                    {(field.key === 'car' && createClientErrors.car) && <div className="mt-1 text-xs text-red-500">{createClientErrors.car}</div>}
                    {(field.key === 'plate' && createClientErrors.plate) && <div className="mt-1 text-xs text-red-500">{createClientErrors.plate}</div>}
                  </div>
                ))}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Заметка</label>
                  <input
                    className={inputCls}
                    placeholder="Например: пришёл из Instagram"
                    value={createClientForm.notes}
                    onChange={(event) => setCreateClientForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </div>
                <div className={`rounded-2xl px-3 py-3 text-sm ${glass}`}>
                  Клиент сможет войти в Mini App по этому телефону и увидит записи, созданные для этой карточки.
                </div>
                {createClientErrors.general && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} />{createClientErrors.general}</div>
                )}
              </div>
              <div className="p-4">
                <button
                  onClick={() => { void handleCreateClient(); }}
                  disabled={createClientSaving}
                  className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50"
                  style={{ background: primary }}
                >
                  {createClientSaving ? 'Сохранение...' : 'Создать клиента'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW BOOKING MODAL */}
      <AnimatePresence>
        {showNewBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl w-full max-w-sm relative flex flex-col`}>
              {/* Sticky header — always visible while scrolling */}
              <div className="sticky top-0 z-10 p-4 border-b flex justify-between items-center shrink-0" style={{ background: surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Новая запись</h3>
                <button onClick={closeNewBookingModal} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              {/* Scrollable content container */}
              <div
                className="overflow-y-auto"
                style={{ maxHeight: window.innerWidth < 768 ? `${modalMaxHeight}px` : undefined }}
              >
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center z-10" style={{ background: isDark ? 'rgba(14,22,36,0.95)' : 'rgba(255,255,255,0.95)' }}>
                    <div className="text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${primary}20` }}>
                        <Check size={28} style={{ color: primary }} />
                      </motion.div>
                      <div className="font-semibold">Запись сохранена!</div>
                      <div className={`text-sm ${sub} mt-1`}>{saveSuccess === 'notify' ? 'Мастера уведомлены' : STATUS_LABELS[newBookingForm.status]}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="p-4 space-y-3">
                {[
                  { label: 'Клиент (необязательно)', key: 'clientName', placeholder: 'Введите имя клиента', type: 'text' },
                  { label: 'Телефон (необязательно)', key: 'clientPhone', placeholder: '+7 (___) ___-__-__', type: 'tel' },
                  { label: 'Автомобиль (необязательно)', key: 'car', placeholder: 'Lada Vesta', type: 'text' },
                  { label: 'Номер (необязательно)', key: 'plate', placeholder: 'A123BC777', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className={`text-xs ${sub} block mb-1`}>{f.label}</label>
                    <input className={`${inputCls} ${newBookingErrors[f.key as keyof typeof newBookingErrors] ? 'border-red-400' : ''}`} type={f.type} placeholder={f.placeholder}
                      maxLength={f.key === 'plate' ? 9 : undefined}
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
                    setNewBookingForm(p => ({
                      ...p,
                      serviceId: e.target.value,
                      service: svc?.name || '',
                      price: svc?.price || 0,
                      duration: svc?.duration || 30,
                      box: defaultBoxForService(e.target.value, services, boxes),
                    }));
                    setNewBookingErrors((current) => ({ ...current, general: undefined }));
                  }}>
                    <option value="">Выберите услугу</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                    <input className={inputCls} type="number" value={numberInputValue(newBookingForm.price)} onChange={e => setNewBookingForm(p => ({ ...p, price: numberFromInput(e.target.value) }))} />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Длит. (мин)</label>
                    <input className={inputCls} type="number" value={numberInputValue(newBookingForm.duration)} onChange={e => {
                      const nextDuration = numberFromInput(e.target.value);
                      setNewBookingForm(p => ({
                        ...p,
                        duration: nextDuration,
                        box: pickDefaultBookingBox(p.serviceId, services, boxes, bookings, p.date, p.time, nextDuration),
                      }));
                    }} />
                  </div>
                </div>
                <div className={`rounded-2xl px-3 py-3 text-sm ${glass}`}>
                  Для базы клиентов можно выбрать статус "Прошлая завершённая": такая запись сохраняется в истории и будет видна клиенту после первого входа по этому телефону.
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Статус записи</label>
                  <select
                    className={selectCls}
                    value={newBookingForm.status}
                    onChange={(event) => {
                      const nextStatus = event.target.value as BookingStatus;
                      setNewBookingForm((current) => ({
                        ...current,
                        status: nextStatus,
                        date: nextStatus === 'admin_review' ? current.date : (current.date || todayLabel),
                        time: nextStatus === 'admin_review' ? current.time : (current.time || '10:00'),
                        box: bookingStatusRequiresScheduledSlot(nextStatus)
                          ? pickDefaultBookingBox(
                            current.serviceId,
                            services,
                            boxes,
                            bookings,
                            nextStatus === 'admin_review' ? current.date : (current.date || todayLabel),
                            nextStatus === 'admin_review' ? current.time : (current.time || '10:00'),
                            current.duration,
                          )
                          : current.box,
                      }));
                      setNewBookingErrors((current) => ({ ...current, date: undefined, time: undefined, general: undefined }));
                    }}
                  >
                    {NEW_BOOKING_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Дата (можно выбрать прошлую)</label>
                  <input className={inputCls} type="date" value={toISODate(newBookingForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    const nextDate = val ? formatDate(val) : e.target.value;
                    setNewBookingForm(p => ({
                      ...p,
                      date: nextDate,
                      box: pickDefaultBookingBox(p.serviceId, services, boxes, bookings, nextDate, p.time, p.duration),
                    }));
                    setNewBookingErrors((current) => ({ ...current, date: undefined, general: undefined }));
                  }} />
                  {newBookingErrors.date && <div className="mt-1 text-xs text-red-500">{newBookingErrors.date}</div>}
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Время (выпадающий список)</label>
                  <select className={selectCls} value={newBookingForm.time} onChange={e => {
                    const nextTime = e.target.value;
                    setNewBookingForm(p => ({
                      ...p,
                      time: nextTime,
                      box: pickDefaultBookingBox(p.serviceId, services, boxes, bookings, p.date, nextTime, p.duration),
                    }));
                    setNewBookingErrors((current) => ({ ...current, time: undefined, general: undefined }));
                  }}>
                    <option value="">--:--</option>
                    {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                  {newBookingErrors.time && <div className="mt-1 text-xs text-red-500">{newBookingErrors.time}</div>}
                </div>
                {(newBookingForm.date.trim() && newBookingForm.time.trim()) ? (
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>{newBookingLocationLabel}</label>
                    <select className={selectCls} value={newBookingForm.box} onChange={e => setNewBookingForm(p => ({ ...p, box: e.target.value }))}>
                      {bookingFormBoxes.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>{newBookingLocationLabel}</label>
                    <div className={`${inputCls} ${sub}`}>Помещение можно выбрать позже, когда будет согласовано время</div>
                  </div>
                )}
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
                                step="0.00001"
                                min={0}
                                max={40}
                                value={assigned.percent === '' ? '' : assigned.percent}
                                onChange={e => { const r = e.target.value; if (r === '') { setNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: '' } : item)); return; } const n = parseFloat(r); if (!isNaN(n)) { setNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.min(40, Math.max(0, n)) } : item)); } }}
                                onBlur={() => setNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: item.percent === '' ? 0 : item.percent } : item))}
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
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>Оплачено</span>
                  <input
                    type="checkbox"
                    checked={newBookingForm.paymentSettled}
                    onChange={(event) => setNewBookingForm((current) => ({ ...current, paymentSettled: event.target.checked }))}
                  />
                </label>
              </div>
              <div className="p-4 space-y-2">
                <button onClick={() => { void handleSaveNewBooking(true); }} disabled={!newBookingForm.serviceId || totalNewBookingPercent > 100 || newBookingSaving} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50 min-h-[44px] min-w-[44px]" style={{ background: primary }}>
                  {newBookingSaving ? 'Сохранение...' : 'Сохранить и уведомить'}
                </button>
                <button onClick={() => { void handleSaveNewBooking(false); }} disabled={!newBookingForm.serviceId || totalNewBookingPercent > 100 || newBookingSaving} className={`w-full py-3 rounded-2xl font-medium ${glass} disabled:opacity-50 min-h-[44px] min-w-[44px]`}>
                  Сохранить без уведомления
                </button>
              </div>
              </div>{/* end overflow-y-auto */}
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
