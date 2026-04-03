import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Sun, Moon, Plus, X, Check, TrendingUp, Users, Box,
  Settings, BarChart3, ChevronRight, Download, DollarSign, Package,
  AlertCircle, Home, FileText, ArrowLeft, Building2, Sliders, Shield,
  Globe, Save, Eye, EyeOff
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import { useApp, type OwnerDatabaseResetPreview } from '../../context/AppContext';
import { COMPLAINT_THRESHOLD, getComplaintPenaltyState, isComplaintActive } from '../../utils/complaints';
import { formatDate, getLastNDates } from '../../utils/date';

type OwnerPage = 'dashboard' | 'payroll' | 'stock' | 'reports' | 'settings';
type SettingsSection = null | 'company' | 'boxes' | 'services' | 'employees' | 'notifications' | 'integrations' | 'security';
type OwnerExportKind = 'report' | 'pdf';

const EXPENSE_CATEGORIES = ['Расходные материалы', 'Аренда', 'Коммунальные', 'Зарплаты', 'Оборудование', 'Прочее'];
const STOCK_CATEGORIES = ['Химия', 'Расходники', 'Оборудование'];
const STOCK_UNITS = ['л', 'кг', 'шт', 'фл', 'м', 'уп'];

export function OwnerApp() {
  const {
    isDark,
    toggleTheme,
    bookings,
    expenses,
    addExpense,
    stockItems,
    addStockItem,
    writeOffStock,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    addBooking,
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
    saveOwnerNotificationSettings,
    saveOwnerIntegrations,
    saveOwnerSecurity,
    changePassword,
    requestOwnerDatabaseReset,
    approveOwnerDatabaseReset,
    executeOwnerDatabaseReset,
    hireWorker,
    fireWorker,
    staffProfile,
    activeSessions,
    refreshActiveSessions,
    revokeSession,
    downloadOwnerExport,
    sendOwnerExportToTelegram,
    sendOwnerSummaryReport,
    todayLabel,
    tomorrowLabel,
  } = useApp();

  const [page, setPage] = useState<OwnerPage>('dashboard');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState<string | null>(null);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
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
  const [stockForm, setStockForm] = useState({ name: '', qty: '', unit: 'шт', unitPrice: '', category: STOCK_CATEGORIES[0] });
  const [bookingForm, setBookingForm] = useState({
    clientName: '',
    clientPhone: '',
    service: 's1',
    date: tomorrowLabel,
    time: '10:00',
    box: liveBoxes[0]?.name || 'Бокс 1',
  });

  // Settings state
  const [company, setCompany] = useState(settings.ownerCompany);
  const [boxes, setBoxes] = useState(liveBoxes);
  const [services, setServicesState] = useState(liveServices);
  const [employeeSettings, setEmployeeSettings] = useState(workers.map(worker => ({ id: worker.id, name: worker.name, percent: worker.defaultPercent, salaryBase: worker.salaryBase, active: worker.active, telegramChatId: worker.telegramChatId })));
  const [notifSettings, setNotifSettings] = useState(settings.ownerNotificationSettings);
  const [integrations, setIntegrations] = useState(settings.ownerIntegrations);
  const [showPass, setShowPass] = useState(false);
  const [password, setPassword] = useState({ current: '', new_: '', confirm: '' });
  const [twoFactor, setTwoFactor] = useState(settings.ownerSecurity.twoFactor);
  const [penaltyForm, setPenaltyForm] = useState({ workerId: workers[0]?.id || '', title: '', reason: '' });
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    login: '',
    password: '',
    percent: 40,
    salaryBase: 0,
    phone: '',
    email: '',
    telegramChatId: '',
  });

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
    setEmployeeSettings(workers.map(worker => ({ id: worker.id, name: worker.name, percent: worker.defaultPercent, salaryBase: worker.salaryBase, active: worker.active, telegramChatId: worker.telegramChatId })));
    setPenaltyForm(current => ({
      ...current,
      workerId: workers.some((worker) => worker.id === current.workerId) ? current.workerId : workers[0]?.id || '',
    }));
  }, [workers]);
  useEffect(() => setNotifSettings(settings.ownerNotificationSettings), [settings.ownerNotificationSettings]);
  useEffect(() => setIntegrations(settings.ownerIntegrations), [settings.ownerIntegrations]);
  useEffect(() => setTwoFactor(settings.ownerSecurity.twoFactor), [settings.ownerSecurity.twoFactor]);
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

  const ownerNotifications = notifications.filter(n => n.recipientRole === 'owner');
  const unreadCount = ownerNotifications.filter(n => !n.read).length;
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const todayBookings = bookings.filter(b => b.date === todayLabel);
  const todayRevenue = todayBookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.price, 0);
  const totalRevenue = completedBookings.reduce((s, b) => s + b.price, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const profit = totalRevenue - totalExpenses;
  const totalStockValue = stockItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const payrollRows = workers.map(worker => {
    const workerBookings = completedBookings.filter((booking) => booking.workers.some((item) => item.workerId === worker.id));
    const earned = workerBookings.reduce((sum, booking) => {
      const bookingWorker = booking.workers.find((item) => item.workerId === worker.id);
      return sum + Math.round(booking.price * (bookingWorker?.percent || 0) / 100);
    }, 0);
    const workerPenalties = penalties.filter((penalty) => penalty.workerId === worker.id && isComplaintActive(penalty));
    const complaintState = getComplaintPenaltyState(worker.defaultPercent, workerPenalties);
    return {
      worker,
      workerBookings,
      earned,
      complaintState,
      payout: Math.max(0, earned + worker.salaryBase),
      recentPenalties: workerPenalties.slice(0, 3),
    };
  });
  const payrollTotal = payrollRows.reduce((sum, row) => sum + row.payout, 0);
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

    if (!name || !login || !password) {
      setBottomToast('Заполните имя, логин и пароль сотрудника');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }

    await hireWorker({
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
      name: '',
      login: '',
      password: '',
      percent: 40,
      salaryBase: 0,
      phone: '',
      email: '',
      telegramChatId: '',
    });
    setBottomToast(`Сотрудник ${name} добавлен. Логин: ${login}`);
    setTimeout(() => setBottomToast(null), 4000);
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
    setStockForm({ name: '', qty: '', unit: 'шт', unitPrice: '', category: STOCK_CATEGORIES[0] });
    setBottomToast(`Товар "${stockForm.name}" добавлен на склад`);
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
    const confirmed = window.confirm(`Уволить мастера "${workerName}"? Доступ будет отключён, а будущие записи снимутся с мастера.`);
    if (!confirmed) return;
    await fireWorker(workerId);
    setBottomToast(`Мастер ${workerName} уволен`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleCreateBooking = async () => {
    const svc = services.find((service) => service.id === bookingForm.service);
    const clientName = bookingForm.clientName.trim();
    const clientPhone = bookingForm.clientPhone.trim();
    if (!svc || !clientName || !clientPhone) return;

    const booking = await addBooking({
      clientId: '',
      clientName,
      clientPhone,
      service: svc.name,
      serviceId: bookingForm.service,
      date: bookingForm.date,
      time: bookingForm.time,
      duration: svc.duration,
      price: svc.price,
      status: 'scheduled',
      workers: [],
      box: bookingForm.box,
      paymentType: 'cash',
    });
    await addNotification({ recipientRole: 'client', recipientId: booking.clientId, message: `Создана запись на ${svc.name} — ${bookingForm.date} в ${bookingForm.time}`, read: false });
    setShowCreateBooking(false);
    setBookingForm({
      clientName: '',
      clientPhone: '',
      service: services[0]?.id || 's1',
      date: tomorrowLabel,
      time: '10:00',
      box: boxes[0]?.name || 'Бокс 1',
    });
    setBottomToast('Запись создана и клиент уведомлён');
    setTimeout(() => setBottomToast(null), 3000);
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
    { name: 'Запланировано', value: bookings.filter(b => b.status === 'scheduled').length, color: '#3B82F6' },
    { name: 'В работе', value: bookings.filter(b => b.status === 'in_progress').length, color: '#EAB308' },
    { name: 'Завершено', value: bookings.filter(b => b.status === 'completed').length, color: '#22C55E' },
  ].filter(s => s.value > 0);

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
    <div className={`${isDark ? 'dark' : ''} ${bg} ${text} min-h-screen flex flex-col`} data-owner-build="2026-04-03-4">
      {/* Header */}
      <div className={`sticky top-0 z-20 ${glass} px-4 py-3 flex items-center justify-between`}>
        <div>
          <div className="font-semibold text-sm">Владелец</div>
          <div className={`text-xs ${sub}`}>ATMOSFERA</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setShowNotifications(true); markAllNotificationsRead('owner'); }} className={`p-2 rounded-xl ${glass} relative`}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>}
          </button>
          <button onClick={toggleTheme} className={`p-2 rounded-xl ${glass}`}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">

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
              {/* Quick actions */}
              <h3 className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Быстрые действия</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Создать запись', icon: Plus, color: primary, action: () => setShowCreateBooking(true), disabled: false },
                  { label: 'Добавить расход', icon: DollarSign, color: '#FF6B6B', action: () => setShowAddExpense(true), disabled: false },
                  { label: exportingKind === 'report' ? 'Выгрузка...' : 'Экспорт Excel', icon: Download, color: accent, action: () => { void handleExport('report'); }, disabled: exportingKind !== null },
                  { label: 'Настройки', icon: Settings, color: '#A855F7', action: () => { setPage('settings'); setSettingsSection(null); }, disabled: false },
                ].map(a => (
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'completed' ? 'bg-green-500/15 text-green-600' : b.status === 'in_progress' ? 'bg-yellow-500/15 text-yellow-600' : b.status === 'cancelled' ? 'bg-red-500/15 text-red-500' : 'bg-blue-500/15 text-blue-600'}`}>
                      {b.status === 'scheduled' ? 'Запл.' : b.status === 'in_progress' ? 'В работе' : b.status === 'completed' ? 'Завершено' : 'Отменено'}
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
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-1`}>Общий фонд выплат</div>
                <div className="font-bold text-xl" style={{ color: accent }}>{payrollTotal.toLocaleString('ru')} ₽</div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
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
              </div>
              {payrollRows.map(({ worker, workerBookings, earned, complaintState, payout, recentPenalties }) => (
                <div key={worker.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: primary }}>{worker.name.charAt(0)}</div>
                    <div className="flex-1">
                      <div className="font-semibold">{worker.name}</div>
                      <div className={`text-xs ${sub}`}>{worker.experience} · база {worker.defaultPercent}%</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold" style={{ color: accent }}>{payout.toLocaleString('ru')} ₽</div>
                      <div className={`text-xs ${sub}`}>{workerBookings.length} записей · {complaintState.activeCount} активных жалоб</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{earned.toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub}`}>Сделка</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold text-red-500">{complaintState.effectivePercent}%</div>
                      <div className={`text-[11px] ${sub}`}>Текущий %</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{worker.salaryBase.toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub}`}>Оклад</div>
                    </div>
                  </div>
                  {complaintState.reductionActive ? (
                    <div className="rounded-xl px-3 py-2 mb-3 text-xs border border-red-500/20 bg-red-500/10 text-red-500">
                      Снижение активно: −10 п.п. до {complaintState.reductionUntil ? formatComplaintDate(complaintState.reductionUntil) : 'конца недели'}.
                    </div>
                  ) : (
                    <div className={`text-xs ${sub} mb-3`}>
                      {complaintState.activeCount === 0
                        ? 'Активных жалоб нет.'
                        : `До снижения процента осталось ${Math.max(0, COMPLAINT_THRESHOLD - complaintState.activeCount)} жалобы.`}
                    </div>
                  )}
                  {complaintState.activeCount > 0 && (
                    <button
                      onClick={() => { void handleRevokeAllPenalties(worker.id, worker.name); }}
                      className="mb-3 w-full py-2.5 rounded-xl text-sm font-medium text-red-500 border border-red-500/20 bg-red-500/10"
                    >
                      Снять все жалобы
                    </button>
                  )}
                  {recentPenalties.length > 0 && (
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
                  {workerBookings.length > 0 && (
                    <div className="space-y-1">
                      {workerBookings.slice(0, 2).map(b => {
                        const bw = b.workers.find(w => w.workerId === worker.id);
                        return (
                          <div key={b.id} className="flex justify-between text-xs" style={{ color: isDark ? '#9AA6B2' : '#6B7280' }}>
                            <span>{b.service} · {b.date}</span>
                            <span>+{Math.round(b.price * (bw?.percent || 0) / 100).toLocaleString('ru')} ₽</span>
                          </div>
                        );
                      })}
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
                  <button onClick={() => { setShowWriteOff(item.id); setWriteOffQty('1'); }}
                    className="w-full py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5"
                    style={{ borderColor: `${primary}30`, color: primary }}>
                    <Package size={12} />Списать
                  </button>
                </motion.div>
              ))}
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
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>ФИНАНСОВЫЙ ИТОГ</div>
                {[{ label: 'Выручка', value: `${totalRevenue.toLocaleString('ru')} ₽`, color: accent }, { label: 'Расходы', value: `${totalExpenses.toLocaleString('ru')} ₽`, color: '#FF6B6B' }, { label: 'Прибыль', value: `${profit.toLocaleString('ru')} ₽`, color: primary }, { label: 'Маржа', value: `${totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0}%`, color: '#A855F7' }].map(r => (
                  <div key={r.label} className="flex justify-between py-2.5 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className="text-sm">{r.label}</span>
                    <span className="font-semibold" style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>
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
          {page === 'settings' && !settingsSection && (
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
          {page === 'settings' && settingsSection === 'company' && (
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
          {page === 'settings' && settingsSection === 'boxes' && (
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
                      <input className={inputCls} type="number" value={box.pricePerHour} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, pricePerHour: +e.target.value } : b))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Описание</label>
                      <input className={inputCls} value={box.description} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, description: e.target.value } : b))} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: SERVICES ── */}
          {page === 'settings' && settingsSection === 'services' && (
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
                      <label className={`text-xs ${sub} block mb-1`}>Категория</label>
                      <input className={inputCls} value={service.category} onChange={e => setServicesState(p => p.map((item, j) => j === i ? { ...item, category: e.target.value } : item))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                      <input className={inputCls} type="number" value={service.price} onChange={e => setServicesState(p => p.map((item, j) => j === i ? { ...item, price: +e.target.value } : item))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Длительность (мин)</label>
                      <input className={inputCls} type="number" value={service.duration} onChange={e => setServicesState(p => p.map((item, j) => j === i ? { ...item, duration: +e.target.value } : item))} />
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
          {page === 'settings' && settingsSection === 'employees' && (
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
                <button onClick={() => void handleHireWorker()} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-3" style={{ background: accent }}>
                  <Plus size={16} />
                  Нанять сотрудника
                </button>
              </div>
              {employeeSettings.map((emp, i) => (
                <div key={emp.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ background: primary }}>{emp.name.charAt(0)}</div>
                      <span className="font-medium truncate">{emp.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setEmployeeSettings(p => p.map((e, j) => j === i ? { ...e, active: !e.active } : e))}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: emp.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${emp.active ? 'left-6' : 'left-1'}`} />
                      </button>
                      <button
                        onClick={() => { void handleFireWorker(emp.id, emp.name); }}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 border border-red-500/20 bg-red-500/10"
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
          {page === 'settings' && settingsSection === 'notifications' && (
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
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: INTEGRATIONS ── */}
          {page === 'settings' && settingsSection === 'integrations' && (
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
          {page === 'settings' && settingsSection === 'security' && (
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
        {[
          { id: 'dashboard', icon: Home, label: 'Главная' },
          { id: 'payroll', icon: Users, label: 'Зарплаты' },
          { id: 'stock', icon: Box, label: 'Склад' },
          { id: 'reports', icon: FileText, label: 'Отчёты' },
          { id: 'settings', icon: Settings, label: 'Настройки' },
        ].map(t => (
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

      {/* ── ADD STOCK ── */}
      <AnimatePresence>
        {showAddStock && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm`}>
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

      {/* ── CREATE BOOKING ── */}
      <AnimatePresence>
        {showCreateBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Создать запись</h3>
                <button onClick={() => setShowCreateBooking(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div><label className={`text-xs ${sub} block mb-1`}>Клиент</label><input className={inputCls} placeholder="Иван Иванов" value={bookingForm.clientName} onChange={e => setBookingForm(p => ({ ...p, clientName: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>Услуга</label><select className={selectCls} value={bookingForm.service} onChange={e => setBookingForm(p => ({ ...p, service: e.target.value }))}>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>{service.name} — {service.price.toLocaleString('ru')} ₽</option>
                  ))}
                </select></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={`text-xs ${sub} block mb-1`}>Дата</label><input className={inputCls} value={bookingForm.date} onChange={e => setBookingForm(p => ({ ...p, date: e.target.value }))} /></div>
                  <div><label className={`text-xs ${sub} block mb-1`}>Время</label><input className={inputCls} value={bookingForm.time} onChange={e => setBookingForm(p => ({ ...p, time: e.target.value }))} /></div>
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Бокс</label><select className={selectCls} value={bookingForm.box} onChange={e => setBookingForm(p => ({ ...p, box: e.target.value }))}>{boxes.map(box => <option key={box.id} value={box.name}>{box.name}</option>)}</select></div>
              </div>
              <button onClick={handleCreateBooking} className="w-full py-3.5 rounded-2xl font-semibold text-white" style={{ background: primary }}>Создать и уведомить клиента</button>
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


