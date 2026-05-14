import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRef } from 'react';
import {
  Bell, Sun, Moon, Plus, X, Check, TrendingUp, Users, Box,
  Settings, BarChart3, ChevronRight, Download, DollarSign, Package,
  AlertCircle, Home, FileText, ArrowLeft, Building2, Sliders, Shield,
  Globe, Save, Eye, EyeOff, CalendarDays, RefreshCw, Phone, Wallet
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import { apiBlobUrl } from '../../api';
import { useApp, type AdminShiftInspection, type Booking, type BookingStatus, type EmployeeSetting, type OwnerDatabaseResetPreview, type PayrollEntryKind, type RegisteredClient, type Role, type ShiftChecklist } from '../../context/AppContext';
import { COMPLAINT_THRESHOLD, getComplaintPenaltyState, isComplaintActive } from '../../utils/complaints';
import { formatDate, getLastNDates, isPastTimeSlot, parseFlexibleDate } from '../../utils/date';
import {
  normalizePersonName,
  normalizePlateInput,
  normalizeVehicleInput,
  validatePersonName,
  validatePhoneValue,
  validatePlateValue,
  validateVehicleName,
} from '../../utils/validation';
import { useVisualViewport } from '../../utils/useVisualViewport';

type OwnerPage = 'dashboard' | 'calendar' | 'payroll' | 'stock' | 'reports' | 'settings';
type SettingsSection = null | 'company' | 'boxes' | 'services' | 'employees' | 'notifications' | 'integrations' | 'security';
type OwnerExportKind = 'report' | 'pdf';

const EXPENSE_CATEGORIES = ['Расходные материалы', 'Аренда', 'Коммунальные', 'Зарплаты', 'Оборудование', 'Прочее'];
const STOCK_CATEGORIES = ['Химия', 'Расходники', 'Оборудование'];
const STOCK_UNITS = ['л', 'кг', 'шт', 'фл', 'м', 'уп'];
const SERVICE_TYPE_OPTIONS = [
  { value: 'Мойка', label: 'Мойка', resourceGroup: 'wash' },
  { value: 'Детейлинг', label: 'Детейлинг', resourceGroup: 'detailing' },
  { value: 'Аренда бокса', label: 'Аренда бокса', resourceGroup: 'wash' },
] as const;
const OWNER_BOOKING_STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
  { value: 'confirmed', label: 'Подтверждена' },
  { value: 'scheduled', label: 'Запланирована' },
  { value: 'completed', label: 'Прошлая завершённая' },
  { value: 'admin_review', label: 'На уточнении' },
];
function employeeRoleLabel(role: 'admin' | 'worker' | 'accountant') {
  if (role === 'admin') return 'Администратор';
  if (role === 'accountant') return 'Бухгалтер';
  return 'Мастер';
}

function ownerServiceResourceGroup(serviceId: string, services: Array<{ id: string; resourceGroup?: string }>) {
  return services.find((service) => service.id === serviceId)?.resourceGroup || 'wash';
}

function ownerBookingBoxes(
  serviceId: string,
  services: Array<{ id: string; resourceGroup?: string }>,
  boxes: Array<{ id: string; name: string; resourceGroup: string; active: boolean; pricePerHour: number; description: string }>,
) {
  return ownerServiceResourceGroup(serviceId, services) === 'detailing'
    ? boxes.filter((box) => box.active && box.resourceGroup === 'detailing')
    : boxes.filter((box) => box.active && box.resourceGroup === 'wash');
}

function ownerLocationLabel(serviceId: string, services: Array<{ id: string; resourceGroup?: string }>) {
  return ownerServiceResourceGroup(serviceId, services) === 'detailing' ? 'Зона детейлинга' : 'Бокс мойки';
}

function serviceResourceGroupForCategory(category: string) {
  return SERVICE_TYPE_OPTIONS.find((option) => option.value === category)?.resourceGroup || 'wash';
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

export function OwnerApp() {
  const {
    session,
    isDark,
    toggleTheme,
    bookings,
    clients,
    expenses,
    addExpense,
    incomes,
    addIncome,
    stockItems,    addStockItem,
    writeOffStock,
    deleteStockItem,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    addBooking,
    addClient,
    addNotification,
    penalties,
    addPenalty,
    revokePenalty,
    revokeAllPenalties,
    workers,
    services: liveServices,
    boxes: liveBoxes,
    settings,
    saveOwnerCompany,
    saveBoxes,
    saveServices,
    saveWorkerSettings,
    createPayrollEntry,
    saveOwnerNotificationSettings,
    saveOwnerIntegrations,
    saveOwnerSecurity,
    updateClientCard,
    changePassword,
    requestOwnerDatabaseReset,
    approveOwnerDatabaseReset,
    executeOwnerDatabaseReset,
    hireWorker,
    fireWorker,
    staffProfile,
    switchRole,
    activeSessions,
    refreshActiveSessions,
    revokeSession,
    downloadOwnerExport,
      sendOwnerExportToTelegram,
      sendOwnerSummaryReport,
      dispatchOwnerReminders,
      remindAdminAboutInactiveClients,
      listAdminShiftInspections,
      listShiftChecklists,
      todayLabel,
      tomorrowLabel,
      upcomingDates,
  } = useApp();
  const isAccountant = session?.role === 'accountant';
  const modalMaxHeight = useVisualViewport();
  const financeRoleTitle = isAccountant ? 'Бухгалтер' : 'Владелец';
  const financeNotificationRole = isAccountant ? 'accountant' : 'owner';

  const [page, setPage] = useState<OwnerPage>('dashboard');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showFinancePanel, setShowFinancePanel] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState<string | null>(null);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);
  const [expenseAdded, setExpenseAdded] = useState(false);
  const [writeOffQty, setWriteOffQty] = useState('1');
  const [exportSuccess, setExportSuccess] = useState<{ title: string; subtitle: string } | null>(null);
  const [exportingKind, setExportingKind] = useState<OwnerExportKind | null>(null);
  const [sendingSummaryReport, setSendingSummaryReport] = useState<string | null>(null);
  const [bottomToast, setBottomToast] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [securitySaved, setSecuritySaved] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetCreatorCode, setResetCreatorCode] = useState('');
  const [resetConfirmationPhrase, setResetConfirmationPhrase] = useState('');
  const [resetRequestId, setResetRequestId] = useState<string | null>(null);
  const [resetPreview, setResetPreview] = useState<OwnerDatabaseResetPreview | null>(null);
  const [resetWarnings, setResetWarnings] = useState<string[]>([]);
  const [resetRequiredPhrase, setResetRequiredPhrase] = useState('');
  const [resetCodeExpiresAt, setResetCodeExpiresAt] = useState<Date | null>(null);
  const [resetFinalizeAfter, setResetFinalizeAfter] = useState<Date | null>(null);
  const [resetCountdown, setResetCountdown] = useState(0);
  const [resetStage, setResetStage] = useState<'idle' | 'code' | 'armed'>('idle');
  const [resetLoadingStep, setResetLoadingStep] = useState<'start' | 'approve' | 'execute' | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', category: EXPENSE_CATEGORIES[0], note: '' });
  const [incomeForm, setIncomeForm] = useState({ amount: '', source: '', note: '' });
  const [stockForm, setStockForm] = useState({ name: '', qty: '', unit: 'шт', unitPrice: '', category: STOCK_CATEGORIES[0] });
  const [bookingForm, setBookingForm] = useState({
    clientId: '',
    clientName: '',
    clientPhone: '',
    car: '',
    plate: '',
    service: liveServices[0]?.id || '',
    date: tomorrowLabel,
    time: '10:00',
    box: liveBoxes[0]?.name || 'Бокс 1',
    status: 'confirmed' as BookingStatus,
    paymentSettled: true,
    price: 0,
    duration: 30,
  });
  const [bookingWorkers, setBookingWorkers] = useState<{ id: string; percent: number }[]>([]);
  const [createClientSaving, setCreateClientSaving] = useState(false);
  const [createClientErrors, setCreateClientErrors] = useState<{ name?: string; phone?: string; car?: string; plate?: string; general?: string }>({});
  const [createClientForm, setCreateClientForm] = useState({ name: '', phone: '', car: '', plate: '', notes: '' });
  const [payrollDrafts, setPayrollDrafts] = useState<Record<string, { kind: PayrollEntryKind; amount: string; note: string }>>({});
  const [payrollEntryLoading, setPayrollEntryLoading] = useState<string | null>(null);

  // Settings state
  const [company, setCompany] = useState(settings.ownerCompany);
  const [boxes, setBoxes] = useState(liveBoxes);
  const [services, setServicesState] = useState(liveServices);
  const [employeeSettings, setEmployeeSettings] = useState<EmployeeSetting[]>(
    workers.map(worker => ({
      id: worker.id,
      role: worker.role === 'admin' || worker.role === 'accountant' ? worker.role : 'worker',
      name: worker.name,
      percent: worker.defaultPercent,
      salaryBase: worker.salaryBase,
      salaryPerShift: worker.salaryPerShift || 0,
      active: worker.active,
      telegramChatId: worker.telegramChatId,
    })),
  );
  const [notifSettings, setNotifSettings] = useState(settings.ownerNotificationSettings);
  const [integrations, setIntegrations] = useState(settings.ownerIntegrations);
  const [showPass, setShowPass] = useState(false);
  const [password, setPassword] = useState({ current: '', new_: '', confirm: '' });
  const [twoFactor, setTwoFactor] = useState(settings.ownerSecurity.twoFactor);
  const [penaltyForm, setPenaltyForm] = useState({ workerId: workers[0]?.id || '', title: '', reason: '' });
  const [newEmployee, setNewEmployee] = useState({
    role: 'worker' as 'admin' | 'worker' | 'accountant',
    name: '',
    login: '',
    password: '',
    percent: 40,
    salaryBase: 0,
    phone: '',
    email: '',
    telegramChatId: '',
  });
  const [employeeActionLoading, setEmployeeActionLoading] = useState<null | { type: 'hire' | 'fire'; workerId?: string }>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayLabel);
  const [clientSearch, setClientSearch] = useState('');
  const [clientCardDrafts, setClientCardDrafts] = useState<Record<string, { notes: string; debtBalance: string }>>({});
  const [savingClientId, setSavingClientId] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [sendingInactiveReminder, setSendingInactiveReminder] = useState(false);
  const [shiftChecklists, setShiftChecklists] = useState<ShiftChecklist[]>([]);
  const [adminShiftInspections, setAdminShiftInspections] = useState<AdminShiftInspection[]>([]);
  const [adminShiftPhotoUrls, setAdminShiftPhotoUrls] = useState<Record<string, string>>({});
  const adminShiftPhotoUrlsRef = useRef<Record<string, string>>({});

  // Quick booking modal state (task 9.1)
  const [showOwnerNewBooking, setShowOwnerNewBooking] = useState(false);
  const [ownerNewBookingForm, setOwnerNewBookingForm] = useState({
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
    status: 'admin_review' as BookingStatus,
  });
  const [ownerNewBookingWorkers, setOwnerNewBookingWorkers] = useState<{ id: string; percent: number }[]>([]);
  const [ownerNewBookingError, setOwnerNewBookingError] = useState<string | null>(null);
  const [ownerNewBookingSaving, setOwnerNewBookingSaving] = useState(false);
  const [ownerNewBookingErrors, setOwnerNewBookingErrors] = useState<{ clientName?: string; clientPhone?: string; car?: string; plate?: string; date?: string; time?: string; general?: string }>({});
  const [ownerNewBookingSaveSuccess, setOwnerNewBookingSaveSuccess] = useState<'notify' | 'silent' | null>(null);

  const clearOwnerResetFlow = () => {
    setResetPassword('');
    setResetCreatorCode('');
    setResetConfirmationPhrase('');
    setResetRequestId(null);
    setResetPreview(null);
    setResetWarnings([]);
    setResetRequiredPhrase('');
    setResetCodeExpiresAt(null);
    setResetFinalizeAfter(null);
    setResetCountdown(0);
    setResetStage('idle');
    setResetLoadingStep(null);
    setResetError(null);
    setResetInfo(null);
  };

  useEffect(() => setCompany(settings.ownerCompany), [settings.ownerCompany]);
  useEffect(() => setBoxes(liveBoxes), [liveBoxes]);
  useEffect(() => setServicesState(liveServices), [liveServices]);
  useEffect(() => {
    if (!bookingForm.service) return;
    const nextBoxes = ownerBookingBoxes(bookingForm.service, liveServices, liveBoxes);
    setBookingForm((current) => ({
      ...current,
      box: nextBoxes.find((box) => box.name === current.box)?.name || nextBoxes[0]?.name || current.box,
    }));
  }, [bookingForm.service, liveBoxes, liveServices]);
  useEffect(() => {
    setEmployeeSettings(
      workers.map(worker => ({
        id: worker.id,
        role: worker.role === 'admin' || worker.role === 'accountant' ? worker.role : 'worker',
        name: worker.name,
        percent: worker.defaultPercent,
        salaryBase: worker.salaryBase,
        salaryPerShift: worker.salaryPerShift || 0,
        active: worker.active,
        telegramChatId: worker.telegramChatId,
      })),
    );
    setPenaltyForm(current => ({
      ...current,
      workerId: workers.some((worker) => worker.id === current.workerId) ? current.workerId : workers[0]?.id || '',
    }));
    setPayrollDrafts((current) =>
      Object.fromEntries(
        workers.map((worker) => [
          worker.id,
          current[worker.id] || { kind: 'advance', amount: '', note: '' },
        ]),
      ),
    );
  }, [workers]);
  useEffect(() => setNotifSettings(settings.ownerNotificationSettings), [settings.ownerNotificationSettings]);
  useEffect(() => setIntegrations(settings.ownerIntegrations), [settings.ownerIntegrations]);
  useEffect(() => setTwoFactor(settings.ownerSecurity.twoFactor), [settings.ownerSecurity.twoFactor]);
  useEffect(() => {
    setClientCardDrafts(
      Object.fromEntries(
        clients.map((client) => [
          client.id,
          {
            notes: client.notes || '',
            debtBalance: String(client.debtBalance || 0),
          },
        ]),
      ),
    );
  }, [clients]);
  useEffect(() => {
    if (settingsSection !== 'security') {
      setSecurityError(null);
      setSecuritySaved(false);
      clearOwnerResetFlow();
    }
  }, [settingsSection]);
  useEffect(() => {
    if (page === 'settings' && settingsSection === 'security') {
      void refreshActiveSessions();
    }
  }, [page, settingsSection]);
  useEffect(() => {
    if (!resetFinalizeAfter) {
      setResetCountdown(0);
      return;
    }

    const syncCountdown = () => {
      const diffMs = resetFinalizeAfter.getTime() - Date.now();
      setResetCountdown(Math.max(0, Math.ceil(diffMs / 1000)));
    };

    syncCountdown();
    const intervalId = window.setInterval(syncCountdown, 250);
    return () => window.clearInterval(intervalId);
  }, [resetFinalizeAfter]);
  useEffect(() => {
    if (!selectedCalendarDate) {
      setSelectedCalendarDate(todayLabel);
    }
  }, [selectedCalendarDate, todayLabel]);
  useEffect(() => {
    if (page === 'stock') {
      void listShiftChecklists().then(setShiftChecklists);
      if (isAccountant) {
        setAdminShiftInspections([]);
      } else {
        void listAdminShiftInspections().then(setAdminShiftInspections);
      }
    }
  }, [isAccountant, page]);
  useEffect(() => {
    if (isAccountant && page === 'settings') {
      setPage('payroll');
      setSettingsSection(null);
    }
  }, [isAccountant, page]);

  const ownerNotifications = notifications.filter((notification) => notification.recipientRole === financeNotificationRole);
  const unreadCount = ownerNotifications.filter(n => !n.read).length;
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const todayBookings = bookings.filter(b => b.date === todayLabel);
  const latestShiftChecklists = shiftChecklists.slice(0, 10);
  const latestAdminShiftInspections = adminShiftInspections.slice(0, 8);
  const latestAdminShiftInspectionKey = latestAdminShiftInspections.map((inspection) => `${inspection.id}:${inspection.floorPhotoUrl}`).join('|');

  useEffect(() => {
    adminShiftPhotoUrlsRef.current = adminShiftPhotoUrls;
  }, [adminShiftPhotoUrls]);

  useEffect(() => {
    if (page !== 'stock') {
      setAdminShiftPhotoUrls((current) => {
        Object.values(current).forEach((url) => URL.revokeObjectURL(url));
        return {};
      });
      return;
    }

    let cancelled = false;
    const activeIds = new Set(latestAdminShiftInspections.map((inspection) => inspection.id));
    setAdminShiftPhotoUrls((current) => {
      const next: Record<string, string> = {};
      Object.entries(current).forEach(([id, url]) => {
        if (activeIds.has(id)) {
          next[id] = url;
        } else {
          URL.revokeObjectURL(url);
        }
      });
      return next;
    });

    const currentPhotoUrls = adminShiftPhotoUrlsRef.current;
    const missing = latestAdminShiftInspections.filter((inspection) => inspection.floorPhotoUrl && !currentPhotoUrls[inspection.id]);
    void Promise.all(
      missing.map(async (inspection) => ({
        id: inspection.id,
        url: await apiBlobUrl(inspection.floorPhotoUrl),
      })),
    ).then((loaded) => {
      if (cancelled) {
        loaded.forEach((item) => URL.revokeObjectURL(item.url));
        return;
      }
      setAdminShiftPhotoUrls((current) => {
        const next = { ...current };
        loaded.forEach((item) => {
          if (next[item.id]) {
            URL.revokeObjectURL(item.url);
            return;
          }
          next[item.id] = item.url;
        });
        return next;
      });
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [latestAdminShiftInspectionKey, page]);
  useEffect(() => () => {
    Object.values(adminShiftPhotoUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // Auto-scroll active field into view when visualViewport resizes (mobile keyboard opens)
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
  const bookingFormBoxes = ownerBookingBoxes(bookingForm.service, services, boxes);
  const bookingFormLocationLabel = ownerLocationLabel(bookingForm.service, services);
  const todayRevenue = todayBookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.price, 0);
  const totalRevenue = completedBookings.reduce((s, b) => s + b.price, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const profit = totalRevenue - totalExpenses;
  const averageCheck = completedBookings.length > 0 ? Math.round(totalRevenue / completedBookings.length) : 0;
  const activeBookings = bookings.filter((booking) => ['new', 'confirmed', 'scheduled', 'in_progress'].includes(booking.status));
  const pipelineCounts = {
    new: bookings.filter((booking) => booking.status === 'new').length,
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    scheduled: bookings.filter((booking) => booking.status === 'scheduled').length,
    inProgress: bookings.filter((booking) => booking.status === 'in_progress').length,
    noShow: bookings.filter((booking) => booking.status === 'no_show').length,
  };
  const totalStockValue = stockItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const payrollRows = workers.map(worker => {
    const workerPenalties = penalties.filter((penalty) => penalty.workerId === worker.id && isComplaintActive(penalty));
    const complaintState = getComplaintPenaltyState(worker.defaultPercent, workerPenalties);
    return {
      worker,
      payrollSummary: worker.payrollSummary,
      complaintState,
      recentPenalties: workerPenalties.slice(0, 3),
    };
  });
  const payrollTotal = payrollRows.reduce((sum, row) => sum + (row.payrollSummary?.balance || 0), 0);
  const formatComplaintDate = (value: Date) => value.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const resetPreviewRows = resetPreview ? [
    { label: 'Сохранятся владельцы', value: resetPreview.ownersPreserved },
    { label: 'Удалятся сотрудники', value: resetPreview.employeesDeleted },
    { label: 'Удалятся клиенты', value: resetPreview.clientsDeleted },
    { label: 'Удалятся записи', value: resetPreview.bookingsDeleted },
    { label: 'Удалятся уведомления', value: resetPreview.notificationsDeleted },
    { label: 'Удалятся позиции склада', value: resetPreview.stockItemsDeleted },
    { label: 'Удалятся расходы', value: resetPreview.expensesDeleted },
    { label: 'Удалятся жалобы', value: resetPreview.penaltiesDeleted },
    { label: 'Закроются лишние сессии', value: resetPreview.sessionsClosed },
    { label: 'Сбросятся услуги', value: resetPreview.servicesReset },
    { label: 'Сбросятся боксы', value: resetPreview.boxesReset },
    { label: 'Сбросится график', value: resetPreview.scheduleReset },
    { label: 'Пересоздадутся настройки', value: resetPreview.settingsReset },
  ] : [];
  const resetExecuteLocked = resetStage !== 'armed' || !resetRequestId || resetCountdown > 0 || resetLoadingStep === 'execute';

  const glass = isDark ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm';
  const bg = isDark ? 'bg-[#0B1226]' : 'bg-[#F6F7FA]';
  const text = isDark ? 'text-[#E6EEF8]' : 'text-[#0B1226]';
  const sub = isDark ? 'text-[#9AA6B2]' : 'text-[#6B7280]';
  const primary = isDark ? '#4AA8FF' : '#0A84FF';
  const accent = isDark ? '#5DD68F' : '#34C759';
  const surface = isDark ? '#0E1624' : '#ffffff';
  const inputCls = `${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-white border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const selectCls = `${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8]' : 'bg-white border-black/10 text-[#0B1226]'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const tooltipStyle = { background: surface, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, color: text };
  const createDraftId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleAddBoxDraft = () => {
    setBoxes((current) => [
      ...current,
      {
        id: createDraftId('box'),
        name: `Бокс ${current.length + 1}`,
        resourceGroup: 'wash',
        pricePerHour: 0,
        active: true,
        description: '',
      },
    ]);
  };

  const handleRemoveBoxDraft = (boxId: string) => {
    setBoxes((current) => current.filter((box) => box.id !== boxId));
  };

  const handleAddServiceDraft = () => {
    setServicesState((current) => [
      ...current,
      {
        id: createDraftId('service'),
        name: 'Новая услуга',
        category: 'Мойка',
        resourceGroup: 'wash',
        price: 0,
        duration: 30,
        desc: '',
        active: true,
      },
    ]);
  };

  const handleRemoveServiceDraft = (serviceId: string) => {
    setServicesState((current) => current.filter((service) => service.id !== serviceId));
  };

  const handleHireWorker = async () => {
    const name = newEmployee.name.trim();
    const login = newEmployee.login.trim();
    const password = newEmployee.password.trim();
    const employeeLabel = employeeRoleLabel(newEmployee.role);

    if (!name || !login || !password) {
      setBottomToast('\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0438\u043c\u044f, \u043b\u043e\u0433\u0438\u043d \u0438 \u043f\u0430\u0440\u043e\u043b\u044c \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }

    try {
      setEmployeeActionLoading({ type: 'hire' });
      await hireWorker({
        role: newEmployee.role,
        name,
        login,
        password,
        percent: newEmployee.percent,
        salaryBase: newEmployee.salaryBase,
        phone: newEmployee.phone.trim(),
        email: newEmployee.email.trim(),
        telegramChatId: newEmployee.telegramChatId.trim(),
      });

      setNewEmployee({
        role: 'worker',
        name: '',
        login: '',
        password: '',
        percent: 40,
        salaryBase: 0,
        phone: '',
        email: '',
        telegramChatId: '',
      });
      setBottomToast(`${employeeLabel} ${name} \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d. \u041b\u043e\u0433\u0438\u043d: ${login}`);
      setTimeout(() => setBottomToast(null), 4000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : `\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c ${employeeLabel.toLowerCase()}`);
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setEmployeeActionLoading(null);
    }
  };

  const handleSaveSettings = async () => {
    if (settingsSection === 'security') {
      const wantsPasswordChange = Boolean(password.current || password.new_ || password.confirm);
      setSecurityError(null);
      setSecuritySaved(false);

      if (wantsPasswordChange) {
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
      }

      try {
        await saveOwnerSecurity({ twoFactor });
        if (wantsPasswordChange) {
          await changePassword(password.current, password.new_);
          setPassword({ current: '', new_: '', confirm: '' });
        }
        setSecuritySaved(true);
        setTimeout(() => setSecuritySaved(false), 2000);
      } catch (error) {
        setSecurityError(error instanceof Error ? error.message : 'Не удалось сохранить настройки безопасности');
      }
      return;
    }

    if (settingsSection === 'company') await saveOwnerCompany(company);
    if (settingsSection === 'boxes') await saveBoxes(boxes);
    if (settingsSection === 'services') await saveServices(services);
    if (settingsSection === 'employees') await saveWorkerSettings(employeeSettings);
    if (settingsSection === 'notifications') await saveOwnerNotificationSettings(notifSettings);
    if (settingsSection === 'integrations') await saveOwnerIntegrations(integrations);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleStartOwnerReset = async () => {
    if (!resetPassword.trim()) {
      setResetError('Введите текущий пароль владельца, чтобы запросить код создателя.');
      return;
    }

    try {
      setResetLoadingStep('start');
      setResetError(null);
      setResetInfo(null);
      const response = await requestOwnerDatabaseReset(resetPassword.trim());
      setResetStage('code');
      setResetRequestId(response.requestId);
      setResetPreview(response.preview);
      setResetWarnings(response.warnings);
      setResetRequiredPhrase(response.confirmationPhrase);
      setResetCodeExpiresAt(response.creatorCodeExpiresAt);
      setResetFinalizeAfter(null);
      setResetCreatorCode('');
      setResetConfirmationPhrase('');
      setResetPassword('');
      setResetInfo(response.message);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Не удалось запросить код подтверждения.');
    } finally {
      setResetLoadingStep(null);
    }
  };

  const handleApproveOwnerReset = async () => {
    if (!resetRequestId) {
      setResetError('Сначала заново запросите код создателя.');
      return;
    }
    if (!resetCreatorCode.trim()) {
      setResetError('Введите код, который пришёл создателю в Telegram.');
      return;
    }
    if (!resetConfirmationPhrase.trim()) {
      setResetError('Введите контрольную фразу подтверждения.');
      return;
    }

    try {
      setResetLoadingStep('approve');
      setResetError(null);
      setResetInfo(null);
      const response = await approveOwnerDatabaseReset(resetRequestId, resetCreatorCode.trim(), resetConfirmationPhrase);
      setResetStage('armed');
      setResetPreview(response.preview);
      setResetWarnings(response.warnings);
      setResetFinalizeAfter(response.finalizeAfter);
      setResetCodeExpiresAt(null);
      setResetCreatorCode('');
      setResetInfo(response.message);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Не удалось подтвердить очистку.');
    } finally {
      setResetLoadingStep(null);
    }
  };

  const handleExecuteOwnerReset = async () => {
    if (!resetRequestId) {
      setResetError('Запрос на очистку потерян. Начните заново.');
      return;
    }

    try {
      setResetLoadingStep('execute');
      setResetError(null);
      const response = await executeOwnerDatabaseReset(resetRequestId);
      clearOwnerResetFlow();
      setBottomToast(response.message);
      setTimeout(() => setBottomToast(null), 5000);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Не удалось выполнить очистку CRM.');
    } finally {
      setResetLoadingStep(null);
    }
  };

  const handleAddExpense = () => {
    if (!expenseForm.title || !expenseForm.amount) return;
    const title = expenseForm.title;
    const amount = Number(expenseForm.amount);
    addExpense({ title, amount, category: expenseForm.category, date: todayLabel, note: expenseForm.note });
    setExpenseAdded(true);
    setTimeout(() => {
      setExpenseAdded(false);
      setShowAddExpense(false);
      setExpenseForm({ title: '', amount: '', category: EXPENSE_CATEGORIES[0], note: '' });
      setBottomToast(`Расход "${title}" добавлен на сумму ${amount.toLocaleString('ru')} ₽`);
      setTimeout(() => setBottomToast(null), 4000);
    }, 1800);
  };

  const handleAddStock = () => {
    if (!stockForm.name || !stockForm.qty) return;
    addStockItem({ name: stockForm.name, qty: Number(stockForm.qty), unit: stockForm.unit, unitPrice: Number(stockForm.unitPrice), category: stockForm.category });
    setShowAddStock(false);
    setStockForm({ name: '', qty: '', unit: '\u0448\u0442', unitPrice: '', category: STOCK_CATEGORIES[0] });
    setBottomToast(`\u0422\u043e\u0432\u0430\u0440 "${stockForm.name}" \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u043d\u0430 \u0441\u043a\u043b\u0430\u0434`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleWriteOff = () => {
    if (!showWriteOff) return;
    const item = stockItems.find(s => s.id === showWriteOff);
    writeOffStock(showWriteOff, Number(writeOffQty));
    setShowWriteOff(null);
    setWriteOffQty('1');
    if (item) {
      setBottomToast(`Списано: ${item.name} — ${writeOffQty} ${item.unit}`);
      setTimeout(() => setBottomToast(null), 3000);
    }
  };

  const handleExport = async (kind: OwnerExportKind) => {
    const labels = {
      report: { noun: 'Excel-файл' },
      pdf: { noun: 'PDF' },
    } as const;

    try {
      setExportingKind(kind);
      const fileName = await downloadOwnerExport(kind);
      let subtitle = `Файл ${fileName} скачан`;

      try {
        const delivery = await sendOwnerExportToTelegram(kind);
        subtitle = `${subtitle} и отправлен в Telegram`;
        setBottomToast(delivery.message);
        setTimeout(() => setBottomToast(null), 5000);
      } catch (deliveryError) {
        const deliveryMessage = deliveryError instanceof Error ? deliveryError.message : 'Не удалось отправить файл в Telegram';
        setBottomToast(`${labels[kind].noun} скачан, но отправка в Telegram не удалась: ${deliveryMessage}`);
        setTimeout(() => setBottomToast(null), 5000);
      }

      setExportSuccess({
        title: `${labels[kind].noun} экспортирован`,
        subtitle,
      });
      setTimeout(() => setExportSuccess(null), 3200);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Не удалось сформировать экспорт';
      setBottomToast(message);
      setTimeout(() => setBottomToast(null), 5000);
    } finally {
      setExportingKind(null);
    }
  };

  const handleSummaryReport = async (period: 'daily' | 'weekly', segment: 'wash' | 'detailing') => {
    const key = `${period}-${segment}`;
    try {
      setSendingSummaryReport(key);
      const message = await sendOwnerSummaryReport(period, segment);
      setBottomToast(message);
      setTimeout(() => setBottomToast(null), 5000);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Не удалось отправить сводный отчёт';
      setBottomToast(message);
      setTimeout(() => setBottomToast(null), 5000);
    } finally {
      setSendingSummaryReport(null);
    }
  };

  const handleSaveClientCard = async (clientId: string) => {
    const draft = clientCardDrafts[clientId];
    if (!draft) return;
    try {
      setSavingClientId(clientId);
      await updateClientCard(clientId, {
        notes: draft.notes,
        debtBalance: Number(draft.debtBalance || 0),
      });
      setBottomToast('Карточка клиента сохранена');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось сохранить карточку клиента');
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setSavingClientId(null);
    }
  };

  const handleSavePayrollSettings = async () => {
    try {
      await saveWorkerSettings(employeeSettings);
      setBottomToast('Настройки зарплат сохранены');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось сохранить зарплаты');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleCreatePayrollEntry = async (workerId: string, workerName: string) => {
    const draft = payrollDrafts[workerId];
    const amount = Number(draft?.amount || 0);
    if (!draft) return;
    if (!Number.isFinite(amount) || amount === 0) {
      setBottomToast('Укажите сумму операции по зарплате');
      setTimeout(() => setBottomToast(null), 3000);
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
      setBottomToast(`Операция по зарплате для ${workerName} сохранена`);
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось сохранить операцию по зарплате');
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setPayrollEntryLoading(null);
    }
  };

  const handleDispatchReminders = async () => {
    try {
      setSendingReminders(true);
      const response = await dispatchOwnerReminders({ targetDate: tomorrowLabel, force: true });
      setBottomToast(
        `${response.message} Клиентам: ${response.clientReminders}, мастерам: ${response.workerReminders}, Telegram: ${response.telegramDelivered}.`,
      );
      setTimeout(() => setBottomToast(null), 5000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось отправить напоминания');
      setTimeout(() => setBottomToast(null), 5000);
    } finally {
      setSendingReminders(false);
    }
  };

  const handleInactiveClientsReminder = async () => {
    try {
      setSendingInactiveReminder(true);
      const message = await remindAdminAboutInactiveClients();
      setBottomToast(message);
      setTimeout(() => setBottomToast(null), 5000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось отправить задачу админу');
      setTimeout(() => setBottomToast(null), 5000);
    } finally {
      setSendingInactiveReminder(false);
    }
  };

  const handleAddPenalty = async () => {
    if (!penaltyForm.workerId || !penaltyForm.title || !penaltyForm.reason) return;
    await addPenalty({
      workerId: penaltyForm.workerId,
      title: penaltyForm.title,
      reason: penaltyForm.reason,
    });
    const workerName = workers.find((worker) => worker.id === penaltyForm.workerId)?.name || 'мастер';
    setPenaltyForm({ workerId: penaltyForm.workerId, title: '', reason: '' });
    setBottomToast(`Жалоба сохранена для ${workerName}`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleRevokePenalty = async (penaltyId: string, workerName: string) => {
    await revokePenalty(penaltyId);
    setBottomToast(`Жалоба снята досрочно для ${workerName}`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleRevokeAllPenalties = async (workerId: string, workerName: string) => {
    const confirmed = window.confirm(`Снять все активные жалобы у мастера "${workerName}"?`);
    if (!confirmed) return;
    await revokeAllPenalties(workerId);
    setBottomToast(`Все активные жалобы сняты для ${workerName}`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleFireWorker = async (workerId: string, workerName: string) => {
    const employee = employeeSettings.find((item) => item.id === workerId);
    const employeeTitle = employee ? employeeRoleLabel(employee.role) : 'Сотрудник';
    const confirmed = window.confirm(`\u0423\u0432\u043e\u043b\u0438\u0442\u044c \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430 "${workerName}"? \u0414\u043e\u0441\u0442\u0443\u043f \u0431\u0443\u0434\u0435\u0442 \u043e\u0442\u043a\u043b\u044e\u0447\u0451\u043d, \u0430 \u0431\u0443\u0434\u0443\u0449\u0438\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u0441\u043d\u0438\u043c\u0443\u0442\u0441\u044f \u0441 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430.`);
    if (!confirmed) return;

    try {
      setEmployeeActionLoading({ type: 'fire', workerId });
      await fireWorker(workerId);
      setBottomToast(`${employeeTitle} ${workerName} \u0443\u0432\u043e\u043b\u0435\u043d`);
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : `\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0432\u043e\u043b\u0438\u0442\u044c ${employeeTitle.toLowerCase()}`);
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setEmployeeActionLoading(null);
    }
  };

  const resetBookingForm = () => {
    setBookingWorkers([]);
    setBookingForm({
      clientId: '',
      clientName: '',
      clientPhone: '',
      car: '',
      plate: '',
      service: services[0]?.id || 's1',
      date: tomorrowLabel,
      time: '10:00',
      box: ownerBookingBoxes(services[0]?.id || '', services, boxes)[0]?.name || 'Бокс 1',
      status: 'confirmed',
      paymentSettled: true,
      price: 0,
      duration: 30,
    });
  };

  const openBookingForClient = (client: RegisteredClient, status: BookingStatus = 'completed') => {
    const historyDate = new Date();
    historyDate.setDate(historyDate.getDate() - 1);
    setBookingWorkers([]);
    setBookingForm({
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      car: client.car || '',
      plate: client.plate || '',
      service: services[0]?.id || 's1',
      date: status === 'completed' ? formatDate(historyDate) : tomorrowLabel,
      time: '10:00',
      box: ownerBookingBoxes(services[0]?.id || '', services, boxes)[0]?.name || 'Бокс 1',
      status,
      paymentSettled: true,
      price: 0,
      duration: 30,
    });
    setShowCreateBooking(true);
  };

  const handleCreateClient = async () => {
    const nextErrors: { name?: string; phone?: string; car?: string; plate?: string; general?: string } = {};
    const nameError = validatePersonName(createClientForm.name);
    if (nameError) nextErrors.name = nameError;
    // Телефон необязателен — валидируем только если введён
    if (createClientForm.phone.trim()) {
      const phoneError = validatePhoneValue(createClientForm.phone);
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
      setBottomToast('Клиент создан. Можно добавить прошлую запись в его историю.');
      setTimeout(() => setBottomToast(null), 3500);
      openBookingForClient(created);
    } catch (error) {
      setCreateClientErrors({
        general: error instanceof Error ? error.message : 'Не удалось создать клиента',
      });
    } finally {
      setCreateClientSaving(false);
    }
  };

  const handleCreateBooking = async () => {
    const svc = services.find((service) => service.id === bookingForm.service);
    const clientName = normalizePersonName(bookingForm.clientName);
    const clientPhone = bookingForm.clientPhone.trim();
    const normalizedCar = normalizeVehicleInput(bookingForm.car);
    const normalizedPlate = normalizePlateInput(bookingForm.plate);
    if (!svc) {
      setBottomToast('Выберите услугу');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    if (!clientName) {
      setBottomToast('Укажите имя клиента');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    if (bookingForm.status === 'completed') {
      const parsedDate = parseFlexibleDate(bookingForm.date.trim());
      if (!parsedDate || !bookingForm.time.trim()) {
        setBottomToast('Для прошлой записи укажите дату и время');
        setTimeout(() => setBottomToast(null), 3000);
        return;
      }
      if (!isPastTimeSlot(formatDate(parsedDate), bookingForm.time.trim())) {
        setBottomToast('Для прошлой записи укажите прошедшие дату и время');
        setTimeout(() => setBottomToast(null), 3000);
        return;
      }
    }
    const selectedWorkers = bookingWorkers
      .map((item) => {
        const worker = workers.find((candidate) => candidate.id === item.id);
        return worker ? { workerId: worker.id, workerName: worker.name, percent: item.percent } : null;
      })
      .filter((item): item is { workerId: string; workerName: string; percent: number } => Boolean(item));

    try {
      const booking = await addBooking({
        clientId: bookingForm.clientId,
        clientName,
        clientPhone,
        service: svc.name,
        serviceId: bookingForm.service,
        date: bookingForm.date.trim(),
        time: bookingForm.time.trim(),
        duration: bookingForm.duration || svc.duration,
        price: bookingForm.price || svc.price,
        status: bookingForm.status,
        workers: selectedWorkers,
        box: bookingForm.box.trim() || 'По согласованию',
        paymentType: 'cash',
        paymentSettled: bookingForm.status === 'completed' ? bookingForm.paymentSettled : true,
        car: normalizedCar,
        plate: normalizedPlate,
        notifyWorkers: selectedWorkers.length > 0 && bookingForm.status !== 'completed',
      });
      if (bookingForm.status !== 'completed') {
        await addNotification({ recipientRole: 'client', recipientId: booking.clientId, message: `Создана запись на ${svc.name} — ${bookingForm.date} в ${bookingForm.time}`, read: false });
      }
      setShowCreateBooking(false);
      resetBookingForm();
      setBottomToast(bookingForm.status === 'completed' ? 'Прошлая запись добавлена в историю клиента' : 'Запись создана и клиент уведомлён');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось создать запись');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  // Quick booking modal helpers (task 9.1)
  const ownerNewBookingMasterWorkers = workers.filter((worker) => worker.role === 'worker');
  const ownerNewBookingSelectableDates = Array.from(new Set([
    todayLabel,
    tomorrowLabel,
    ...upcomingDates.slice(0, 7),
    ...bookings.map((booking) => booking.date).filter(Boolean),
  ])).slice(0, 10);
  const ownerNewBookingFormBoxes = ownerBookingBoxes(ownerNewBookingForm.serviceId, services, boxes);
  const ownerNewBookingLocationLabel = ownerLocationLabel(ownerNewBookingForm.serviceId, services);
  const totalOwnerNewBookingPercent = ownerNewBookingWorkers.reduce((sum, worker) => sum + worker.percent, 0);

  const resetOwnerNewBookingDraft = () => {
    setOwnerNewBookingSaveSuccess(null);
    setOwnerNewBookingSaving(false);
    setOwnerNewBookingErrors({});
    setOwnerNewBookingError(null);
    setOwnerNewBookingWorkers([]);
    setOwnerNewBookingForm({
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
    });
  };

  const closeOwnerNewBookingModal = () => {
    setShowOwnerNewBooking(false);
    resetOwnerNewBookingDraft();
  };

  const validateOwnerNewBookingForm = () => {
    const nextErrors: { clientName?: string; clientPhone?: string; car?: string; plate?: string; date?: string; time?: string; general?: string } = {};
    if (normalizePersonName(ownerNewBookingForm.clientName)) {
      const nameError = validatePersonName(ownerNewBookingForm.clientName);
      if (nameError) nextErrors.clientName = nameError;
    }
    if (ownerNewBookingForm.clientPhone.trim()) {
      const phoneError = validatePhoneValue(ownerNewBookingForm.clientPhone);
      if (phoneError) nextErrors.clientPhone = phoneError;
    }
    if (normalizeVehicleInput(ownerNewBookingForm.car)) {
      const carError = validateVehicleName(ownerNewBookingForm.car);
      if (carError) nextErrors.car = carError;
    }
    if (normalizePlateInput(ownerNewBookingForm.plate)) {
      const plateError = validatePlateValue(ownerNewBookingForm.plate);
      if (plateError) nextErrors.plate = plateError;
    }
    const hasDate = Boolean(ownerNewBookingForm.date.trim());
    const hasTime = Boolean(ownerNewBookingForm.time.trim());
    const requiresScheduledSlot = ['new', 'confirmed', 'scheduled', 'in_progress'].includes(ownerNewBookingForm.status);
    if (requiresScheduledSlot || ownerNewBookingForm.status === 'completed') {
      if (!hasDate) nextErrors.date = 'Укажите дату записи';
      if (!hasTime) nextErrors.time = 'Укажите время записи';
      if (hasDate && hasTime && ownerNewBookingForm.status === 'completed') {
        const parsedDate = parseFlexibleDate(ownerNewBookingForm.date.trim());
        if (!parsedDate) {
          nextErrors.date = 'Укажите дату в формате ДД.ММ.ГГГГ';
        } else if (!isPastTimeSlot(formatDate(parsedDate), ownerNewBookingForm.time.trim())) {
          nextErrors.time = 'Для прошлой записи укажите прошедшие дату и время';
        }
      }
    } else if (hasDate || hasTime) {
      if (!hasDate) nextErrors.date = 'Укажите дату или очистите дату и время';
      else if (!hasTime) nextErrors.time = 'Укажите время или очистите дату и время';
    }
    if (!ownerNewBookingForm.serviceId) nextErrors.general = 'Выберите услугу';
    if (requiresScheduledSlot && !ownerNewBookingForm.box.trim()) nextErrors.general = 'Укажите помещение для записи';
    if (totalOwnerNewBookingPercent > 100) nextErrors.general = 'Сумма процентов мастеров не должна превышать 100%';
    setOwnerNewBookingErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveOwnerNewBooking = async (notify: boolean) => {
    setOwnerNewBookingErrors({});
    setOwnerNewBookingError(null);
    if (!validateOwnerNewBookingForm()) return;
    const svc = services.find((s) => s.id === ownerNewBookingForm.serviceId);
    const normalizedClientName = normalizePersonName(ownerNewBookingForm.clientName);
    const normalizedCar = normalizeVehicleInput(ownerNewBookingForm.car);
    const normalizedPlate = normalizePlateInput(ownerNewBookingForm.plate);
    const hasDateTime = Boolean(ownerNewBookingForm.date.trim() && ownerNewBookingForm.time.trim());
    const parsedDate = hasDateTime ? parseFlexibleDate(ownerNewBookingForm.date.trim()) : null;
    if (hasDateTime && !parsedDate) {
      setOwnerNewBookingErrors({ date: 'Укажите дату в формате ДД.ММ.ГГГГ' });
      return;
    }
    const clientLabel = normalizedClientName || 'Клиент без имени';
    const carLabel = [normalizedCar, normalizedPlate].filter(Boolean).join(', ') || 'Авто не указано';
    const createdWorkers = ownerNewBookingWorkers.map((item) => {
      const worker = ownerNewBookingMasterWorkers.find((candidate) => candidate.id === item.id);
      return { workerId: item.id, workerName: worker?.name || '', percent: item.percent };
    });
    const normalizedDate = parsedDate ? formatDate(parsedDate) : '';
    try {
      setOwnerNewBookingSaving(true);
      await addBooking({
        clientId: ownerNewBookingForm.clientId,
        clientName: normalizedClientName,
        clientPhone: ownerNewBookingForm.clientPhone.trim(),
        service: svc?.name || ownerNewBookingForm.service,
        serviceId: ownerNewBookingForm.serviceId,
        date: normalizedDate,
        time: ownerNewBookingForm.time.trim(),
        duration: ownerNewBookingForm.duration || svc?.duration || 30,
        price: ownerNewBookingForm.price || svc?.price || 0,
        status: !ownerNewBookingForm.clientPhone.trim() ? 'admin_review' : ownerNewBookingForm.status,
        workers: createdWorkers,
        box: ownerNewBookingForm.box.trim() || 'По согласованию',
        paymentType: 'cash',
        paymentSettled: true,
        car: normalizedCar,
        plate: normalizedPlate,
        notes: ownerNewBookingForm.notes,
        notifyWorkers: notify,
      });
      const requestScheduleLabel = hasDateTime
        ? `${normalizedDate} ${ownerNewBookingForm.time.trim()}`
        : 'без даты и времени';
      await addNotification({ recipientRole: 'owner', message: `${clientLabel} • ${carLabel} • ${requestScheduleLabel}`, read: false });
      setOwnerNewBookingSaveSuccess(notify ? 'notify' : 'silent');
      setTimeout(() => {
        closeOwnerNewBookingModal();
      }, 1800);
    } catch (error) {
      setOwnerNewBookingErrors({
        general: error instanceof Error ? error.message : 'Не удалось сохранить запись',
      });
    } finally {
      setOwnerNewBookingSaving(false);
    }
  };

  const kpiCards = [
    { label: 'Выручка сегодня', value: `${todayRevenue.toLocaleString('ru')} ₽`, icon: TrendingUp, color: primary },
    { label: 'Расходы всего', value: `${totalExpenses.toLocaleString('ru')} ₽`, icon: DollarSign, color: '#FF6B6B' },
    { label: 'Прибыль', value: `${profit.toLocaleString('ru')} ₽`, icon: BarChart3, color: accent },
    { label: 'Записей', value: bookings.length, icon: Users, color: '#A855F7' },
  ];

  const byService = services
    .map(service => ({
      name: service.name.split(' ')[0],
      revenue: bookings.filter(booking => booking.serviceId === service.id && booking.status === 'completed').reduce((sum, booking) => sum + booking.price, 0),
      count: bookings.filter(booking => booking.serviceId === service.id).length,
    }))
    .filter(service => service.count > 0);
  const revenueWeek = getLastNDates(7).map((date) => {
    const formatted = formatDate(date);
    return {
      day: date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', ''),
      revenue: bookings.filter((booking) => booking.date === formatted && booking.status === 'completed').reduce((sum, booking) => sum + booking.price, 0),
      expenses: expenses.filter((expense) => expense.date === formatted).reduce((sum, expense) => sum + expense.amount, 0),
    };
  });

  const statusData = [
    { name: 'Новые', value: bookings.filter(b => b.status === 'new').length, color: '#6366F1' },
    { name: 'Подтверждены', value: bookings.filter(b => b.status === 'confirmed').length, color: '#06B6D4' },
    { name: 'Запланировано', value: bookings.filter(b => b.status === 'scheduled').length, color: '#3B82F6' },
    { name: 'В работе', value: bookings.filter(b => b.status === 'in_progress').length, color: '#EAB308' },
    { name: 'Завершено', value: bookings.filter(b => b.status === 'completed').length, color: '#22C55E' },
    { name: 'Не приехал', value: bookings.filter(b => b.status === 'no_show').length, color: '#F97316' },
  ].filter(s => s.value > 0);
  const topServiceName = [...byService].sort((left, right) => right.revenue - left.revenue)[0]?.name || 'Нет данных';
  const selectableCalendarDates = Array.from(new Set([todayLabel, tomorrowLabel, ...upcomingDates.slice(0, 5), ...bookings.map((booking) => booking.date).filter(Boolean)])).slice(0, 8);
  const calendarBookings = bookings
    .filter((booking) => booking.date === selectedCalendarDate)
    .sort((left, right) => left.time.localeCompare(right.time));
  const activeCalendarBoxes = boxes.filter((box) => box.active);
  const activeCalendarWorkers = workers.filter((worker) => worker.active);
  const calendarTimeSlots = Array.from(new Set(calendarBookings.map((booking) => booking.time))).sort((left, right) => left.localeCompare(right));
  const calendarBoxGrid = calendarTimeSlots.map((time) => ({
    time,
    cells: activeCalendarBoxes.map((box) => ({
      id: box.id,
      name: box.name,
      bookings: calendarBookings.filter((booking) => booking.time === time && booking.box === box.name),
    })),
  }));
  const calendarWorkerGrid = calendarTimeSlots.map((time) => ({
    time,
    cells: activeCalendarWorkers.map((worker) => ({
      id: worker.id,
      name: worker.name,
      bookings: calendarBookings.filter((booking) => booking.time === time && booking.workers.some((item) => item.workerId === worker.id)),
    })),
  }));
  const boxLoadData = boxes
    .filter((box) => box.active)
    .map((box) => {
      const boxBookings = completedBookings.filter((booking) => booking.box === box.name);
      return {
        name: box.name,
        count: bookings.filter((booking) => booking.box === box.name).length,
        revenue: boxBookings.reduce((sum, booking) => sum + booking.price, 0),
      };
      });
  const workerEfficiencyData = workers
    .filter((worker) => worker.active)
    .map((worker) => {
      const workerBookings = completedBookings.filter((booking) => booking.workers.some((item) => item.workerId === worker.id));
      const workerRevenue = workerBookings.reduce((sum, booking) => sum + booking.price, 0);
      return {
        id: worker.id,
        name: worker.name,
        completed: workerBookings.length,
        revenue: workerRevenue,
        averageCheck: workerBookings.length > 0 ? Math.round(workerRevenue / workerBookings.length) : 0,
      };
    })
    .sort((left, right) => right.revenue - left.revenue);
  const clientInsights = clients.map((client) => {
    const clientBookings = bookings.filter((booking) => booking.clientId === client.id);
    const clientCompleted = clientBookings.filter((booking) => booking.status === 'completed');
    const favoriteServiceEntry = Object.entries(
      clientCompleted.reduce<Record<string, number>>((acc, booking) => {
        acc[booking.service] = (acc[booking.service] || 0) + 1;
        return acc;
      }, {}),
    ).sort((left, right) => right[1] - left[1])[0];
    return {
      ...client,
      visits: clientCompleted.length,
      totalSpent: clientCompleted.reduce((sum, booking) => sum + booking.price, 0),
      activeCount: clientBookings.filter((booking) => ['new', 'confirmed', 'scheduled', 'in_progress'].includes(booking.status)).length,
      favoriteService: favoriteServiceEntry?.[0] || 'Нет данных',
      lastVisit: clientCompleted[0]?.date || clientBookings[0]?.date || 'Пока нет',
    };
  }).sort((left, right) => right.totalSpent - left.totalSpent);
  const filteredClientInsights = clientInsights.filter((client) => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return true;
    return [client.name, client.phone, client.car, client.plate, client.favoriteService].some((value) =>
      value.toLowerCase().includes(query),
    );
  });

  const ownerStatusLabel = (status: string) => ({
    new: 'Новая',
    confirmed: 'Подтв.',
    scheduled: 'Запл.',
    in_progress: 'В работе',
    completed: 'Завершено',
    no_show: 'Не приехал',
    admin_review: 'Уточнение',
    cancelled: 'Отменена',
  }[status] || status);

  const ownerStatusBadge = (status: string) => ({
    new: 'bg-indigo-500/15 text-indigo-600',
    confirmed: 'bg-cyan-500/15 text-cyan-600',
    scheduled: 'bg-blue-500/15 text-blue-600',
    in_progress: 'bg-yellow-500/15 text-yellow-600',
    completed: 'bg-green-500/15 text-green-600',
    no_show: 'bg-orange-500/15 text-orange-600',
    admin_review: 'bg-amber-500/15 text-amber-600',
    cancelled: 'bg-red-500/15 text-red-500',
  }[status] || 'bg-slate-500/15 text-slate-600');

  const ownerStatusColor = (status: string) => ({
    new: 'bg-indigo-500',
    confirmed: 'bg-cyan-500',
    scheduled: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    completed: 'bg-green-500',
    no_show: 'bg-orange-500',
    admin_review: 'bg-amber-500',
    cancelled: 'bg-red-500',
  }[status] || 'bg-slate-500');

  const SwitchToggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} className="w-11 h-6 rounded-full relative transition-all shrink-0"
      style={{ background: value ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-6' : 'left-1'}`} />
    </button>
  );

  const SettingRow = ({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: () => void }) => (
    <div className={`${glass} rounded-xl p-4 mb-2 flex items-center justify-between`}>
      <div className="flex-1 mr-3">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className={`text-xs ${sub}`}>{desc}</div>}
      </div>
      <SwitchToggle value={value} onChange={onChange} />
    </div>
  );

  return (
    <div className={`${isDark ? 'dark' : ''} ${bg} ${text} min-h-screen flex flex-col`} data-owner-build="2026-04-03-5">
      {/* Header */}
      <div className={`sticky top-0 z-20 ${glass} px-4 py-3 flex items-center justify-between`}>
        <div>
          <div className="font-semibold text-sm">{financeRoleTitle}</div>
          <div className={`text-xs ${sub}`}>ATMOSFERA</div>
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
                {session?.role === 'owner' ? 'Владелец → Админ' : session?.role === 'admin' ? 'Админ → Владелец' : 'Сменить роль'}
              </button>
            </div>
          )}
          <button onClick={() => { setShowNotifications(true); markAllNotificationsRead(financeNotificationRole); }} className={`p-2 rounded-xl ${glass} relative`}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>}
          </button>
          <button onClick={() => setShowFinancePanel(true)} className={`p-2 rounded-xl ${glass}`}><Wallet size={18} /></button>
          <button onClick={() => setShowOwnerNewBooking(true)} className="p-2 rounded-xl text-white" style={{ background: primary }}><Plus size={18} /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">

          {/* ── CALENDAR ── */}
          {page === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Сегодня — {todayLabel}</h2>
                <span className={`text-sm ${sub}`}>{todayBookings.length} записей</span>
              </div>
              <div className="space-y-3">
                {todayBookings.length === 0 ? (
                  <div className={`${glass} rounded-2xl p-8 text-center`}>
                    <CalendarDays size={36} className={`mx-auto mb-3 ${sub}`} />
                    <p className={sub}>Записей на сегодня нет</p>
                  </div>
                ) : todayBookings.map(booking => (
                  <motion.button key={booking.id} whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedBooking(booking); setShowBookingDetail(true); }}
                    className={`${glass} rounded-2xl p-4 w-full text-left`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-1 self-stretch rounded-full ${ownerStatusColor(booking.status)}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-semibold text-sm">{booking.time} · {booking.clientName}</div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${ownerStatusBadge(booking.status)}`}>{ownerStatusLabel(booking.status)}</span>
                        </div>
                        <div className={`text-sm ${sub}`}>{booking.service}</div>
                        <div className="flex justify-between mt-2">
                          <span className={`text-xs ${sub}`}>{booking.box} · {booking.duration} мин</span>
                          <span className="text-sm font-semibold">{booking.price.toLocaleString('ru')} ₽</span>
                        </div>
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
                      onClick={() => { setSelectedBooking(booking); setShowBookingDetail(true); }}
                      className={`${glass} rounded-2xl p-4 w-full text-left mb-3`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">{booking.clientName}</div>
                          <div className={`text-xs ${sub}`}>{booking.service} · {booking.date}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ownerStatusBadge(booking.status)}`}>{ownerStatusLabel(booking.status)}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}


          {/* ── DASHBOARD ── */}
          {page === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {kpiCards.map(card => (
                  <div key={card.label} className={`${glass} rounded-2xl p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <card.icon size={15} style={{ color: card.color }} />
                      <span className={`text-xs ${sub}`}>{card.label}</span>
                    </div>
                    <div className="font-bold" style={{ color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>
              {/* Today bookings */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Сегодня — {todayLabel}</h3>
                  <span className={`text-sm ${sub}`}>{todayBookings.length} записей</span>
                </div>
                <div className="space-y-3">
                  {todayBookings.length === 0 ? (
                    <div className={`${glass} rounded-2xl p-8 text-center`}>
                      <CalendarDays size={36} className={`mx-auto mb-3 ${sub}`} />
                      <p className={sub}>Записей на сегодня нет</p>
                    </div>
                  ) : todayBookings.map(booking => (
                    <motion.button key={booking.id} whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedBooking(booking); setShowBookingDetail(true); }}
                      className={`${glass} rounded-2xl p-4 w-full text-left`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-1 self-stretch rounded-full ${booking.status === 'new' ? 'bg-indigo-500' : booking.status === 'confirmed' ? 'bg-cyan-500' : booking.status === 'scheduled' ? 'bg-blue-500' : booking.status === 'in_progress' ? 'bg-yellow-500' : booking.status === 'completed' ? 'bg-green-500' : booking.status === 'no_show' ? 'bg-orange-500' : 'bg-red-500'}`} />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-semibold text-sm">{booking.time} · {booking.clientName}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ownerStatusBadge(booking.status)}`}>{ownerStatusLabel(booking.status)}</span>
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
              </div>
              {/* Revenue chart */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs font-medium ${sub} mb-3`}>ВЫРУЧКА VS РАСХОДЫ (НЕДЕЛЯ)</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={revenueWeek} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: isDark ? '#9AA6B2' : '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: isDark ? '#9AA6B2' : '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="revenue" fill={primary} radius={[3, 3, 0, 0]} name="Выручка" />
                    <Bar dataKey="expenses" fill="#FF6B6B" radius={[3, 3, 0, 0]} name="Расходы" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Средний чек', value: `${averageCheck.toLocaleString('ru')} ₽`, color: primary },
                  { label: 'Активных записей', value: activeBookings.length, color: accent },
                  { label: 'Топ-услуга', value: topServiceName, color: '#A855F7' },
                  { label: 'Не приехали', value: pipelineCounts.noShow, color: '#F97316' },
                ].map((card) => (
                  <div key={card.label} className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub}`}>{card.label}</div>
                    <div className="font-bold mt-2" style={{ color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className={`text-xs font-medium ${sub}`}>ВОРОНКА ЗАПИСЕЙ</div>
                    <div className={`text-xs ${sub} mt-1`}>От новых заявок до выполненных визитов</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Новые', value: pipelineCounts.new, color: '#6366F1' },
                    { label: 'Подтверждены', value: pipelineCounts.confirmed, color: '#06B6D4' },
                    { label: 'Запланированы', value: pipelineCounts.scheduled, color: '#3B82F6' },
                    { label: 'В работе', value: pipelineCounts.inProgress, color: '#EAB308' },
                  ].map((item) => (
                    <div key={item.label} className={`${glass} rounded-xl px-3 py-3`}>
                      <div className={`text-[11px] ${sub}`}>{item.label}</div>
                      <div className="text-lg font-semibold mt-1" style={{ color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className={`text-xs font-medium ${sub}`}>КАЛЕНДАРЬ ЗАГРУЗКИ</div>
                    <div className={`text-xs ${sub} mt-1`}>Сетка по боксам и мастерам на выбранный день</div>
                  </div>
                  <CalendarDays size={18} style={{ color: primary }} />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: 'none' }}>
                  {selectableCalendarDates.map((date) => (
                    <button
                      key={date}
                      onClick={() => setSelectedCalendarDate(date)}
                      className="shrink-0 px-3 py-2 rounded-xl text-sm"
                      style={selectedCalendarDate === date ? { background: primary, color: '#fff' } : { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                    >
                      {date}
                    </button>
                  ))}
                </div>
                {calendarBookings.length === 0 ? (
                  <div className={`text-sm ${sub}`}>На {selectedCalendarDate} записей пока нет.</div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className={`text-[11px] ${sub} uppercase tracking-wider mb-2`}>Сетка по времени и боксам</div>
                      <div className="overflow-x-auto rounded-xl">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className={sub}>
                              <th className="text-left py-2 pr-3 font-medium sticky left-0 z-10" style={{ background: isDark ? '#0B1226' : '#F6F7FA' }}>Время</th>
                              {activeCalendarBoxes.map((box) => (
                                <th key={box.id} className="text-left py-2 px-2 font-medium min-w-[150px]">{box.name}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {calendarBoxGrid.map((row) => (
                              <tr key={`box-grid-${row.time}`} className="align-top">
                                <td className="py-2 pr-3 text-xs font-semibold sticky left-0 z-10" style={{ background: isDark ? '#0B1226' : '#F6F7FA' }}>{row.time}</td>
                                {row.cells.map((cell) => (
                                  <td key={`${row.time}-${cell.id}`} className="px-2 py-2">
                                    {cell.bookings.length === 0 ? (
                                      <div className={`rounded-xl border border-dashed px-3 py-3 text-xs text-center ${sub}`} style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                                        Свободно
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {cell.bookings.map((booking) => (
                                          <button key={booking.id} onClick={() => { setSelectedBooking(booking); setShowBookingDetail(true); }} className={`${glass} rounded-xl p-3 w-full text-left`}>
                                            <div className="font-medium text-sm truncate">{booking.clientName}</div>
                                            <div className={`text-xs ${sub} truncate mt-1`}>{booking.service}</div>
                                            <div className="mt-2 flex items-center justify-between gap-2">
                                              <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${ownerStatusBadge(booking.status)}`}>
                                                {ownerStatusLabel(booking.status)}
                                              </span>
                                              <span className={`text-[11px] ${sub}`}>{booking.time}</span>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <div className={`text-[11px] ${sub} uppercase tracking-wider mb-2`}>Сетка по времени и мастерам</div>
                      <div className="overflow-x-auto rounded-xl">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className={sub}>
                              <th className="text-left py-2 pr-3 font-medium sticky left-0 z-10" style={{ background: isDark ? '#0B1226' : '#F6F7FA' }}>Время</th>
                              {activeCalendarWorkers.map((worker) => (
                                <th key={worker.id} className="text-left py-2 px-2 font-medium min-w-[150px]">{worker.name}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {calendarWorkerGrid.map((row) => (
                              <tr key={`worker-grid-${row.time}`} className="align-top">
                                <td className="py-2 pr-3 text-xs font-semibold sticky left-0 z-10" style={{ background: isDark ? '#0B1226' : '#F6F7FA' }}>{row.time}</td>
                                {row.cells.map((cell) => (
                                  <td key={`${row.time}-${cell.id}`} className="px-2 py-2">
                                    {cell.bookings.length === 0 ? (
                                      <div className={`rounded-xl border border-dashed px-3 py-3 text-xs text-center ${sub}`} style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                                        Свободно
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {cell.bookings.map((booking) => (
                                          <button key={`${cell.id}-${booking.id}`} onClick={() => { setSelectedBooking(booking); setShowBookingDetail(true); }} className={`${glass} rounded-xl p-3 w-full text-left`}>
                                            <div className="font-medium text-sm truncate">{booking.clientName}</div>
                                            <div className={`text-xs ${sub} truncate mt-1`}>{booking.box} · {booking.service}</div>
                                            <div className="mt-2 flex items-center justify-between gap-2">
                                              <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${ownerStatusBadge(booking.status)}`}>
                                                {ownerStatusLabel(booking.status)}
                                              </span>
                                              <span className={`text-[11px] ${sub}`}>{booking.time}</span>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <div className={`text-[11px] ${sub} uppercase tracking-wider mb-2`}>По боксам</div>
                      <div className="space-y-2">
                        {boxes.filter((box) => box.active).map((box) => {
                          const boxItems = calendarBookings.filter((booking) => booking.box === box.name);
                          return (
                            <div key={box.id} className={`${glass} rounded-xl p-3`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-sm">{box.name}</span>
                                <span className={`text-xs ${sub}`}>{boxItems.length} записей</span>
                              </div>
                              {boxItems.length === 0 ? (
                                <div className={`text-xs ${sub}`}>Свободно</div>
                              ) : (
                                <div className="space-y-2">
                                  {boxItems.map((booking) => (
                                    <button key={booking.id} onClick={() => { setSelectedBooking(booking); setShowBookingDetail(true); }} className="flex items-center justify-between gap-2 w-full text-left">
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{booking.time} · {booking.clientName}</div>
                                        <div className={`text-xs ${sub} truncate`}>{booking.service}</div>
                                      </div>
                                      <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${ownerStatusBadge(booking.status)}`}>
                                        {ownerStatusLabel(booking.status)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className={`text-[11px] ${sub} uppercase tracking-wider mb-2`}>По мастерам</div>
                      <div className="space-y-2">
                        {workers.filter((worker) => worker.active).map((worker) => {
                          const workerItems = calendarBookings.filter((booking) => booking.workers.some((item) => item.workerId === worker.id));
                          return (
                            <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-sm">{worker.name}</span>
                                <span className={`text-xs ${sub}`}>{workerItems.length} задач</span>
                              </div>
                              {workerItems.length === 0 ? (
                                <div className={`text-xs ${sub}`}>Свободно</div>
                              ) : (
                                <div className="space-y-2">
                                  {workerItems.map((booking) => (
                                    <button key={`${worker.id}-${booking.id}`} onClick={() => { setSelectedBooking(booking); setShowBookingDetail(true); }} className="flex items-center justify-between gap-2 w-full text-left">
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{booking.time} · {booking.clientName}</div>
                                        <div className={`text-xs ${sub} truncate`}>{booking.box} · {booking.service}</div>
                                      </div>
                                      <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${ownerStatusBadge(booking.status)}`}>
                                        {ownerStatusLabel(booking.status)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Quick actions */}
              <h3 className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Быстрые действия</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                  {(isAccountant
                    ? [
                        { label: 'Добавить расход', icon: DollarSign, color: '#FF6B6B', action: () => setShowAddExpense(true), disabled: false },
                        { label: exportingKind === 'report' ? 'Выгрузка...' : 'Экспорт Excel', icon: Download, color: accent, action: () => { void handleExport('report'); }, disabled: exportingKind !== null },
                      ]
                    : [
                        { label: 'Создать запись', icon: Plus, color: primary, action: () => { resetBookingForm(); setShowCreateBooking(true); }, disabled: false },
                        { label: 'Новый клиент', icon: Users, color: '#06B6D4', action: () => setShowCreateClient(true), disabled: false },
                        { label: 'Добавить расход', icon: DollarSign, color: '#FF6B6B', action: () => setShowAddExpense(true), disabled: false },
                        { label: exportingKind === 'report' ? 'Выгрузка...' : 'Экспорт Excel', icon: Download, color: accent, action: () => { void handleExport('report'); }, disabled: exportingKind !== null },
                        { label: sendingReminders ? 'Отправка...' : 'Напомнить о записях', icon: RefreshCw, color: '#EC4899', action: () => { void handleDispatchReminders(); }, disabled: sendingReminders },
                        { label: sendingInactiveReminder ? 'Отправка...' : 'Обзвон 2+ недель', icon: Phone, color: '#F59E0B', action: () => { void handleInactiveClientsReminder(); }, disabled: sendingInactiveReminder },
                        { label: 'Настройки', icon: Settings, color: '#A855F7', action: () => { setPage('settings'); setSettingsSection(null); }, disabled: false },
                      ]).map(a => (
                  <motion.button key={a.label} whileTap={{ scale: 0.96 }} onClick={a.action} disabled={a.disabled} className={`${glass} rounded-2xl p-4 flex flex-col items-center gap-2 text-center disabled:opacity-60`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${a.color}20` }}><a.icon size={20} style={{ color: a.color }} /></div>
                    <span className="text-xs font-medium">{a.label}</span>
                  </motion.button>
                ))}
              </div>
              {/* Status pie + recent */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`${glass} rounded-2xl p-3`}>
                  <div className={`text-xs ${sub} mb-2`}>Статусы</div>
                  <PieChart width={80} height={80}>
                    <Pie data={statusData} cx={35} cy={35} innerRadius={22} outerRadius={36} dataKey="value" strokeWidth={0}>
                      {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                  <div className="mt-2 space-y-1">
                    {statusData.map(s => (
                      <div key={s.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className={`text-[10px] ${sub} truncate`}>{s.name} ({s.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`${glass} rounded-2xl p-3`}>
                  <div className={`text-xs ${sub} mb-2`}>Склад</div>
                  <div className="font-bold text-lg" style={{ color: accent }}>{totalStockValue.toLocaleString('ru')} ₽</div>
                  <div className={`text-xs ${sub} mb-2`}>{stockItems.length} позиций</div>
                  {stockItems.filter(s => s.qty <= 5).length > 0 && (
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <AlertCircle size={11} />
                      {stockItems.filter(s => s.qty <= 5).length} на исходе
                    </div>
                  )}
                </div>
              </div>
              {/* Recent bookings */}
              <h3 className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Последние записи</h3>
              {bookings.slice(0, 4).map(b => (
                <div key={b.id} className={`${glass} rounded-xl p-3 flex justify-between items-center mb-2`}>
                  <div>
                    <div className="text-sm font-medium">{b.clientName}</div>
                    <div className={`text-xs ${sub}`}>{b.service} · {b.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{b.price.toLocaleString('ru')} ₽</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ownerStatusBadge(b.status)}`}>
                      {ownerStatusLabel(b.status)}
                    </span>
                  </div>
                </div>
              ))}
              {stockItems.filter(s => s.qty <= 5).length > 0 && (
                <div className="mt-3">
                  <h3 className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>Предупреждения склада</h3>
                  {stockItems.filter(s => s.qty <= 5).map(s => (
                    <div key={s.id} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-2 flex items-center gap-2">
                      <AlertCircle size={15} className="text-red-500 shrink-0" />
                      <span className="text-sm">Низкий остаток: <span className="font-medium">{s.name}</span> ({s.qty} {s.unit})</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── PAYROLL ── */}
          {page === 'payroll' && (
            <motion.div key="payroll" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <h2 className="font-semibold mb-4">Зарплаты сотрудников</h2>
              {!isAccountant && <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-1`}>Общий фонд выплат</div>
                <div className="font-bold text-xl" style={{ color: accent }}>{payrollTotal.toLocaleString('ru')} ₽</div>
              </div>}
              <button onClick={() => { void handleSavePayrollSettings(); }} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mb-4" style={{ background: primary }}>
                <Save size={16} />Сохранить настройки зарплат
              </button>
              {!isAccountant && <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-2`}>Жалобы мастерам</div>
                <div className={`text-xs ${sub} mb-3`}>
                  3 активные жалобы снижают процент мастера на 10 п.п. на неделю. Базовый процент не может быть выше 40%.
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select className={selectCls} value={penaltyForm.workerId} onChange={e => setPenaltyForm(p => ({ ...p, workerId: e.target.value }))}>
                    {workers.map(worker => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
                  </select>
                  <input className={inputCls} placeholder="Название жалобы" value={penaltyForm.title} onChange={e => setPenaltyForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <textarea className={`${inputCls} h-20 resize-none mb-3`} placeholder="Причина или комментарий" value={penaltyForm.reason} onChange={e => setPenaltyForm(p => ({ ...p, reason: e.target.value }))} />
                <button onClick={handleAddPenalty} className="w-full py-3 rounded-2xl text-white font-semibold" style={{ background: '#EF4444' }}>
                  Выдать жалобу
                </button>
              </div>}
              {payrollRows.map(({ worker, payrollSummary, complaintState, recentPenalties }) => (
                <div key={worker.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: primary }}>{worker.name.charAt(0)}</div>
                    <div className="flex-1">
                      <div className="font-semibold">{worker.name}</div>
                      <div className={`text-xs ${sub}`}>{employeeRoleLabel(worker.role === 'owner' ? 'admin' : worker.role)} · база {worker.defaultPercent}%</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold" style={{ color: accent }}>{(payrollSummary?.balance || 0).toLocaleString('ru')} ₽</div>
                      <div className={`text-xs ${sub}`}>{payrollSummary?.completedBookings || 0} заказов · {complaintState.activeCount} активных жалоб</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPayrollDrafts((current) => ({
                        ...current,
                        [worker.id]: {
                          ...(current[worker.id] || { amount: '', note: '' }),
                          kind: 'payout',
                        },
                      }));
                      document.getElementById(`owner-payroll-action-${worker.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="mb-3 w-full rounded-xl border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: `${primary}33`, color: primary, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' }}
                  >
                    Открыть зарплату мастера
                  </button>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{(payrollSummary?.accruedFromBookings || 0).toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub}`}>Заработано с заказов</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold text-red-500">{complaintState.effectivePercent}%</div>
                      <div className={`text-[11px] ${sub}`}>Текущий %</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{(payrollSummary?.baseSalary || worker.salaryBase).toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub}`}>Оклад</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{(payrollSummary?.completedRevenue || 0).toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub}`}>Выручка по заказам</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`${glass} rounded-xl p-3`}>
                      <div className={`text-[11px] ${sub} mb-1`}>Начислено</div>
                      <div className="text-sm font-semibold">{(payrollSummary?.totalAccrued || 0).toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub} mt-1`}>
                        Премии: {(payrollSummary?.bonusTotal || 0).toLocaleString('ru')} ₽ · Корректировки: {(payrollSummary?.adjustmentTotal || 0).toLocaleString('ru')} ₽
                      </div>
                    </div>
                    <div className={`${glass} rounded-xl p-3`}>
                      <div className={`text-[11px] ${sub} mb-1`}>Удержано / выдано</div>
                      <div className="text-sm font-semibold">{(payrollSummary?.totalDeducted || 0).toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub} mt-1`}>
                        Авансы: {(payrollSummary?.advanceTotal || 0).toLocaleString('ru')} ₽ · Выплаты: {(payrollSummary?.payoutTotal || 0).toLocaleString('ru')} ₽
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const payrollDraft = employeeSettings.find((item) => item.id === worker.id);
                    if (!payrollDraft) return null;
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <label className={`text-[11px] ${sub} block mb-1`}>Процент</label>
                            <input className={inputCls} type="number" min={0} max={40} value={payrollDraft.percent} onChange={e => setEmployeeSettings((current) => current.map((item) => item.id === worker.id ? { ...item, percent: Math.max(0, Math.min(40, Number(e.target.value) || 0)) } : item))} />
                          </div>
                          <div>
                            <label className={`text-[11px] ${sub} block mb-1`}>Оклад</label>
                            <input className={inputCls} type="number" min={0} value={payrollDraft.salaryBase} onChange={e => setEmployeeSettings((current) => current.map((item) => item.id === worker.id ? { ...item, salaryBase: Math.max(0, Number(e.target.value) || 0) } : item))} />
                          </div>
                        </div>
                        {!isAccountant && <div className="flex items-center justify-between rounded-xl px-3 py-3 mb-3 border border-white/10">
                          <div>
                            <div className="text-sm font-medium">Активность мастера</div>
                            <div className={`text-[11px] ${sub}`}>Можно временно снять мастера с новых записей</div>
                          </div>
                          <button
                            onClick={() => setEmployeeSettings((current) => current.map((item) => item.id === worker.id ? { ...item, active: !item.active } : item))}
                            className="w-11 h-6 rounded-full relative transition-all"
                            style={{ background: payrollDraft.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${payrollDraft.active ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>}
                      </>
                    );
                  })()}
                  <div id={`owner-payroll-action-${worker.id}`} className={`${glass} rounded-xl p-3 mb-3`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <div className="text-sm font-medium">Операция по зарплате</div>
                        <div className={`text-[11px] ${sub}`}>Аванс, списание, выплата, премия или ручная корректировка с примечанием</div>
                      </div>
                    </div>
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
                        placeholder={payrollDrafts[worker.id]?.kind === 'adjustment' ? 'Можно отрицательное число' : 'Сумма'}
                      />
                    </div>
                    <textarea
                      className={`${inputCls} h-20 resize-none mb-2`}
                      placeholder="Примечание: за что выдан аванс, почему списание, что входит в выплату"
                      value={payrollDrafts[worker.id]?.note || ''}
                      onChange={(event) => setPayrollDrafts((current) => ({
                        ...current,
                        [worker.id]: {
                          ...(current[worker.id] || { kind: 'advance', amount: '' }),
                          note: event.target.value,
                        },
                      }))}
                    />
                    <button
                      onClick={() => { void handleCreatePayrollEntry(worker.id, worker.name); }}
                      disabled={payrollEntryLoading === worker.id}
                      className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                      style={{ background: primary }}
                    >
                      {payrollEntryLoading === worker.id ? 'Сохраняю...' : 'Провести операцию по зарплате'}
                    </button>
                  </div>
                  {!isAccountant && (complaintState.reductionActive ? (
                    <div className="rounded-xl px-3 py-2 mb-3 text-xs border border-red-500/20 bg-red-500/10 text-red-500">
                      Снижение активно: −10 п.п. до {complaintState.reductionUntil ? formatComplaintDate(complaintState.reductionUntil) : 'конца недели'}.
                    </div>
                  ) : (
                    <div className={`text-xs ${sub} mb-3`}>
                      {complaintState.activeCount === 0
                        ? 'Активных жалоб нет.'
                        : `До снижения процента осталось ${Math.max(0, COMPLAINT_THRESHOLD - complaintState.activeCount)} жалобы.`}
                    </div>
                  ))}
                  {!isAccountant && complaintState.activeCount > 0 && (
                    <button
                      onClick={() => { void handleRevokeAllPenalties(worker.id, worker.name); }}
                      className="mb-3 w-full py-2.5 rounded-xl text-sm font-medium text-red-500 border border-red-500/20 bg-red-500/10"
                    >
                      Снять все жалобы
                    </button>
                  )}
                  {!isAccountant && recentPenalties.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {recentPenalties.map(item => (
                        <div key={item.id} className={`${glass} rounded-xl p-3 flex items-start justify-between gap-3`}>
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{item.title}</div>
                            <div className={`text-xs ${sub}`}>{item.reason}</div>
                            <div className={`text-[11px] ${sub} mt-1`}>
                              {isComplaintActive(item)
                                ? `Активна до ${formatComplaintDate(item.activeUntil)}`
                                : item.revokedAt
                                  ? `Снята ${formatComplaintDate(item.revokedAt)}`
                                  : `Истекла ${formatComplaintDate(item.activeUntil)}`}
                            </div>
                          </div>
                          {isComplaintActive(item) ? (
                            <button onClick={() => { void handleRevokePenalty(item.id, worker.name); }} className="text-xs text-red-500 shrink-0">
                              Снять
                            </button>
                          ) : (
                            <span className={`text-xs ${sub} shrink-0`}>{item.revokedAt ? 'Снята' : 'Истекла'}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {(payrollSummary?.bookingItems?.length || 0) > 0 && (
                    <div className="mb-3">
                      <div className={`text-xs ${sub} mb-2`}>Последние выполненные заказы</div>
                      <div className="space-y-2">
                        {payrollSummary?.bookingItems.slice(0, 5).map((item) => (
                          <div key={item.bookingId} className={`${glass} rounded-xl p-3 flex items-center justify-between gap-3`}>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{item.service}</div>
                              <div className={`text-[11px] ${sub}`}>{item.date} · {item.time} · {item.price.toLocaleString('ru')} ₽</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-semibold">+{item.earned.toLocaleString('ru')} ₽</div>
                              <div className={`text-[11px] ${sub}`}>{item.percent}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(payrollSummary?.entries?.length || 0) > 0 && (
                    <div>
                      <div className={`text-xs ${sub} mb-2`}>История операций</div>
                      <div className="space-y-2">
                        {payrollSummary?.entries.slice(0, 6).map((entry) => (
                          <div key={entry.id} className={`${glass} rounded-xl p-3`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium">
                                {{
                                  advance: 'Аванс',
                                  deduction: 'Списание',
                                  bonus: 'Премия',
                                  payout: 'Выплата',
                                  adjustment: 'Корректировка',
                                }[entry.kind]}
                              </div>
                              <div className="text-sm font-semibold" style={{ color: entry.kind === 'bonus' || (entry.kind === 'adjustment' && entry.amount > 0) ? accent : entry.kind === 'adjustment' && entry.amount < 0 ? '#EF4444' : (isDark ? '#E6EEF8' : '#0B1226') }}>
                                {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString('ru')} ₽
                              </div>
                            </div>
                            <div className={`text-[11px] ${sub} mt-1`}>
                              {entry.createdByName} · {entry.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {entry.note && <div className={`text-xs ${sub} mt-1`}>{entry.note}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* ── STOCK ── */}
          {page === 'stock' && (
            <motion.div key="stock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Склад</h2>
                <button onClick={() => setShowAddStock(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white" style={{ background: primary }}>
                  <Plus size={14} />Добавить товар
                </button>
              </div>
              <div className={`${glass} rounded-2xl p-3 mb-4 flex justify-between items-center`}>
                <div>
                  <div className={`text-xs ${sub}`}>Стоимость склада</div>
                  <div className="font-bold" style={{ color: accent }}>{totalStockValue.toLocaleString('ru')} ₽</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs ${sub}`}>Позиций</div>
                  <div className="font-bold">{stockItems.length}</div>
                </div>
              </div>
              {stockItems.map(item => (
                <motion.div key={item.id} layout className={`${glass} rounded-xl p-4 mb-2`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className={`text-xs ${sub}`}>{item.category} · {item.unitPrice.toLocaleString('ru')} ₽/{item.unit}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${item.qty <= 5 ? 'text-red-500' : ''}`}>{item.qty} {item.unit}</div>
                      <div className={`text-xs ${sub}`}>{(item.qty * item.unitPrice).toLocaleString('ru')} ₽</div>
                    </div>
                  </div>
                  {item.qty <= 5 && <div className="flex items-center gap-1 text-red-500 text-xs mb-2"><AlertCircle size={12} />Низкий остаток</div>}
                  {/* qty bar */}
                  <div className="h-1.5 rounded-full mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (item.qty / 30) * 100)}%`, background: item.qty <= 5 ? '#EF4444' : primary }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setShowWriteOff(item.id); setWriteOffQty('1'); }}
                      className="py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5"
                      style={{ borderColor: `${primary}30`, color: primary }}>
                      <Package size={12} />Списать
                    </button>
                    <button onClick={async () => {
                      if (!window.confirm(`Удалить «${item.name}» со склада?`)) return;
                      try {
                        await deleteStockItem(item.id);
                        setBottomToast(`«${item.name}» удалён со склада`);
                        setTimeout(() => setBottomToast(null), 3000);
                      } catch (err) {
                        setBottomToast(err instanceof Error ? err.message : 'Не удалось удалить');
                        setTimeout(() => setBottomToast(null), 3000);
                      }
                    }}
                      className="py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5"
                      style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#EF4444' }}>
                      <X size={12} />Удалить
                    </button>
                  </div>
                </motion.div>
              ))}
              {!isAccountant && <div className={`${glass} rounded-2xl p-4 mt-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold">Чек-листы смен мастеров</div>
                    <div className={`text-xs ${sub} mt-1`}>Принятие и закрытие смены с остатками химии по каждому мастеру</div>
                  </div>
                  <div className={`text-xs ${sub}`}>{latestShiftChecklists.length} последних</div>
                </div>
                {latestShiftChecklists.length === 0 ? (
                  <div className={`text-sm ${sub}`}>Пока нет заполненных чек-листов по химии.</div>
                ) : (
                  <div className="space-y-3">
                    {latestShiftChecklists.map((entry) => (
                      <div key={entry.id} className={`${glass} rounded-2xl p-4`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="font-medium">{entry.workerName}</div>
                            <div className={`text-xs ${sub}`}>
                              {entry.phase === 'start' ? 'Принятие смены' : 'Закрытие смены'} · {entry.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div
                            className="px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              background: entry.phase === 'start' ? `${primary}18` : `${accent}18`,
                              color: entry.phase === 'start' ? primary : accent,
                            }}
                          >
                            {entry.phase === 'start' ? 'Смена принята' : 'Смена закрыта'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {entry.items.map((item) => (
                            <div key={`${entry.id}-${item.stockItemId}`} className={`${glass} rounded-xl px-3 py-2.5 flex items-center justify-between gap-3`}>
                              <div className="min-w-0">
                                <div className="text-sm font-medium">{item.name}</div>
                                <div className={`text-[11px] ${sub}`}>
                                  {entry.phase === 'end'
                                    ? `Было: ${item.startQty ?? '-'} ${item.unit} · Осталось: ${item.actualQty} ${item.unit}`
                                    : `По факту: ${item.actualQty} ${item.unit}`}
                                </div>
                              </div>
                              {entry.phase === 'end' && (
                                <div className="text-right shrink-0">
                                  <div className="text-sm font-semibold">
                                    -{Math.max(0, (item.startQty ?? item.actualQty) - item.actualQty)} {item.unit}
                                  </div>
                                  <div className={`text-[11px] ${sub}`}>расход</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {entry.note && <div className={`text-xs ${sub} mt-3`}>Примечание: {entry.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>}
              {!isAccountant && <div className={`${glass} rounded-2xl p-4 mt-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold">Открытие смены админом</div>
                    <div className={`text-xs ${sub} mt-1`}>Фото пола, отмеченные расходники, мастера на смене и решение владельца</div>
                  </div>
                  <div className={`text-xs ${sub}`}>{latestAdminShiftInspections.length} последних</div>
                </div>
                {latestAdminShiftInspections.length === 0 ? (
                  <div className={`text-sm ${sub}`}>Админ ещё не отправлял открытия смены на подтверждение.</div>
                ) : (
                  <div className="space-y-3">
                    {latestAdminShiftInspections.map((inspection) => (
                      <div key={inspection.id} className={`${glass} rounded-2xl p-4`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="font-medium">{inspection.adminName}</div>
                            <div className={`text-xs ${sub}`}>
                              {inspection.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${inspection.status === 'pending' ? 'bg-amber-500/15 text-amber-600' : inspection.status === 'approved' ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'}`}>
                            {inspection.status === 'pending' ? 'На подтверждении' : inspection.status === 'approved' ? 'Подтверждено' : 'Отказано'}
                          </div>
                        </div>
                        {adminShiftPhotoUrls[inspection.id] ? (
                          <img src={adminShiftPhotoUrls[inspection.id]} alt="Фото открытия смены" className="mb-3 h-44 w-full rounded-2xl object-cover" />
                        ) : (
                          <div className={`${glass} mb-3 flex h-44 w-full items-center justify-center rounded-2xl text-sm ${sub}`}>
                            Загружаем фото открытия смены...
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div className={`${glass} rounded-xl p-3`}>
                            <div className={`text-[11px] ${sub} mb-1`}>Мастера на смене</div>
                            <div className="text-sm font-medium">
                              {inspection.masters.filter((item) => item.checked).map((item) => item.workerName).join(', ') || 'Не выбраны'}
                            </div>
                          </div>
                          <div className={`${glass} rounded-xl p-3`}>
                            <div className={`text-[11px] ${sub} mb-1`}>Проверенные расходники</div>
                            <div className="text-sm font-medium">
                              {inspection.supplies.filter((item) => item.checked).map((item) => item.name).join(', ') || 'Не отмечены'}
                            </div>
                          </div>
                        </div>
                        <div className={`text-xs ${sub} mt-3`}>
                          Чистые тряпки: {inspection.clothsReady ? 'Да' : 'Нет'}
                        </div>
                        {inspection.note && <div className={`text-xs ${sub} mt-1`}>Комментарий админа: {inspection.note}</div>}
                        {inspection.issueNote && <div className="text-xs text-red-500 mt-2">Причина отказа: {inspection.issueNote}</div>}
                        {inspection.reviewedAt && (
                          <div className={`text-[11px] ${sub} mt-2`}>
                            Решение принято {inspection.reviewedAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>}
            </motion.div>
          )}

          {/* ── REPORTS ── */}
          {page === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Отчёты</h2>
                <button onClick={() => { void handleExport('pdf'); }} disabled={exportingKind !== null} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white disabled:opacity-60" style={{ background: accent }}>
                  <Download size={14} />{exportingKind === 'pdf' ? 'Выгрузка...' : 'Экспорт PDF'}
                </button>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="text-xs text-[#6B7280] mb-3">Сводные Telegram-отчёты</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { period: 'daily', segment: 'wash', label: 'День · мойка' },
                    { period: 'daily', segment: 'detailing', label: 'День · детейлинг' },
                    { period: 'weekly', segment: 'wash', label: 'Неделя · мойка' },
                    { period: 'weekly', segment: 'detailing', label: 'Неделя · детейлинг' },
                  ].map((item) => {
                    const key = `${item.period}-${item.segment}`;
                    return (
                      <button
                        key={key}
                        onClick={() => { void handleSummaryReport(item.period as 'daily' | 'weekly', item.segment as 'wash' | 'detailing'); }}
                        disabled={sendingSummaryReport !== null}
                        className="rounded-xl px-3 py-3 text-sm font-medium text-left disabled:opacity-60"
                        style={{ background: sendingSummaryReport === key ? `${primary}35` : `${primary}15`, color: primary }}
                      >
                        {sendingSummaryReport === key ? 'Отправка...' : item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Средний чек', value: `${averageCheck.toLocaleString('ru')} ₽`, color: primary },
                  { label: 'Топ-услуга', value: topServiceName, color: '#A855F7' },
                  { label: 'Активных клиентов', value: clientInsights.filter((client) => client.activeCount > 0).length, color: accent },
                  { label: 'Долги клиентов', value: `${clientInsights.reduce((sum, client) => sum + client.debtBalance, 0).toLocaleString('ru')} ₽`, color: '#EF4444' },
                ].map((item) => (
                  <div key={item.label} className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub}`}>{item.label}</div>
                    <div className="font-bold mt-2" style={{ color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>ФИНАНСОВЫЙ ИТОГ</div>
                {[
                  { label: 'Выручка', value: `${totalRevenue.toLocaleString('ru')} ₽`, color: accent },
                  { label: 'Доп. доходы', value: `${incomes.reduce((s, i) => s + i.amount, 0).toLocaleString('ru')} ₽`, color: primary },
                  { label: 'Расходы', value: `${totalExpenses.toLocaleString('ru')} ₽`, color: '#FF6B6B' },
                  { label: 'Прибыль', value: `${(totalRevenue + incomes.reduce((s, i) => s + i.amount, 0) - totalExpenses).toLocaleString('ru')} ₽`, color: primary },
                  { label: 'Маржа', value: `${totalRevenue > 0 ? Math.round(((totalRevenue + incomes.reduce((s, i) => s + i.amount, 0) - totalExpenses) / totalRevenue) * 100) : 0}%`, color: '#A855F7' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2.5 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className="text-sm">{r.label}</span>
                    <span className="font-semibold" style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>
              {/* Доходы */}
              {incomes.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs ${sub} mb-3`}>ДОХОДЫ</div>
                  <div className="space-y-2">
                    {incomes.slice(0, 10).map(inc => (
                      <div key={inc.id} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <div>
                          <div className="text-sm font-medium">{inc.source}</div>
                          <div className={`text-xs ${sub}`}>{inc.date}{inc.note ? ` · ${inc.note}` : ''}</div>
                        </div>
                        <div className="font-semibold text-sm" style={{ color: primary }}>+{inc.amount.toLocaleString('ru')} ₽</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Services chart */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>ВЫРУЧКА ПО УСЛУГАМ</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={byService} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#9AA6B2' : '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: isDark ? '#9AA6B2' : '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="revenue" fill={primary} radius={[4, 4, 0, 0]} name="Выручка" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>ЗАГРУЗКА ПО БОКСАМ</div>
                <div className="space-y-3">
                  {boxLoadData.map((box) => (
                    <div key={box.name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{box.name}</span>
                        <span className={`text-xs ${sub}`}>{box.count} записей · {box.revenue.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, box.count * 18)}%`, background: primary }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>ЭФФЕКТИВНОСТЬ МАСТЕРОВ</div>
                <div className="space-y-2">
                  {workerEfficiencyData.map((worker) => (
                    <div key={worker.id} className={`${glass} rounded-xl p-3 flex items-center justify-between gap-3`}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{worker.name}</div>
                        <div className={`text-xs ${sub}`}>{worker.completed} завершённых · средний чек {worker.averageCheck.toLocaleString('ru')} ₽</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold">{worker.revenue.toLocaleString('ru')} ₽</div>
                        <div className={`text-xs ${sub}`}>выручка</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className={`text-xs ${sub} uppercase tracking-wider`}>Клиентские карточки</div>
                    <div className={`text-xs ${sub} mt-1`}>История визитов, траты, любимые услуги, заметки и долги</div>
                  </div>
                  <button
                    onClick={() => setShowCreateClient(true)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-white flex items-center gap-1.5"
                    style={{ background: primary }}
                  >
                    <Plus size={14} />
                    Новый клиент
                  </button>
                </div>
                <input
                  className={inputCls}
                  placeholder="Поиск по имени, телефону, авто, услуге"
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                />
                <div className="space-y-3 mt-3">
                  {filteredClientInsights.slice(0, 12).map((client) => {
                    const draft = clientCardDrafts[client.id] || { notes: client.notes || '', debtBalance: String(client.debtBalance || 0) };
                    return (
                      <div key={client.id} className={`${glass} rounded-2xl p-4`}>
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="font-semibold">{client.name}</div>
                            <div className={`text-xs ${sub}`}>{client.phone} · {client.car || 'Авто не указано'} {client.plate ? `· ${client.plate}` : ''}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{client.totalSpent.toLocaleString('ru')} ₽</div>
                            <div className={`text-xs ${sub}`}>{client.visits} визитов · последний {client.lastVisit}</div>
                            <button
                              type="button"
                              onClick={() => openBookingForClient(client)}
                              className="mt-2 text-xs font-medium"
                              style={{ color: primary }}
                            >
                              Добавить прошлую запись
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className={`${glass} rounded-xl px-3 py-2`}>
                            <div className={`text-[11px] ${sub}`}>Любимая услуга</div>
                            <div className="text-sm font-medium mt-1">{client.favoriteService}</div>
                          </div>
                          <div className={`${glass} rounded-xl px-3 py-2`}>
                            <div className={`text-[11px] ${sub}`}>Активных записей</div>
                            <div className="text-sm font-medium mt-1">{client.activeCount}</div>
                          </div>
                          <div className={`${glass} rounded-xl px-3 py-2`}>
                            <div className={`text-[11px] ${sub}`}>Долг</div>
                            <div className="text-sm font-medium mt-1">{client.debtBalance.toLocaleString('ru')} ₽</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <textarea
                            className={`${inputCls} h-24 resize-none`}
                            placeholder="Заметки по клиенту"
                            value={draft.notes}
                            onChange={(event) => setClientCardDrafts((current) => ({
                              ...current,
                              [client.id]: { ...draft, notes: event.target.value },
                            }))}
                          />
                          <div className="space-y-2">
                            <input
                              className={inputCls}
                              type="number"
                              placeholder="Долг клиента"
                              value={draft.debtBalance}
                              onChange={(event) => setClientCardDrafts((current) => ({
                                ...current,
                                [client.id]: { ...draft, debtBalance: event.target.value },
                              }))}
                            />
                            <button
                              onClick={() => { void handleSaveClientCard(client.id); }}
                              disabled={savingClientId === client.id}
                              className="w-full py-3 rounded-2xl text-white font-semibold disabled:opacity-60"
                              style={{ background: primary }}
                            >
                              {savingClientId === client.id ? 'Сохраняем...' : 'Сохранить карточку'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <h3 className={`text-xs font-medium ${sub} mb-3`}>РАСХОДЫ</h3>
              {expenses.map(e => (
                <div key={e.id} className={`${glass} rounded-xl p-3 mb-2 flex justify-between`}>
                  <div>
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className={`text-xs ${sub}`}>{e.category} · {e.date}</div>
                  </div>
                  <div className="font-semibold text-sm" style={{ color: '#FF6B6B' }}>−{e.amount.toLocaleString('ru')} ₽</div>
                </div>
              ))}
            </motion.div>
          )}

          {/* ── SETTINGS MAIN ── */}
          {!isAccountant && page === 'settings' && !settingsSection && (
            <motion.div key="settings-main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <h2 className="font-semibold mb-4">Настройки</h2>
              {[
                { id: 'company', icon: Building2, label: 'Профиль компании', desc: 'ATMOSFERA · ИП Иванов', color: primary },
                { id: 'boxes', icon: Box, label: 'Управление боксами', desc: `${boxes.filter(b => b.active).length} активных бокса`, color: '#F59E0B' },
                { id: 'services', icon: Sliders, label: 'Услуги и цены', desc: `${services.filter(s => s.active).length} активных услуг`, color: '#A855F7' },
                { id: 'employees', icon: Users, label: 'Сотрудники', desc: `${employeeSettings.filter(e => e.active).length} мастера`, color: accent },
                { id: 'notifications', icon: Bell, label: 'Уведомления', desc: 'Telegram, Email', color: '#EC4899' },
                { id: 'integrations', icon: Globe, label: 'Интеграции', desc: `${Object.values(integrations).filter(Boolean).length} подключено`, color: '#06B6D4' },
                { id: 'security', icon: Shield, label: 'Безопасность', desc: '2FA включена', color: '#EF4444' },
              ].map(item => (
                <motion.button key={item.id} whileTap={{ scale: 0.98 }}
                  onClick={() => setSettingsSection(item.id as SettingsSection)}
                  className={`${glass} rounded-2xl p-4 w-full text-left mb-2 flex items-center gap-3`}>
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

          {/* ── SETTINGS: COMPANY ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'company' && (
            <motion.div key="s-company" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Профиль компании</h2>
              <div className="flex flex-col items-center mb-5">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mb-2" style={{ background: primary }}>A</div>
                <button className="text-xs" style={{ color: primary }}>Изменить логотип</button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Название', key: 'name', placeholder: 'ATMOSFERA' },
                  { label: 'Юр. название', key: 'legalName', placeholder: 'ИП Иванов И.И.' },
                  { label: 'ИНН', key: 'inn', placeholder: '771234567890' },
                  { label: 'Адрес', key: 'address', placeholder: 'Москва, ул. Гаражная, 15' },
                  { label: 'Телефон', key: 'phone', placeholder: '+7 (495) 000-00-00' },
                  { label: 'Email', key: 'email', placeholder: 'info@atmosfera.ru' },
                ].map(f => (
                  <div key={f.key}>
                    <label className={`text-xs ${sub} block mb-1`}>{f.label}</label>
                    <input className={inputCls} placeholder={f.placeholder} value={(company as any)[f.key]} onChange={e => setCompany(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-4" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: BOXES ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'boxes' && (
            <motion.div key="s-boxes" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold">Управление боксами</h2>
                <button
                  onClick={handleAddBoxDraft}
                  className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                  style={{ background: `${primary}18`, color: primary }}
                >
                  <Plus size={15} />
                  Добавить бокс
                </button>
              </div>
              {boxes.length === 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-3 text-sm ${sub}`}>
                  Боксов пока нет. Добавьте первый бокс и сохраните изменения.
                </div>
              )}
              {boxes.map((box, i) => (
                <div key={box.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${primary}18` }}>
                        <Box size={14} style={{ color: primary }} />
                      </div>
                      <span className="font-medium">{box.name || `Бокс ${i + 1}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleRemoveBoxDraft(box.id)} className={`p-2 rounded-xl ${glass} text-red-500`}>
                        <X size={14} />
                      </button>
                      <button onClick={() => setBoxes(p => p.map((b, j) => j === i ? { ...b, active: !b.active } : b))}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: box.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${box.active ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Название бокса</label>
                      <input className={inputCls} value={box.name} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, name: e.target.value } : b))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Цена (₽/час)</label>
                      <input className={inputCls} type="number" value={numberInputValue(box.pricePerHour)} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, pricePerHour: numberFromInput(e.target.value) } : b))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Группа ресурсов</label>
                      <select className={selectCls} value={box.resourceGroup} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, resourceGroup: e.target.value } : b))}>
                        <option value="wash">Мойка</option>
                        <option value="detailing">Детейлинг</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className={`text-xs ${sub} block mb-1`}>Описание</label>
                    <input className={inputCls} value={box.description} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, description: e.target.value } : b))} />
                  </div>

                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: SERVICES ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'services' && (
            <motion.div key="s-services" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold">Услуги и цены</h2>
                <button
                  onClick={handleAddServiceDraft}
                  className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                  style={{ background: `${primary}18`, color: primary }}
                >
                  <Plus size={15} />
                  Добавить услугу
                </button>
              </div>
              {services.length === 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-3 text-sm ${sub}`}>
                  Услуг пока нет. Добавьте первую услугу и сохраните изменения.
                </div>
              )}
              {services.map((service, i) => (
                <div key={service.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${primary}18` }}>
                        <Sliders size={14} style={{ color: primary }} />
                      </div>
                      <span className="font-medium">{service.name || `Услуга ${i + 1}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleRemoveServiceDraft(service.id)} className={`p-2 rounded-xl ${glass} text-red-500`}>
                        <X size={14} />
                      </button>
                      <button onClick={() => setServicesState(p => p.map((item, j) => j === i ? { ...item, active: !item.active } : item))}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: service.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${service.active ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Название услуги</label>
                      <input className={inputCls} value={service.name} onChange={e => setServicesState(p => p.map((item, j) => j === i ? { ...item, name: e.target.value } : item))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Тип услуги</label>
                      <select
                        className={selectCls}
                        value={service.category}
                        onChange={e => setServicesState(p => p.map((item, j) => j === i
                          ? {
                            ...item,
                            category: e.target.value,
                            resourceGroup: serviceResourceGroupForCategory(e.target.value),
                          }
                          : item))}
                      >
                        {SERVICE_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                      <input className={inputCls} type="number" value={numberInputValue(service.price)} onChange={e => setServicesState(p => p.map((item, j) => j === i ? { ...item, price: numberFromInput(e.target.value) } : item))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Длительность (мин)</label>
                      <input className={inputCls} type="number" value={numberInputValue(service.duration)} onChange={e => setServicesState(p => p.map((item, j) => j === i ? { ...item, duration: numberFromInput(e.target.value) } : item))} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className={`text-xs ${sub} block mb-1`}>Описание</label>
                    <input className={inputCls} value={service.desc} onChange={e => setServicesState(p => p.map((item, j) => j === i ? { ...item, desc: e.target.value } : item))} />
                  </div>
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: EMPLOYEES ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'employees' && (
            <motion.div key="s-employees" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Сотрудники</h2>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-medium">Нанять сотрудника</div>
                    <div className={`text-xs ${sub}`}>Создайте логин и пароль для нового мастера</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
                    <Plus size={18} style={{ color: accent }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Роль</label>
                    <select
                      className={selectCls}
                      value={newEmployee.role}
                      onChange={e => setNewEmployee(p => ({ ...p, role: e.target.value as 'admin' | 'worker' | 'accountant' }))}
                    >
                      <option value="worker">Мастер</option>
                      <option value="admin">Администратор</option>
                      <option value="accountant">Бухгалтер</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Имя</label>
                    <input className={inputCls} value={newEmployee.name} onChange={e => setNewEmployee(p => ({ ...p, name: e.target.value }))} placeholder="Иван Иванов" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Логин</label>
                    <input className={inputCls} value={newEmployee.login} onChange={e => setNewEmployee(p => ({ ...p, login: e.target.value }))} placeholder="worker_ivan" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Пароль</label>
                    <input className={inputCls} type="password" value={newEmployee.password} onChange={e => setNewEmployee(p => ({ ...p, password: e.target.value }))} placeholder="Минимум 1 символ" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Telegram chat id</label>
                    <input className={inputCls} value={newEmployee.telegramChatId} onChange={e => setNewEmployee(p => ({ ...p, telegramChatId: e.target.value }))} placeholder="Например: 123456789" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Телефон</label>
                    <input className={inputCls} value={newEmployee.phone} onChange={e => setNewEmployee(p => ({ ...p, phone: e.target.value }))} placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Email</label>
                    <input className={inputCls} value={newEmployee.email} onChange={e => setNewEmployee(p => ({ ...p, email: e.target.value }))} placeholder="worker@atmosfera.ru" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>% от выручки</label>
                    <input className={inputCls} type="number" min={0} max={40} value={newEmployee.percent} onChange={e => setNewEmployee(p => ({ ...p, percent: Math.min(40, Math.max(0, +e.target.value)) }))} />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Оклад (₽)</label>
                    <input className={inputCls} type="number" min={0} value={newEmployee.salaryBase} onChange={e => setNewEmployee(p => ({ ...p, salaryBase: Math.max(0, +e.target.value) }))} />
                  </div>
                </div>
                <button onClick={() => void handleHireWorker()} disabled={employeeActionLoading?.type === 'hire'} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-3 disabled:opacity-60" style={{ background: accent }}>
                  <Plus size={16} />
                  Нанять сотрудника
                </button>
              </div>
              {employeeSettings.map((emp, i) => (
                <div key={emp.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ background: primary }}>{emp.name.charAt(0)}</div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{emp.name}</div>
                        <div className={`text-xs ${sub}`}>{employeeRoleLabel(emp.role)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setEmployeeSettings(p => p.map((e, j) => j === i ? { ...e, active: !e.active } : e))}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: emp.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${emp.active ? 'left-6' : 'left-1'}`} />
                      </button>
                      <button
                        disabled={employeeActionLoading?.type === 'fire' && employeeActionLoading.workerId === emp.id}
                        onClick={() => { void handleFireWorker(emp.id, emp.name); }}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 border border-red-500/20 bg-red-500/10 disabled:opacity-60"
                      >
                        Уволить
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>% от выручки (до 40)</label>
                      <input className={inputCls} type="number" min={0} max={40} value={emp.percent} onChange={e => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, percent: Math.min(40, Math.max(0, +e.target.value)) } : em))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Оклад (₽)</label>
                      <input className={inputCls} type="number" value={emp.salaryBase} onChange={e => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, salaryBase: +e.target.value } : em))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Оклад за выход (₽)</label>
                      <input className={inputCls} type="number" min={0} value={emp.salaryPerShift || 0} onChange={e => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, salaryPerShift: Math.max(0, +e.target.value) } : em))} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className={`text-xs ${sub} block mb-1`}>Telegram chat id</label>
                    <input className={inputCls} value={emp.telegramChatId} onChange={e => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, telegramChatId: e.target.value } : em))} placeholder="Например: 123456789" />
                  </div>
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: NOTIFICATIONS ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'notifications' && (
            <motion.div key="s-notifs" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Уведомления</h2>
              <div className={`text-xs font-medium ${sub} mb-2 uppercase tracking-wider`}>Каналы</div>
              {[
                { key: 'telegramBot', label: 'Telegram Bot', desc: '@atmosfera_bot' },
                { key: 'emailReports', label: 'Email отчёты', desc: 'owner@atmosfera.ru' },
                { key: 'smsReminders', label: 'SMS напоминания', desc: 'Для клиентов' },
              ].map(item => (
                <SettingRow key={item.key} label={item.label} desc={item.desc} value={notifSettings[item.key as keyof typeof notifSettings]}
                  onChange={() => setNotifSettings(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))} />
              ))}
              <div className={`text-xs font-medium ${sub} mb-2 mt-4 uppercase tracking-wider`}>Отчёты</div>
              {[
                { key: 'lowStock', label: 'Низкий остаток склада', desc: 'При снижении до 5 единиц' },
                { key: 'dailyReport', label: 'Ежедневный отчёт', desc: 'В 21:00 каждый день' },
                { key: 'weeklyReport', label: 'Еженедельный отчёт', desc: 'По понедельникам в 9:00' },
              ].map(item => (
                <SettingRow key={item.key} label={item.label} desc={item.desc} value={notifSettings[item.key as keyof typeof notifSettings]}
                  onChange={() => setNotifSettings(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))} />
              ))}
              <div className={`text-xs font-medium ${sub} mb-2 mt-4 uppercase tracking-wider`}>Напоминания</div>
              <SettingRow
                label="Автонапоминания о записях"
                desc="Ежедневный cron Vercel отправляет напоминания на завтрашние записи, а владелец может дублировать их вручную"
                value={notifSettings.bookingReminders}
                onChange={() => setNotifSettings((current) => ({ ...current, bookingReminders: !current.bookingReminders }))}
              />
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: INTEGRATIONS ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'integrations' && (
            <motion.div key="s-integrations" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Интеграции</h2>
              {[
                { key: 'telegram', label: 'Telegram Bot', desc: 'Уведомления и управление через Telegram', color: '#229ED9' },
                { key: 'yookassa', label: 'ЮКасса', desc: 'Приём онлайн-платежей', color: '#7B61FF' },
                { key: 'amoCrm', label: 'amoCRM', desc: 'Синхронизация клиентской базы', color: '#E6007E' },
                { key: 'googleCalendar', label: 'Google Календарь', desc: 'Синхронизация расписания', color: '#4285F4' },
              ].map(item => (
                <div key={item.key} className={`${glass} rounded-2xl p-4 mb-2 flex items-center gap-3`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}18` }}>
                    <Globe size={18} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className={`text-xs ${sub}`}>{item.desc}</div>
                  </div>
                  <button onClick={() => setIntegrations(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                    className="w-11 h-6 rounded-full relative transition-all shrink-0"
                    style={{ background: integrations[item.key as keyof typeof integrations] ? item.color : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${integrations[item.key as keyof typeof integrations] ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: SECURITY ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'security' && (
            <motion.div key="s-security" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Безопасность</h2>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-3`}>СМЕНА ПАРОЛЯ</div>
                <div className="space-y-3">
                  {[{ key: 'current', label: 'Текущий пароль' }, { key: 'new_', label: 'Новый пароль' }, { key: 'confirm', label: 'Повторите пароль' }].map(f => (
                    <div key={f.key}>
                      <label className={`text-xs ${sub} block mb-1`}>{f.label}</label>
                      <div className="relative">
                        <input className={inputCls} type={showPass ? 'text' : 'password'} placeholder="••••••••"
                          value={password[f.key as keyof typeof password]}
                          onChange={e => {
                            setSecurityError(null);
                            setSecuritySaved(false);
                            setPassword(p => ({ ...p, [f.key]: e.target.value }));
                          }} />
                        <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                          {showPass ? <EyeOff size={14} className={sub} /> : <Eye size={14} className={sub} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {securityError && <div className="mt-3 text-xs text-red-500">{securityError}</div>}
                {securitySaved && <div className="mt-3 text-xs text-green-600">Настройки безопасности сохранены</div>}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Двухфакторная аутентификация</div>
                    <div className={`text-xs ${sub}`}>Код подтверждения приходит в Telegram владельца</div>
                  </div>
                  <button
                    onClick={() => {
                      setSecurityError(null);
                      setSecuritySaved(false);
                      setTwoFactor(!twoFactor);
                    }}
                    className="w-11 h-6 rounded-full relative transition-all shrink-0"
                    style={{ background: twoFactor ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${twoFactor ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div className={`text-xs ${sub} mt-3`}>
                  {staffProfile?.telegramChatId
                    ? `Telegram подключён: ${staffProfile.telegramChatId}`
                    : 'Сначала привяжите Telegram владельца, иначе 2FA не включится.'}
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-3 border ${isDark ? 'border-red-400/20' : 'border-red-200'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(239,68,68,0.16)' : '#FEE2E2', color: '#EF4444' }}>
                    <AlertCircle size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">Опасная зона: полная очистка CRM</div>
                    <div className={`text-xs ${sub} mt-1`}>
                      Эта операция удалит почти все рабочие данные CRM и пересоздаст систему до стартового состояния. Сохранятся только владельцы и текущая сессия инициатора.
                    </div>
                  </div>
                </div>

                <div className={`mt-4 rounded-2xl border p-3 text-xs ${isDark ? 'border-red-400/20 bg-red-500/10 text-red-100' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  <div className="font-semibold">Будут удалены клиенты, записи, сотрудники, склад, расходы, жалобы, уведомления, лишние сессии и временные коды.</div>
                  <div className="mt-2">Подтверждение идёт в три шага: пароль владельца, код создателя из Telegram и точный ввод контрольной фразы.</div>
                </div>

                {resetPreviewRows.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {resetPreviewRows.map((item) => (
                      <div key={item.label} className={`${glass} rounded-xl px-3 py-2`}>
                        <div className={`text-[11px] ${sub}`}>{item.label}</div>
                        <div className="text-sm font-semibold mt-1">{item.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {resetWarnings.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {resetWarnings.map((warning) => (
                      <div key={warning} className={`rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-white/5 text-[#E6EEF8]' : 'bg-black/[0.03] text-[#0B1226]'}`}>
                        {warning}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Шаг 1. Введите пароль владельца</label>
                    <input
                      className={inputCls}
                      type="password"
                      placeholder="Текущий пароль"
                      value={resetPassword}
                      onChange={(e) => {
                        setResetError(null);
                        setResetInfo(null);
                        setResetPassword(e.target.value);
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void handleStartOwnerReset()}
                      disabled={resetLoadingStep === 'start'}
                      className="flex-1 py-3 rounded-2xl text-white font-semibold disabled:opacity-60"
                      style={{ background: '#EF4444' }}
                    >
                      {resetLoadingStep === 'start' ? 'Запрашиваем код...' : resetStage === 'idle' ? 'Запросить код создателя' : 'Запросить новый код'}
                    </button>
                    {resetStage !== 'idle' && (
                      <button
                        type="button"
                        onClick={clearOwnerResetFlow}
                        disabled={Boolean(resetLoadingStep)}
                        className={`flex-1 py-3 rounded-2xl font-semibold border ${isDark ? 'border-white/10 text-[#E6EEF8]' : 'border-black/10 text-[#0B1226]'} disabled:opacity-60`}
                      >
                        Сбросить сценарий
                      </button>
                    )}
                  </div>
                </div>

                {resetStage !== 'idle' && (
                  <div className="mt-4 space-y-3">
                    <div className={`text-xs ${sub}`}>
                      Шаг 2. Проверьте Telegram создателя и введите код
                      {resetCodeExpiresAt ? ` до ${resetCodeExpiresAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}.
                    </div>
                    <div className={`${glass} rounded-xl px-3 py-3`}>
                      <div className={`text-[11px] ${sub}`}>Контрольная фраза</div>
                      <div className="text-sm font-semibold mt-1 break-words">{resetRequiredPhrase || 'Фраза появится после запроса кода'}</div>
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Код создателя</label>
                      <input
                        className={inputCls}
                        type="text"
                        inputMode="numeric"
                        placeholder="6 цифр из Telegram"
                        value={resetCreatorCode}
                        onChange={(e) => {
                          setResetError(null);
                          setResetInfo(null);
                          setResetCreatorCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        }}
                      />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Введите фразу подтверждения</label>
                      <input
                        className={inputCls}
                        type="text"
                        placeholder="ПОДТВЕРЖДАЮ ПОЛНУЮ ОЧИСТКУ"
                        value={resetConfirmationPhrase}
                        onChange={(e) => {
                          setResetError(null);
                          setResetInfo(null);
                          setResetConfirmationPhrase(e.target.value);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleApproveOwnerReset()}
                      disabled={resetLoadingStep === 'approve' || resetStage === 'armed'}
                      className="w-full py-3 rounded-2xl text-white font-semibold disabled:opacity-60"
                      style={{ background: '#B91C1C' }}
                    >
                      {resetLoadingStep === 'approve' ? 'Проверяем подтверждения...' : resetStage === 'armed' ? 'Финальный шаг уже разблокирован' : 'Подтвердить и разблокировать очистку'}
                    </button>
                  </div>
                )}

                {resetStage === 'armed' && (
                  <div className={`mt-4 rounded-2xl border p-4 ${isDark ? 'border-red-400/20 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
                    <div className="text-sm font-semibold text-red-500">Финальное подтверждение</div>
                    <div className={`text-xs mt-2 ${isDark ? 'text-red-100' : 'text-red-700'}`}>
                      Будут удалены сотрудники, клиенты, все записи, склад, расходы, жалобы, уведомления, временные коды и почти все настройки CRM. Действие необратимо.
                    </div>
                    <div className={`text-xs mt-3 ${sub}`}>
                      {resetCountdown > 0
                        ? `Кнопка активируется через ${resetCountdown} сек. За это время ещё раз проверьте, что именно будет удалено.`
                        : 'Таймер завершён. Если всё верно, можно запускать полную очистку CRM.'}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleExecuteOwnerReset()}
                      disabled={resetExecuteLocked}
                      className="w-full mt-4 py-3 rounded-2xl text-white font-semibold disabled:opacity-50"
                      style={{ background: '#991B1B' }}
                    >
                      {resetLoadingStep === 'execute'
                        ? 'Удаляем данные...'
                        : resetCountdown > 0
                          ? `Кнопка активируется через ${resetCountdown} сек`
                          : 'Подтверждаю полную очистку CRM'}
                    </button>
                  </div>
                )}

                {resetError && <div className="mt-4 text-xs text-red-500">{resetError}</div>}
                {resetInfo && <div className="mt-4 text-xs text-green-600">{resetInfo}</div>}
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
                disabled={Boolean(password.current || password.new_ || password.confirm) && (!password.current || !password.new_ || !password.confirm || password.new_.length < 8 || password.new_ !== password.confirm)}
                className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#EF4444' }}
              >
                <Shield size={16} />{securitySaved ? 'Сохранено!' : password.current || password.new_ || password.confirm ? 'Изменить пароль' : 'Сохранить безопасность'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <div className={`fixed bottom-0 left-0 right-0 z-10 ${glass} border-t ${isDark ? 'border-white/10' : 'border-black/5'} flex`}>
        {(isAccountant
          ? [
              { id: 'dashboard', icon: Home, label: 'Главная' },
              { id: 'calendar', icon: CalendarDays, label: 'Календарь' },
              { id: 'payroll', icon: Users, label: 'Зарплаты' },
              { id: 'stock', icon: Box, label: 'Склад' },
              { id: 'reports', icon: FileText, label: 'Отчёты' },
            ]
          : [
              { id: 'dashboard', icon: Home, label: 'Главная' },
              { id: 'calendar', icon: CalendarDays, label: 'Календарь' },
              { id: 'payroll', icon: Users, label: 'Зарплаты' },
              { id: 'stock', icon: Box, label: 'Склад' },
              { id: 'reports', icon: FileText, label: 'Отчёты' },
              { id: 'settings', icon: Settings, label: 'Настройки' },
            ]).map(t => (
          <button key={t.id} onClick={() => { setPage(t.id as OwnerPage); setSettingsSection(null); }} className="flex-1 py-3 flex flex-col items-center gap-0.5">
            <t.icon size={18} style={{ color: page === t.id ? primary : undefined }} className={page !== t.id ? sub : ''} />
            <span className="text-[10px]" style={{ color: page === t.id ? primary : undefined }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── NOTIFICATIONS ── */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowNotifications(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl max-h-[70vh] overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0" style={{ background: surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Уведомления</h3>
                <button onClick={() => setShowNotifications(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="p-4 space-y-2">
                {ownerNotifications.length === 0 ? (
                  <p className={`text-sm ${sub} text-center py-8`}>Нет уведомлений</p>
                ) : ownerNotifications.map(n => (
                  <div key={n.id} onClick={() => markNotificationRead(n.id)} className={`${glass} rounded-xl p-3 cursor-pointer border-l-2`} style={{ borderLeftColor: n.read ? 'transparent' : primary }}>
                    <p className="text-sm">{n.message}</p>
                    <p className={`text-xs ${sub} mt-1`}>{n.createdAt.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── ADD EXPENSE ── */}
      <AnimatePresence>
        {showAddExpense && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm relative overflow-hidden`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <AnimatePresence>
                {expenseAdded && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="absolute inset-0 flex items-center justify-center z-10"
                    style={{ background: isDark ? 'rgba(14,22,36,0.97)' : 'rgba(255,255,255,0.97)', borderRadius: '1.5rem 1.5rem 0 0' }}>
                    <div className="text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${accent}20` }}>
                        <Check size={28} style={{ color: accent }} />
                      </motion.div>
                      <div className="font-semibold">Расход добавлен!</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Добавить расход</h3>
                <button onClick={() => setShowAddExpense(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div><label className={`text-xs ${sub} block mb-1`}>Название</label><input className={inputCls} placeholder="Закупка химии..." value={expenseForm.title} onChange={e => setExpenseForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>Сумма (₽)</label><input className={inputCls} type="number" placeholder="0" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>Категория</label><select className={selectCls} value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))}>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className={`text-xs ${sub} block mb-1`}>Примечание</label><input className={inputCls} placeholder="Необязательно..." value={expenseForm.note} onChange={e => setExpenseForm(p => ({ ...p, note: e.target.value }))} /></div>
              </div>
              <button onClick={handleAddExpense} disabled={!expenseForm.title || !expenseForm.amount} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: '#FF6B6B' }}>Добавить расход</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FINANCE PANEL ── */}
      <AnimatePresence>
        {showFinancePanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowFinancePanel(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl max-h-[85vh] overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0" style={{ background: isDark ? '#0E1624' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Финансы</h3>
                <button onClick={() => setShowFinancePanel(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="p-4 space-y-4">
                {/* Сводка */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>Выручка</div>
                    <div className="font-bold text-lg" style={{ color: accent }}>{completedBookings.reduce((s, b) => s + b.price, 0).toLocaleString('ru')} ₽</div>
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>Расходы</div>
                    <div className="font-bold text-lg" style={{ color: '#FF6B6B' }}>{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString('ru')} ₽</div>
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>Доп. доходы</div>
                    <div className="font-bold text-lg" style={{ color: primary }}>{incomes.reduce((s, i) => s + i.amount, 0).toLocaleString('ru')} ₽</div>
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>Прибыль</div>
                    <div className="font-bold text-lg" style={{ color: completedBookings.reduce((s, b) => s + b.price, 0) + incomes.reduce((s, i) => s + i.amount, 0) - expenses.reduce((s, e) => s + e.amount, 0) >= 0 ? accent : '#FF6B6B' }}>
                      {(completedBookings.reduce((s, b) => s + b.price, 0) + incomes.reduce((s, i) => s + i.amount, 0) - expenses.reduce((s, e) => s + e.amount, 0)).toLocaleString('ru')} ₽
                    </div>
                  </div>
                </div>

                {/* Кнопки действий */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setShowFinancePanel(false); setShowAddExpense(true); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
                    style={{ background: 'rgba(255,107,107,0.12)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,107,107,0.2)' }}>
                      <DollarSign size={20} style={{ color: '#FF6B6B' }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: '#FF6B6B' }}>Добавить расход</span>
                  </button>
                  <button onClick={() => setShowAddIncome(true)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
                    style={{ background: `${primary}12` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${primary}20` }}>
                      <TrendingUp size={20} style={{ color: primary }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: primary }}>Добавить доход</span>
                  </button>
                </div>

                {/* Последние расходы */}
                {expenses.length > 0 && (
                  <div>
                    <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>Последние расходы</div>
                    <div className="space-y-2">
                      {expenses.slice(0, 5).map(e => (
                        <div key={e.id} className={`${glass} rounded-xl p-3 flex justify-between items-center`}>
                          <div>
                            <div className="text-sm font-medium">{e.title}</div>
                            <div className={`text-xs ${sub}`}>{e.category} · {e.date}</div>
                          </div>
                          <div className="font-semibold text-sm" style={{ color: '#FF6B6B' }}>−{e.amount.toLocaleString('ru')} ₽</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Последние доходы */}
                {incomes.length > 0 && (
                  <div>
                    <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>Последние доходы</div>
                    <div className="space-y-2">
                      {incomes.slice(0, 5).map(inc => (
                        <div key={inc.id} className={`${glass} rounded-xl p-3 flex justify-between items-center`}>
                          <div>
                            <div className="text-sm font-medium">{inc.source}</div>
                            <div className={`text-xs ${sub}`}>{inc.date}{inc.note ? ` · ${inc.note}` : ''}</div>
                          </div>
                          <div className="font-semibold text-sm" style={{ color: primary }}>+{inc.amount.toLocaleString('ru')} ₽</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── ADD INCOME ── */}
      <AnimatePresence>
        {showAddIncome && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Добавить доход</h3>
                <button onClick={() => { setShowAddIncome(false); setIncomeForm({ amount: '', source: '', note: '' }); }} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Сумма (₽)</label>
                  <input className={inputCls} type="number" placeholder="0" value={incomeForm.amount} onChange={e => setIncomeForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Источник / описание</label>
                  <input className={inputCls} placeholder="Аренда, продажа товара..." value={incomeForm.source} onChange={e => setIncomeForm(p => ({ ...p, source: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Примечание</label>
                  <input className={inputCls} placeholder="Необязательно" value={incomeForm.note} onChange={e => setIncomeForm(p => ({ ...p, note: e.target.value }))} />
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!incomeForm.amount || !incomeForm.source.trim()) return;
                  try {
                    await addIncome({ amount: Number(incomeForm.amount), source: incomeForm.source.trim(), note: incomeForm.note.trim() || undefined, date: todayLabel });
                    setShowAddIncome(false);
                    setIncomeForm({ amount: '', source: '', note: '' });
                    setBottomToast(`Доход "${incomeForm.source.trim()}" добавлен на сумму ${Number(incomeForm.amount).toLocaleString('ru')} ₽`);
                    setTimeout(() => setBottomToast(null), 4000);
                  } catch (err) {
                    setBottomToast(err instanceof Error ? err.message : 'Не удалось добавить доход');
                    setTimeout(() => setBottomToast(null), 4000);
                  }
                }}
                disabled={!incomeForm.amount || !incomeForm.source.trim()}
                className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50"
                style={{ background: primary }}
              >
                Добавить доход
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADD STOCK ── */}
      <AnimatePresence>
        {showAddStock && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Добавить товар</h3>
                <button onClick={() => setShowAddStock(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div><label className={`text-xs ${sub} block mb-1`}>Название</label><input className={inputCls} placeholder="Автошампунь..." value={stockForm.name} onChange={e => setStockForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={`text-xs ${sub} block mb-1`}>Количество</label><input className={inputCls} type="number" value={stockForm.qty} onChange={e => setStockForm(p => ({ ...p, qty: e.target.value }))} /></div>
                  <div><label className={`text-xs ${sub} block mb-1`}>Единица</label><select className={selectCls} value={stockForm.unit} onChange={e => setStockForm(p => ({ ...p, unit: e.target.value }))}>{STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Цена за ед. (₽)</label><input className={inputCls} type="number" value={stockForm.unitPrice} onChange={e => setStockForm(p => ({ ...p, unitPrice: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>Категория</label><select className={selectCls} value={stockForm.category} onChange={e => setStockForm(p => ({ ...p, category: e.target.value }))}>{STOCK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <button onClick={handleAddStock} disabled={!stockForm.name || !stockForm.qty} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: primary }}>Добавить на склад</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WRITE OFF ── */}
      <AnimatePresence>
        {showWriteOff && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-2xl p-5 w-full max-w-xs`}>
              <h3 className="font-semibold mb-1">Списать товар</h3>
              <p className={`text-sm ${sub} mb-4`}>{stockItems.find(s => s.id === showWriteOff)?.name}</p>
              <div className="mb-4"><label className={`text-xs ${sub} block mb-1`}>Количество</label><input className={inputCls} type="number" min={1} value={writeOffQty} onChange={e => setWriteOffQty(e.target.value)} /></div>
              <div className="flex gap-2">
                <button onClick={() => setShowWriteOff(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>Отмена</button>
                <button onClick={handleWriteOff} className="flex-1 py-2.5 rounded-xl text-sm text-white" style={{ background: '#FF6B6B' }}>Списать</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CREATE CLIENT ── */}
      <AnimatePresence>
        {showCreateClient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Новый клиент</h3>
                <button
                  onClick={() => {
                    setShowCreateClient(false);
                    setCreateClientErrors({});
                  }}
                  className={`p-1.5 rounded-lg ${glass}`}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3 mb-4">
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
                    placeholder="Внутренняя заметка"
                    value={createClientForm.notes}
                    onChange={(event) => setCreateClientForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </div>
                <div className={`rounded-2xl px-3 py-3 text-sm ${glass}`}>
                  После создания откроется форма прошлой записи для истории клиента.
                </div>
                {createClientErrors.general && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} />{createClientErrors.general}</div>
                )}
              </div>
              <button
                onClick={() => { void handleCreateClient(); }}
                disabled={createClientSaving}
                className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50"
                style={{ background: primary }}
              >
                {createClientSaving ? 'Сохранение...' : 'Создать клиента'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CREATE BOOKING ── */}
      <AnimatePresence>
        {showCreateBooking && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCreateBooking(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto ${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-4`}
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-base">Создать запись</h3>
                <button onClick={() => setShowCreateBooking(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4 pb-32">
                <div><label className={`text-xs ${sub} block mb-1`}>Клиент</label><input className={inputCls} placeholder="Иван Иванов" value={bookingForm.clientName} onChange={e => setBookingForm(p => ({ ...p, clientName: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>Телефон (необязательно)</label><input className={inputCls} type="tel" placeholder="+7 (___) ___-__-__" value={bookingForm.clientPhone} onChange={e => setBookingForm(p => ({ ...p, clientPhone: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={`text-xs ${sub} block mb-1`}>Автомобиль</label><input className={inputCls} placeholder="Lada Vesta" value={bookingForm.car} onChange={e => setBookingForm(p => ({ ...p, car: e.target.value }))} /></div>
                  <div><label className={`text-xs ${sub} block mb-1`}>Госномер</label><input className={inputCls} maxLength={9} placeholder="A123BC777" value={bookingForm.plate} onChange={e => setBookingForm(p => ({ ...p, plate: normalizePlateInput(e.target.value) }))} /></div>
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Услуга</label><select className={selectCls} value={bookingForm.service} onChange={e => {
                  const svc = services.find(s => s.id === e.target.value);
                  setBookingForm(p => ({
                    ...p,
                    service: e.target.value,
                    price: svc?.price || 0,
                    duration: svc?.duration || 30,
                  }));
                }}>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>{service.name} — {service.price.toLocaleString('ru')} ₽</option>
                  ))}
                </select></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label><input className={inputCls} type="number" value={numberInputValue(bookingForm.price)} onChange={e => setBookingForm(p => ({ ...p, price: numberFromInput(e.target.value) }))} /></div>
                  <div><label className={`text-xs ${sub} block mb-1`}>Длит. (мин)</label><input className={inputCls} type="number" value={numberInputValue(bookingForm.duration)} onChange={e => setBookingForm(p => ({ ...p, duration: numberFromInput(e.target.value) }))} /></div>
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Статус</label><select className={selectCls} value={bookingForm.status} onChange={e => setBookingForm(p => ({ ...p, status: e.target.value as BookingStatus }))}>
                  {OWNER_BOOKING_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select></div>
                <div className="mb-4">
                  <label className={`text-xs ${sub} block mb-1`}>Дата</label>
                  <input className={inputCls} type="date" value={toISODate(bookingForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setBookingForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Время</label><select className={selectCls} value={bookingForm.time} onChange={e => setBookingForm(p => ({ ...p, time: e.target.value }))}><option value="">--:--</option>{TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}</select></div>

                <div><label className={`text-xs ${sub} block mb-1`}>{bookingFormLocationLabel}</label><select className={selectCls} value={bookingForm.box} onChange={e => setBookingForm(p => ({ ...p, box: e.target.value }))}>{bookingFormBoxes.map(box => <option key={box.id} value={box.name}>{box.name}</option>)}</select></div>
                {bookingForm.status === 'completed' && (
                  <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                    <span>Оплачено</span>
                    <input
                      type="checkbox"
                      checked={bookingForm.paymentSettled}
                      onChange={(event) => setBookingForm((current) => ({ ...current, paymentSettled: event.target.checked }))}
                    />
                  </label>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-xs ${sub} block`}>Назначить мастеров</label>
                    <span className={`text-xs ${sub}`}>Выбрано: {bookingWorkers.length}</span>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {workers.filter(worker => worker.role === 'worker' && worker.active).map(worker => {
                      const assigned = bookingWorkers.find(item => item.id === worker.id);
                      return (
                        <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{worker.name}</div>
                              <div className={`text-xs ${sub}`}>{worker.specialty || worker.experience || 'Мастер'}</div>
                            </div>
                            <button
                              onClick={() => assigned
                                ? setBookingWorkers(current => current.filter(item => item.id !== worker.id))
                                : setBookingWorkers(current => [...current, { id: worker.id, percent: worker.defaultPercent }])}
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
                                onChange={e => setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.max(0, Math.min(40, Number(e.target.value) || 0)) } : item))}
                                className={`flex-1 ${inputCls} py-1.5`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <button onClick={handleCreateBooking} className="w-full py-3.5 rounded-2xl font-semibold text-white" style={{ background: primary }}>
                {bookingForm.status === 'completed' ? 'Добавить в историю' : 'Создать запись'}
              </button>
            </motion.div>
          </>
        )}

      </AnimatePresence>

      {/* BOOKING DETAIL MODAL */}
      <AnimatePresence>
        {showBookingDetail && selectedBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Запись</h3>
                <button onClick={() => setShowBookingDetail(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div className={`${glass} rounded-2xl p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-sm">{selectedBooking.clientName || 'Клиент без имени'}</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${ownerStatusBadge(selectedBooking.status)}`}>{ownerStatusLabel(selectedBooking.status)}</span>
                  </div>
                  <div className={`text-xs ${sub} mb-2`}>{selectedBooking.service} • {selectedBooking.date} • {selectedBooking.time}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>Стоимость</div>
                      <div>{selectedBooking.price.toLocaleString('ru')} ₽</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>Оплата</div>
                      <div>{selectedBooking.paymentSettled ? (selectedBooking.paymentType === 'cash' ? 'Наличные' : selectedBooking.paymentType === 'card' ? 'Карта' : 'Онлайн') : 'Не оплачено'}</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>Авто</div>
                      <div>{selectedBooking.car || 'Не указано'}</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>Номер</div>
                      <div>{selectedBooking.plate || 'Не указан'}</div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className={sub}>Бокс: {selectedBooking.box || 'Не выбран'}</div>
                    <div className={sub}>Длительность: {selectedBooking.duration} мин</div>
                    <div className={sub}>Мастера: {selectedBooking.workers.length ? selectedBooking.workers.map(w => `${w.workerName} ${w.percent}%`).join(', ') : 'Не назначены'}</div>
                    <div className={sub}>Телефон: {selectedBooking.clientPhone || 'Не указан'}</div>
                    <div className={sub}>Комментарий: {selectedBooking.notes?.trim() || 'Нет'}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OWNER NEW BOOKING MODAL ── */}
      <AnimatePresence>
        {showOwnerNewBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) closeOwnerNewBookingModal(); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl w-full max-w-sm relative flex flex-col`}>
              <div className="sticky top-0 z-10 p-4 border-b flex justify-between items-center" style={{ background: surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Новая запись</h3>
                <button onClick={closeOwnerNewBookingModal} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              {/* Scrollable content container */}
              <div
                className="overflow-y-auto"
                style={{ maxHeight: window.innerWidth < 768 ? `${modalMaxHeight}px` : undefined }}
              >
                <AnimatePresence>
                  {ownerNewBookingSaveSuccess && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center z-10" style={{ background: isDark ? 'rgba(14,22,36,0.95)' : 'rgba(255,255,255,0.95)' }}>
                      <div className="text-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${primary}20` }}>
                          <Check size={28} style={{ color: primary }} />
                        </motion.div>
                        <div className="font-semibold">Запись сохранена!</div>
                        <div className={`text-sm ${sub} mt-1`}>{ownerNewBookingSaveSuccess === 'notify' ? 'Мастера уведомлены' : OWNER_BOOKING_STATUS_OPTIONS.find((o) => o.value === ownerNewBookingForm.status)?.label || ownerNewBookingForm.status}</div>
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
                    <input className={`${inputCls} ${ownerNewBookingErrors[f.key as keyof typeof ownerNewBookingErrors] ? 'border-red-400' : ''}`} type={f.type} placeholder={f.placeholder}
                      maxLength={f.key === 'plate' ? 9 : undefined}
                      value={(ownerNewBookingForm as any)[f.key]} onChange={e => {
                        const nextValue = f.key === 'plate' ? normalizePlateInput(e.target.value) : e.target.value;
                        setOwnerNewBookingForm(p => ({ ...p, [f.key]: nextValue }));
                        if (f.key === 'clientName' || f.key === 'clientPhone' || f.key === 'car' || f.key === 'plate') {
                          setOwnerNewBookingErrors((current) => ({ ...current, [f.key]: undefined, general: undefined }));
                        }
                      }} />
                    {(f.key === 'clientName' && ownerNewBookingErrors.clientName) && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.clientName}</div>}
                    {(f.key === 'clientPhone' && ownerNewBookingErrors.clientPhone) && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.clientPhone}</div>}
                    {(f.key === 'car' && ownerNewBookingErrors.car) && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.car}</div>}
                    {(f.key === 'plate' && ownerNewBookingErrors.plate) && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.plate}</div>}
                  </div>
                ))}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Услуга</label>
                  <select className={selectCls} value={ownerNewBookingForm.serviceId} onChange={e => {
                    const svc = services.find(s => s.id === e.target.value);
                    const nextBoxes = ownerBookingBoxes(e.target.value, services, boxes);
                    setOwnerNewBookingForm(p => ({
                      ...p,
                      serviceId: e.target.value,
                      service: svc?.name || '',
                      price: svc?.price || 0,
                      duration: svc?.duration || 30,
                      box: nextBoxes[0]?.name || '',
                    }));
                    setOwnerNewBookingErrors((current) => ({ ...current, general: undefined }));
                  }}>
                    <option value="">Выберите услугу</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} — {s.price.toLocaleString('ru')} ₽</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                    <input className={inputCls} type="number" value={numberInputValue(ownerNewBookingForm.price)} onChange={e => setOwnerNewBookingForm(p => ({ ...p, price: numberFromInput(e.target.value) }))} />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Длит. (мин)</label>
                    <input className={inputCls} type="number" value={numberInputValue(ownerNewBookingForm.duration)} onChange={e => setOwnerNewBookingForm(p => ({ ...p, duration: numberFromInput(e.target.value) }))} />
                  </div>
                </div>
                <div className={`rounded-2xl px-3 py-3 text-sm ${glass}`}>
                  Для базы клиентов можно выбрать статус "Прошлая завершённая": такая запись сохраняется в истории и будет видна клиенту после первого входа по этому телефону.
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Статус записи</label>
                  <select
                    className={selectCls}
                    value={ownerNewBookingForm.status}
                    onChange={(event) => {
                      const nextStatus = event.target.value as BookingStatus;
                      setOwnerNewBookingForm((current) => ({
                        ...current,
                        status: nextStatus,
                        date: nextStatus === 'admin_review' ? current.date : (current.date || todayLabel),
                        time: nextStatus === 'admin_review' ? current.time : (current.time || '10:00'),
                        box: ['new', 'confirmed', 'scheduled', 'in_progress'].includes(nextStatus) ? (current.box || ownerNewBookingFormBoxes[0]?.name || '') : current.box,
                      }));
                      setOwnerNewBookingErrors((current) => ({ ...current, date: undefined, time: undefined, general: undefined }));
                    }}
                  >
                    {OWNER_BOOKING_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Дата (можно выбрать прошлую)</label>
                  <input className={inputCls} type="date" value={toISODate(ownerNewBookingForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setOwnerNewBookingForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                    setOwnerNewBookingErrors((current) => ({ ...current, date: undefined, general: undefined }));
                  }} />
                  {ownerNewBookingErrors.date && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.date}</div>}
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Время (выпадающий список)</label>
                  <select className={selectCls} value={ownerNewBookingForm.time} onChange={e => {
                    setOwnerNewBookingForm(p => ({ ...p, time: e.target.value }));
                    setOwnerNewBookingErrors((current) => ({ ...current, time: undefined, general: undefined }));
                  }}>
                    <option value="">--:--</option>
                    {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                  {ownerNewBookingErrors.time && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.time}</div>}
                </div>
                {(ownerNewBookingForm.date.trim() && ownerNewBookingForm.time.trim()) ? (
                  ownerServiceResourceGroup(ownerNewBookingForm.serviceId, services) === 'detailing' ? (
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>{ownerNewBookingLocationLabel}</label>
                      <div className={`${inputCls} ${sub}`}>Для детейлинга помещение подставляется автоматически</div>
                    </div>
                  ) : (
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>{ownerNewBookingLocationLabel}</label>
                      <select className={selectCls} value={ownerNewBookingForm.box} onChange={e => setOwnerNewBookingForm(p => ({ ...p, box: e.target.value }))}>
                        {ownerNewBookingFormBoxes.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                  )
                ) : (
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>{ownerNewBookingLocationLabel}</label>
                    <div className={`${inputCls} ${sub}`}>Помещение можно выбрать позже, когда будет согласовано время</div>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-xs ${sub} block`}>Назначить мастеров</label>
                    <span className={`text-xs ${sub}`}>Сумма: {totalOwnerNewBookingPercent}%</span>
                  </div>
                  <div className="space-y-2">
                    {ownerNewBookingMasterWorkers.filter(worker => worker.active).map(worker => {
                      const assigned = ownerNewBookingWorkers.find(item => item.id === worker.id);
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
                                ? setOwnerNewBookingWorkers(current => current.filter(item => item.id !== worker.id))
                                : setOwnerNewBookingWorkers(current => [...current, { id: worker.id, percent: worker.defaultPercent }])}
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
                                onChange={e => setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.min(40, Math.max(0, +e.target.value)) } : item))}
                                className={`flex-1 ${inputCls} py-1.5`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {totalOwnerNewBookingPercent > 100 && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} />Сумма процентов мастеров превышает 100%</div>
                )}
                {ownerNewBookingErrors.general && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} />{ownerNewBookingErrors.general}</div>
                )}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Примечание</label>
                  <input className={inputCls} placeholder="Доп. информация..." value={ownerNewBookingForm.notes} onChange={e => setOwnerNewBookingForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div className="p-4 space-y-2">
                <button onClick={() => { void handleSaveOwnerNewBooking(true); }} disabled={!ownerNewBookingForm.serviceId || totalOwnerNewBookingPercent > 100 || ownerNewBookingSaving} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50 min-h-[44px] min-w-[44px]" style={{ background: primary }}>
                  {ownerNewBookingSaving ? 'Сохранение...' : 'Сохранить и уведомить'}
                </button>
                <button onClick={() => { void handleSaveOwnerNewBooking(false); }} disabled={!ownerNewBookingForm.serviceId || totalOwnerNewBookingPercent > 100 || ownerNewBookingSaving} className={`w-full py-3 rounded-2xl font-medium ${glass} disabled:opacity-50 min-h-[44px] min-w-[44px]`}>
                  Сохранить без уведомления
                </button>
              </div>
              </div>{/* end overflow-y-auto */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EXPORT TOAST ── */}
      <AnimatePresence>
        {exportSuccess && (
          <motion.div initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}
            className="fixed top-16 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${accent}40` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}20` }}><Check size={16} style={{ color: accent }} /></div>
              <div>
                <div className="text-sm font-medium">{exportSuccess.title}</div>
                <div className={`text-xs ${sub}`}>{exportSuccess.subtitle}</div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOTTOM TOAST ── */}
      <AnimatePresence>
        {bottomToast && (
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-20 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${accent}40` }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}20` }}><Check size={14} style={{ color: accent }} /></div>
            <div className="flex-1 text-sm">{bottomToast}</div>
            <button onClick={() => setBottomToast(null)}><X size={14} className={sub} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SETTINGS SAVED TOAST ── */}
      <AnimatePresence>
        {settingsSaved && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-16 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${primary}40` }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${primary}20` }}><Check size={14} style={{ color: primary }} /></div>
            <span className="text-sm font-medium">Настройки сохранены</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


