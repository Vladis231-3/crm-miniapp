import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Sun, Moon, Calendar, CalendarDays, DollarSign, User, Play,
  Info, ArrowLeft, Phone, X, Check, Clock, ChevronRight, ChevronLeft, AlertCircle,
  Edit3, Save, Camera, Star, Shield, BellOff, History, LogOut,
  Mail, MapPin, Award, Eye, EyeOff, TrendingUp, Search,
  CalendarClock, Wallet, UserRound
} from 'lucide-react';
import { EmptyState } from '../shared/EmptyState';
import { SkeletonRows } from '../shared/Skeleton';
import { getWorkerNotificationSettings, useApp, Booking, type PaymentType, type Service } from '../../context/AppContext';
import { SourceBadge } from '../shared/SourceBadge';
import { FIXED_MASTER_EARNED, formatFixedMasterAmount, isFixedMasterService } from '../ui/utils';
import { AttendanceTable } from '../shared/AttendanceTable';
import { COMPLAINT_THRESHOLD, getComplaintPenaltyState, isComplaintActive } from '../../utils/complaints';
import { apiRequest } from '../../api';
import { CarSearch } from './shared/CarSearch';
import { Button, Dialog, FormRow, Input, Money, Sheet } from '../atmosfera';

type WorkerTab = 'today' | 'schedule' | 'earnings' | 'profile';
type ProfileSection = null | 'personal' | 'notifications' | 'history' | 'security' | 'shift' | 'attendance';

const READY_TO_START_STATUSES: Booking['status'][] = ['new', 'confirmed', 'scheduled'];

function workerStatusLabel(status: Booking['status']) {
  switch (status) {
    case 'new':
      return 'Новая';
    case 'confirmed':
      return 'Подтверждена';
    case 'scheduled':
      return 'Запланировано';
    case 'in_progress':
      return 'В работе';
    case 'completed':
      return 'Завершено';
    case 'admin_review':
      return 'На уточнении';
    case 'no_show':
      return 'Не приехал';
    case 'cancelled':
      return 'Отменено';
    default:
      return status;
  }
}

function workerStatusBadge(status: Booking['status']) {
  switch (status) {
    case 'new':
      return 'bg-indigo-500/15 text-indigo-600';
    case 'confirmed':
      return 'bg-cyan-500/15 text-cyan-600';
    case 'scheduled':
      return 'bg-blue-500/15 text-blue-600';
    case 'in_progress':
      return 'bg-yellow-500/15 text-yellow-600';
    case 'completed':
      return 'bg-green-500/15 text-green-600';
    case 'admin_review':
      return 'bg-amber-500/15 text-amber-600';
    case 'no_show':
      return 'bg-orange-500/15 text-orange-600';
    default:
      return 'bg-red-500/15 text-red-500';
  }
}

function workerPaymentLabel(paymentType: PaymentType, settled: boolean) {
  if (!settled) return 'Не оплачено';
  return { cash: 'Наличные', transfer: 'Перевод', invoice: 'По счёту' }[paymentType] || paymentType;
}

// Базовая цена основной услуги = итог − доп. услуги (в плюс) − работы в составе
function bookingBasePrice(booking: Booking) {
  const additionalTotal = (booking.additionalServices || []).reduce((s, as) => s + (as.priceMode === 'subtract' ? 0 : as.price), 0);
  const servicesTotal = (booking.services || []).reduce((s, svc) => s + svc.price, 0);
  return Math.max(0, booking.price - additionalTotal - servicesTotal);
}

// Доля мастера по основной услуге (та же логика, что во вкладке «Заработок»)
function bookingBaseWorkerEarned(booking: Booking, workerId: string, services: Service[]) {
  const link = booking.workers.find(w => w.workerId === workerId);
  if (!link) return 0;
  if (link.payType === 'fixed') return link.fixedAmount || 0;
  if (isFixedMasterService(services, booking.serviceId, booking.service)) return FIXED_MASTER_EARNED;
  return Math.round(booking.price * (link.percent || 0) / 100);
}

function formatBookingInstant(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const kindLabel: Record<string, string> = {
  bonus: 'Премия',
  deduction: 'Штраф',
  payout: 'Выплата',
  advance: 'Аванс',
  adjustment: 'Корректировка',
};

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function groupBookingsByDate(bookings: any[]) {
  const groups: Record<string, any[]> = {};
  for (const b of bookings) {
    if (!groups[b.date]) groups[b.date] = [];
    groups[b.date].push(b);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a, 'ru'))
    .map(([date, items]) => ({ date, items }));
}

function WorkerEarningsCalendar({
  bookings,
  selectedDate,
  onSelectDate,
  onSelectBooking,
  glass,
  isDark,
  sub,
  primary,
  accent,
}: {
  bookings: any[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onSelectBooking: (booking: any) => void;
  glass: string;
  isDark: boolean;
  sub: string;
  primary: string;
  accent: string;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth() + monthOffset;

  const datesWithBookings = new Set(bookings.map((b: any) => b.date));

  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const selectedDayBookings = selectedDate
    ? bookings.filter((b: any) => b.date === selectedDate)
    : [];

  function formatDateKey(year: number, month: number, day: number) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${dd}.${mm}.${year}`;
  }

  return (
    <div className={`${glass} rounded-2xl p-3 mb-3`}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonthOffset(m => m - 1)} className="p-1 rounded-lg hover:bg-white/10">
          <ChevronLeft size={16} strokeWidth={1.75} className={sub} />
        </button>
        <div className="font-semibold text-sm">
          {MONTH_NAMES[calMonth]} {calYear}
        </div>
        <button onClick={() => setMonthOffset(m => m + 1)} className="p-1 rounded-lg hover:bg-white/10">
          <ChevronRight size={16} strokeWidth={1.75} className={sub} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className={`text-center text-[10px] ${sub} py-1`}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateKey = formatDateKey(calYear, calMonth, day);
          const hasBooking = datesWithBookings.has(dateKey);
          const isSelected = selectedDate === dateKey;
          const isToday = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate()) === dateKey;
          return (
            <button key={dateKey}
              onClick={() => onSelectDate(isSelected ? null : dateKey)}
              className="relative flex flex-col items-center py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: isSelected ? primary : 'transparent',
                color: isSelected ? '#fff' : isToday ? primary : undefined,
                fontWeight: isToday ? 600 : 400,
              }}>
              <span>{day}</span>
              {hasBooking && (
                <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: isSelected ? '#fff' : accent }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day tasks */}
      {selectedDate && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
          <div className={`text-xs font-medium ${sub} mb-1.5`}>{selectedDate}</div>
          {selectedDayBookings.length === 0 ? (
            <div className={`text-xs ${sub}`}>Нет задач</div>
          ) : (
            selectedDayBookings.map((b: any) => (
              <div key={b.id} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-2.5 mb-1.5 cursor-pointer`} onClick={() => onSelectBooking(b)}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">{b.time} · {b.service}</div>
                    {b.car && <div className={`text-xs ${sub}`}>{b.car}{b.plate ? ` (${b.plate})` : ''}</div>}
                    <div className={`text-xs ${sub}`}>{b.box} · {b.price?.toLocaleString('ru')} ₽</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm" style={{ color: accent }}>+{b.earned.toLocaleString('ru')} ₽</div>
                    <div className={`text-xs ${sub}`}>{b.percent}%</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function WorkerApp() {
  const {
    isDark,
    toggleTheme,
    bookings,
    updateBooking,
    notifications,
    penalties,
    markAllNotificationsRead,
    markNotificationRead,
    addNotification,
    session,
    staffProfile,
    settings,
    activeSessions,
    saveWorkerProfile,
    saveWorkerNotificationSettings,
    createTelegramLinkCode,
    stockItems,
    services,
    listShiftChecklists,
    submitShiftChecklist,
    changePassword,
    refreshActiveSessions,
    revokeSession,
    todayLabel,
    upcomingDates,
    workers,
    schedule,
  } = useApp();
  const workerId = session?.actorId || 'w1';
  const [tab, setTab] = useState<WorkerTab>('today');
  const [profileSection, setProfileSection] = useState<ProfileSection>(null);
  const [selectedTask, setSelectedTask] = useState<Booking | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState<Booking | null>(null);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [finishNote, setFinishNote] = useState('');
  const [finishPaymentType, setFinishPaymentType] = useState<PaymentType>('cash');
  const [finishPaymentSettled, setFinishPaymentSettled] = useState(true);
  const [sendCheck, setSendCheck] = useState(true);
  const [finishSuccess, setFinishSuccess] = useState(false);
  const [filterMine, setFilterMine] = useState(true);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [password, setPassword] = useState({ current: '', new_: '', confirm: '' });
  const [passSaved, setPassSaved] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [telegramLinkCode, setTelegramLinkCode] = useState<{ code: string; expiresAt: Date; linked: boolean } | null>(null);
  const [shiftChecklists, setShiftChecklists] = useState<any[]>([]);
  const [shiftChecklistDraft, setShiftChecklistDraft] = useState<Record<string, string>>({});
  const [shiftChecklistNote, setShiftChecklistNote] = useState('');
  const [submittingShiftPhase, setSubmittingShiftPhase] = useState<'start' | 'end' | null>(null);

  // Calendar/car-search state переехали: календарь — в Schedule (след. вырезка),
  // поиск машин — в shared/CarSearch.tsx

  // Earnings state
  const [salaryPeriod, setSalaryPeriod] = useState<'day' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [salarySegment, setSalarySegment] = useState<'all' | 'wash' | 'detailing'>('all');
  const [salaryDateFrom, setSalaryDateFrom] = useState('');
  const [salaryDateTo, setSalaryDateTo] = useState('');
  const [salaryDetail, setSalaryDetail] = useState<any>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [earningsViewMode, setEarningsViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [selectedCompletedOrder, setSelectedCompletedOrder] = useState<any>(null);

  // Profile state
  const [profile, setProfile] = useState({
    name: staffProfile?.name || '',
    phone: staffProfile?.phone || '',
    email: staffProfile?.email || '',
    city: staffProfile?.city || '',
    experience: staffProfile?.experience || '',
    specialty: staffProfile?.specialty || '',
    about: staffProfile?.about || '',
    percent: staffProfile?.defaultPercent || 0,
  });

  const [notifPrefs, setNotifPrefs] = useState(getWorkerNotificationSettings(settings, workerId));

  useEffect(() => {
    setProfile({
      name: staffProfile?.name || '',
      phone: staffProfile?.phone || '',
      email: staffProfile?.email || '',
      city: staffProfile?.city || '',
      experience: staffProfile?.experience || '',
      specialty: staffProfile?.specialty || '',
      about: staffProfile?.about || '',
      percent: staffProfile?.defaultPercent || 0,
    });
  }, [staffProfile]);

  useEffect(() => {
    setNotifPrefs(getWorkerNotificationSettings(settings, workerId));
  }, [settings, workerId]);

  useEffect(() => {
    if (tab === 'profile' && profileSection === 'security') {
      void refreshActiveSessions();
    }
  }, [tab, profileSection]);

  useEffect(() => {
    if (tab === 'profile' && profileSection === 'shift') {
      void listShiftChecklists().then(setShiftChecklists);
    }
  }, [tab, profileSection]);

  useEffect(() => {
    if (tab !== 'earnings') return;
    if (salaryPeriod === 'custom' && (!salaryDateFrom || !salaryDateTo)) {
      setSalaryDetail(null);
      setSalaryLoading(false);
      return;
    }
    setSalaryLoading(true);
    setSalaryError(null);
    const params = new URLSearchParams({ period: salaryPeriod, segment: salarySegment });
    if (salaryPeriod === 'custom') {
      params.set('date_from', salaryDateFrom);
      params.set('date_to', salaryDateTo);
    }
    apiRequest<any>(`/api/worker/salary-detail?${params.toString()}`)
      .then(setSalaryDetail)
      .catch(e => { console.error('worker salary-detail error:', e); setSalaryError(e?.message || 'Ошибка загрузки данных'); setSalaryDetail(null); })
      .finally(() => setSalaryLoading(false));
  }, [tab, salaryPeriod, salarySegment, salaryDateFrom, salaryDateTo]);

  // loadCalendar + эффекты calendar/cars удалены вместе с мёртвыми табами (§6.3)

  const myNotifications = notifications.filter(n => n.recipientRole === 'worker' && n.recipientId === workerId);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const isMyTask = (b: Booking) =>
    b.workers.some(w => w.workerId === workerId) ||
    (b.additionalServices || []).some(as => as.workers.some(w => w.workerId === workerId));

  const allTasks = (bookings || []).filter(b =>
    filterMine ? isMyTask(b) : true
  );
  const todayTasks = (allTasks || []).filter(b => b.date === todayLabel).sort((a, b) => a.time.localeCompare(b.time));

  const myEarnings = (bookings || [])
    .filter(b => b.status === 'completed' && isMyTask(b))
    .map(b => {
      const w = b.workers.find(wk => wk.workerId === workerId);
      const earned = w?.payType === 'fixed'
        ? (w.fixedAmount || 0)
        : isFixedMasterService(services, b.serviceId, b.service)
          ? FIXED_MASTER_EARNED
          : Math.round(b.price * (w?.percent || 0) / 100);
      return { ...b, earned, payType: w?.payType, fixedAmount: w?.fixedAmount };
    });
  const totalEarned = myEarnings.reduce((s, b) => s + b.earned, 0);
  const payrollSummary = staffProfile?.payrollSummary;
  const earnedForDisplay = payrollSummary?.accruedFromBookings ?? totalEarned;
  const myPenalties = (penalties || []).filter((penalty) => penalty.workerId === workerId && isComplaintActive(penalty));
  const complaintState = getComplaintPenaltyState(staffProfile?.defaultPercent || 0, myPenalties);
  const payoutAfterPenalties = payrollSummary?.balance ?? Math.max(0, totalEarned + (staffProfile?.salaryBase || 0));

  const allMyTasks = (bookings || []).filter(isMyTask);
  const completedCount = payrollSummary?.completedBookings ?? allMyTasks.filter(b => b.status === 'completed').length;
  const avgCheck = completedCount > 0 ? Math.round((payrollSummary?.accruedFromBookings ?? totalEarned) / completedCount) : 0;
  const chemistryItems = (stockItems || []).filter((item) => item.category === 'Химия');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning) interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const glass = isDark ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm';
  const bg = isDark ? 'bg-[#131316]' : 'bg-[#F7F7F8]';
  const text = isDark ? 'text-[#E4E4E7]' : 'text-[#131316]';
  const sub = isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]';
  const primary = isDark ? '#6E76F2' : '#4F46E5';
  const accent = isDark ? '#34D399' : '#10B981';
  const surface = isDark ? '#1C1C1F' : '#ffffff';
  const inputCls = `${isDark ? 'bg-white/[.07] border-transparent text-[#E4E4E7] placeholder-zinc-500 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/25 focus:bg-white/[.09]' : 'bg-black/[.05] border-transparent text-[#131316] placeholder-zinc-400 focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const formatComplaintDate = (value: Date) => value.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const handleStartTask = (task: Booking) => {
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    updateBooking(task.id, { status: 'in_progress' });
    setTimerRunning(true);
    setTimer(0);
    setShowStartConfirm(null);
  };

  const openFinishModal = (task: Booking) => {
    setSelectedTask(task);
    setFinishNote(task.notes || '');
    setFinishPaymentType(task.paymentType || 'cash');
    setFinishPaymentSettled(task.paymentSettled);
    setFinishError(null);
    setShowFinishModal(true);
  };

  const handleFinish = async () => {
    if (!selectedTask) return;
    if (finishPaymentSettled && !finishPaymentType) {
      setFinishError('Укажите способ оплаты');
      return;
    }
    const nextNote = finishNote.trim();
    try {
      await updateBooking(selectedTask.id, {
        status: 'completed',
        paymentSettled: finishPaymentSettled,
        paymentType: finishPaymentSettled ? finishPaymentType : selectedTask.paymentType,
        notes: nextNote || selectedTask.notes || '',
      });
      setSelectedTask(prev => prev ? {
        ...prev,
        status: 'completed',
        paymentSettled: finishPaymentSettled,
        paymentType: finishPaymentSettled ? finishPaymentType : prev.paymentType,
        notes: nextNote || prev.notes,
      } : null);
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : 'Не удалось завершить задачу');
      return;
    }
    setTimerRunning(false);
    if (sendCheck) {
      addNotification({
        recipientRole: 'client', recipientId: selectedTask.clientId,
        message: `Ваш заказ #${selectedTask.id.toUpperCase()} завершён. Чек отправлен.`, read: false,
      });
    }
    (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    setFinishSuccess(true);
    setTimeout(() => {
      setFinishSuccess(false);
      setShowFinishModal(false);
      setShowDetail(false);
      setFinishNote('');
      setFinishPaymentType('cash');
      setFinishPaymentSettled(true);
      setFinishError(null);
    }, 2000);
  };

  const handleSaveProfile = async () => {
    await saveWorkerProfile(workerId, profile);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleSubmitShiftChecklist = async (phase: 'start' | 'end') => {
    setSubmittingShiftPhase(phase);
    try {
      const saved = await submitShiftChecklist({
        phase,
        note: shiftChecklistNote,
        items: chemistryItems.map((item) => ({
          stockItemId: item.id,
          actualQty: Math.max(0, Number(shiftChecklistDraft[item.id] || item.qty) || 0),
        })),
      });
      setShiftChecklists((current) => [saved, ...current]);
      setShiftChecklistNote('');
    } finally {
      setSubmittingShiftPhase(null);
    }
  };

  const handleSavePass = async () => {
    setPassError(null);
    setPassSaved(false);
    if (!password.current || !password.new_ || !password.confirm) {
      setPassError('Заполните все поля для смены пароля');
      return;
    }
    if (password.new_.length < 8) {
      setPassError('Новый пароль должен содержать минимум 8 символов');
      return;
    }
    if (password.new_ !== password.confirm) {
      setPassError('Подтверждение пароля не совпадает');
      return;
    }
    try {
      await changePassword(password.current, password.new_);
      setPassSaved(true);
      setTimeout(() => {
        setPassSaved(false);
        setPassword({ current: '', new_: '', confirm: '' });
      }, 2000);
    } catch (error) {
      setPassError(error instanceof Error ? error.message : 'Не удалось изменить пароль');
    }
  };

  const handleGenerateTelegramCode = async () => {
    setTelegramLinkCode(await createTelegramLinkCode());
  };

  const handleSaveNotifications = async () => {
    await saveWorkerNotificationSettings(workerId, notifPrefs);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const headerTitle = showDetail ? selectedTask?.service
    : tab === 'today' ? 'Сегодня'
    : tab === 'schedule' ? 'Расписание'
    : tab === 'earnings' ? 'Заработок'
    : profileSection === 'personal' ? 'Личные данные'
    : profileSection === 'shift' ? 'Чек-лист смены'
    : profileSection === 'notifications' ? 'Уведомления'
    : profileSection === 'history' ? 'История задач'
    : profileSection === 'security' ? 'Безопасность'
    : 'Профиль';

  return (
    <div className={`${isDark ? 'dark' : ''} atmosfera-shell ${bg} ${text} min-h-screen flex flex-col`}>
      {/* Header */}
      <div className={`work-header ${glass} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {(showDetail || profileSection) && (
            <button onClick={() => { setShowDetail(false); setProfileSection(null); }} className={`p-2 rounded-xl ${glass} mr-1`}><ArrowLeft size={18} strokeWidth={1.75} /></button>
          )}
          <div>
            <div className="text-[15px] font-bold tracking-tight leading-tight">{headerTitle}</div>
            {!showDetail && tab === 'today' && !profileSection && <div className={`text-[11px] ${sub}`}>{todayLabel}</div>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {tab === 'today' && !showDetail && !profileSection && (
            <button onClick={() => setFilterMine(!filterMine)} className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={filterMine ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}>
              Только мои
            </button>
          )}
          <button onClick={() => { setShowNotifications(true); markAllNotificationsRead('worker'); }} className={`p-2 rounded-xl ${glass} relative`}>
            <Bell size={18} strokeWidth={1.75} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>}
          </button>
          <button onClick={toggleTheme} className={`p-2 rounded-xl ${glass}`}>{isDark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">

          {/* ── TASK DETAIL ── */}
          {showDetail && selectedTask ? (
            <motion.div key="detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.22 }} className="px-4 py-4">
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${workerStatusBadge(selectedTask.status)}`}>{workerStatusLabel(selectedTask.status)}</span>
                  <span className={`text-xs ${sub}`}>Заказ #{selectedTask.id.slice(0, 6).toUpperCase()}</span>
                </div>
                <div className="mt-2.5 font-semibold">{selectedTask.service}</div>
                <div className={`text-sm ${sub} mt-1`}>{selectedTask.date} в {selectedTask.time} · {selectedTask.duration} мин</div>
                <div className={`text-sm ${sub}`}>{selectedTask.box}</div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-2`}>КЛИЕНТ</div>
                <div className="font-semibold">{selectedTask.clientName}</div>
                <div className="mt-1"><SourceBadge source={selectedTask.source} /></div>
                <a href={`tel:${selectedTask.clientPhone}`} className="flex items-center gap-2 mt-1" style={{ color: primary }}>
                  <Phone size={14} strokeWidth={1.75} /><span className="text-sm">{selectedTask.clientPhone}</span>
                </a>
                {selectedTask.car && <div className={`text-sm ${sub} mt-1`}>{selectedTask.car} · {selectedTask.plate}</div>}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-2`}>СОСТАВ ЗАКАЗА</div>
                <div className="flex justify-between items-center text-sm py-0.5">
                  <span className="font-medium">Базовая услуга «{selectedTask.service}»</span>
                  <span className="font-semibold">{bookingBasePrice(selectedTask).toLocaleString('ru')} ₽</span>
                </div>
                {(selectedTask.services || []).map((svc, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm py-0.5">
                    <span>+ {svc.name}</span>
                    <span>{svc.price.toLocaleString('ru')} ₽</span>
                  </div>
                ))}
                {selectedTask.additionalServices && selectedTask.additionalServices.length > 0 && (
                  <>
                    <div className={`text-[11px] font-medium ${sub} mt-2 mb-1`}>Доп. услуги</div>
                    {selectedTask.additionalServices.map(as => {
                      const isMyService = as.workers.some(w => w.workerId === workerId);
                      const isOutsource = !!as.isOutsource;
                      return (
                        <div key={as.id} className={`py-1 ${!isMyService && !isOutsource ? 'opacity-50' : ''}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium flex items-center gap-1.5">{as.name}{isMyService && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${accent}20`, color: accent }}>
                                {selectedTask.status === 'completed' ? 'участвовали' : 'участвуете'}
                              </span>
                            )}</span>
                            <span className={`text-sm font-semibold ${as.priceMode === 'subtract' ? 'text-red-500' : ''}`}>{as.priceMode === 'subtract' ? '− ' : '+ '}{as.price.toLocaleString('ru')} ₽</span>
                          </div>
                          {isOutsource ? (
                            <div className="flex justify-between items-center mt-0.5">
                              <span className={`text-xs ${sub}`}>Аутсорс · аутсорсеру</span>
                              <span className="text-xs font-medium text-red-500">− {(as.outsourceAmount || 0).toLocaleString('ru')} ₽</span>
                            </div>
                          ) : isMyService && as.workers.filter(w => w.workerId === workerId).map(w => (
                            <div key={w.workerId} className="flex justify-between items-center mt-0.5">
                              <span className={`text-xs ${sub}`}>Ваша доля: {w.payType === 'fixed' ? `${(w.fixedAmount || 0).toLocaleString('ru')} ₽` : `${w.percent}%`}</span>
                              <span className="text-xs font-medium text-green-500">+{(w.payType === 'fixed' ? (w.fixedAmount || 0) : Math.round(as.price * w.percent / 100)).toLocaleString('ru')} ₽</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </>
                )}
                <div className="flex justify-between items-center mt-2 pt-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                  <span className="text-sm font-semibold">Итоговая сумма</span>
                  <span className="text-base font-bold" style={{ color: primary }}>{selectedTask.price.toLocaleString('ru')} ₽</span>
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-2`}>ОПЛАТА</div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{workerPaymentLabel(selectedTask.paymentType, selectedTask.paymentSettled)}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${selectedTask.paymentSettled ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                    {selectedTask.paymentSettled ? 'Оплачено' : 'Не оплачено'}
                  </span>
                </div>
                {selectedTask.isOutsource && (
                  <div className="flex justify-between items-center mt-1 text-sm">
                    <span className={sub}>Аутсорс · аутсорсеру</span>
                    <span className="text-red-500">− {(selectedTask.outsourceAmount || 0).toLocaleString('ru')} ₽</span>
                  </div>
                )}
              </div>
              {(() => {
                const myBaseLink = selectedTask.workers.find(w => w.workerId === workerId);
                const myAdditionalServices = (selectedTask.additionalServices || []).filter(as => as.workers.some(w => w.workerId === workerId));
                if (!myBaseLink && myAdditionalServices.length === 0) return null;
                const baseEarned = bookingBaseWorkerEarned(selectedTask, workerId, services);
                const additionalEarned = myAdditionalServices.reduce((sum, as) => sum + as.workers.filter(w => w.workerId === workerId).reduce((s, w) => s + (w.payType === 'fixed' ? (w.fixedAmount || 0) : Math.round(as.price * w.percent / 100)), 0), 0);
                const total = baseEarned + additionalEarned;
                return (
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <div className={`text-xs font-medium ${sub} mb-2`}>ВАШ ДОХОД</div>
                    {myBaseLink && (
                      <div className="flex justify-between items-center text-sm py-0.5">
                        <span>{myBaseLink.payType === 'fixed' ? 'Основная услуга · фикс' : isFixedMasterService(services, selectedTask.serviceId, selectedTask.service) ? 'Основная услуга · фикс' : `Основная услуга · ${myBaseLink.percent || 0}%`}</span>
                        <span className="font-medium text-green-500">+{baseEarned.toLocaleString('ru')} ₽</span>
                      </div>
                    )}
                    {myAdditionalServices.map(as => {
                      const earned = as.workers.filter(w => w.workerId === workerId).reduce((s, w) => s + (w.payType === 'fixed' ? (w.fixedAmount || 0) : Math.round(as.price * w.percent / 100)), 0);
                      return (
                        <div key={as.id} className="flex justify-between items-center text-sm py-0.5">
                          <span>{as.name}</span>
                          <span className="font-medium text-green-500">+{earned.toLocaleString('ru')} ₽</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center pt-2.5 mt-2 border-t text-sm font-semibold" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                      <span>Итого за заказ</span>
                      <span style={{ color: accent }}>+{total.toLocaleString('ru')} ₽</span>
                    </div>
                  </div>
                );
              })()}
              {(selectedTask.materials || []).length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className={`text-xs font-medium ${sub}`}>МАТЕРИАЛЫ</div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${selectedTask.materialsWrittenOff ? 'text-green-500 bg-green-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                      {selectedTask.materialsWrittenOff ? 'Списаны' : 'Не списаны'}
                    </span>
                  </div>
                  {selectedTask.materials.map(m => (
                    <div key={m.id} className="flex justify-between items-center text-sm py-0.5">
                      <span>{m.name} × {m.qty} {m.unit}</span>
                      <span className={sub}>{(m.qty * m.unitPrice).toLocaleString('ru')} ₽</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedTask.notes?.trim() && (
                <div className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className={`text-xs font-medium ${sub} mb-2`}>ЗАМЕТКИ</div>
                  <p className="text-sm whitespace-pre-wrap">{selectedTask.notes}</p>
                </div>
              )}
              {selectedTask.workers.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className={`text-xs font-medium ${sub} mb-2`}>КОЛЛЕГИ</div>
                  {selectedTask.workers.map(w => (
                    <div key={w.workerId} className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white" style={{ background: primary }}>{w.workerName.charAt(0)}</div>
                        <span className="text-sm">{w.workerName}</span>
                      </div>
                      <span className={`text-sm ${sub}`}>{w.payType === 'fixed' ? `${(w.fixedAmount || 0).toLocaleString('ru')} ₽` : `${w.percent}%`}</span>
                    </div>
                  ))}
                </div>
              )}
              {(() => {
                const created = formatBookingInstant(selectedTask.createdAt);
                const started = formatBookingInstant(selectedTask.startedAt);
                const completed = formatBookingInstant(selectedTask.completedAt);
                if (!created && !started && !completed) return null;
                return (
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <div className={`text-xs font-medium ${sub} mb-2`}>ВРЕМЕНА</div>
                    <div className="text-sm space-y-1">
                      {created && <div className="flex justify-between"><span className={sub}>Заказ создан</span><span>{created}</span></div>}
                      {started && <div className="flex justify-between"><span className={sub}>Работа начата</span><span>{started}</span></div>}
                      {completed && <div className="flex justify-between"><span className={sub}>Работа завершена</span><span>{completed}</span></div>}
                    </div>
                  </div>
                );
              })()}
              {selectedTask.status === 'in_progress' && (
                <div className={`${glass} rounded-2xl p-4 mb-3 text-center`}>
                  <div className={`text-xs ${sub} mb-2`}>Время работы</div>
                  <div className="text-3xl font-bold" style={{ color: primary }}>{formatTimer(timer)}</div>
                </div>
              )}
              <div className="space-y-2">
                {READY_TO_START_STATUSES.includes(selectedTask.status) && (
                  <button onClick={() => setShowStartConfirm(selectedTask)} className="w-full py-3.5 rounded-2xl font-semibold text-white flex items-center justify-center gap-2" style={{ background: accent }}>
                    <Play size={18} strokeWidth={1.75} />Начать задачу
                  </button>
                )}
                {selectedTask.status === 'in_progress' && (
                  <button onClick={() => openFinishModal(selectedTask)} className="w-full py-3.5 rounded-2xl font-semibold text-white flex items-center justify-center gap-2" style={{ background: primary }}>
                    <Check size={18} strokeWidth={1.75} />Завершить
                  </button>
                )}
              </div>
            </motion.div>

          ) : tab === 'today' && !profileSection ? (
            <>
            <section className="role-hero role-hero--worker mb-4">
              <div className="text-xs uppercase tracking-[.2em] opacity-70">Shift command</div>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">{todayTasks.find(task => task.status === `in_progress`)?.service || todayTasks.find(task => task.status !== `completed`)?.service || `Смена под контролем`}</h2>
                  <p className="mt-1 text-sm opacity-80">{todayTasks.find(task => task.status === `in_progress`) ? `Текущая работа · ${todayTasks.find(task => task.status === `in_progress`)?.time}` : `Готов к следующей задаче`}</p>
                </div>
                <div className="text-right"><div className="text-3xl font-semibold">{todayTasks.filter(task => task.status === `completed`).length}/{todayTasks.length}</div><div className="text-xs opacity-70">выполнено</div></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/15 py-3 text-center">
                <div><strong className="block text-xl">{todayTasks.length}</strong><span className="text-xs opacity-70">на смену</span></div>
                <div><strong className="block text-xl">{todayTasks.filter(task => task.status === `in_progress`).length}</strong><span className="text-xs opacity-70">в работе</span></div>
                <div><strong className="block text-xl">{todayTasks.filter(task => task.status === `completed`).length}</strong><span className="text-xs opacity-70">готово</span></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {todayTasks.find(task => task.status !== `completed`) && <button onClick={() => { const task = todayTasks.find(item => item.status !== `completed`); if (task) { setSelectedTask(task); setShowDetail(true); } }} className="semantic-primary-button bg-white text-slate-900">Открыть текущую</button>}
                <button onClick={() => setProfileSection(`shift`)} className="rounded-xl border border-white/25 px-4 py-2 text-sm">Чек-лист смены</button>
              </div>
            </section>
            <section className={`${glass} mb-4 rounded-2xl p-4`}>
              <div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-muted-foreground">Next work rail</div><h3 className="font-semibold">Дальше по времени</h3></div><button onClick={() => setTab(`schedule`)} style={{ color: primary }} className="text-sm">Расписание</button></div>
              <div className="mt-3 space-y-2">
                {todayTasks.filter(task => task.status !== `completed`).slice(0, 3).map(task => <button key={task.id} onClick={() => { setSelectedTask(task); setShowDetail(true); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left" style={{ background: `${primary}0D` }}><strong className="w-12">{task.time}</strong><span className="min-w-0 flex-1 truncate">{task.service}</span><ChevronRight size={16} strokeWidth={1.75}/></button>)}
              </div>
            </section>
            <motion.div key="today" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <CarSearch workerId={workerId} />
              {todayTasks.length === 0 ? (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <Clock size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>Задач на сегодня нет</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayTasks.map(task => (
                    <motion.div key={task.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${glass} rounded-2xl p-4`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-sm flex items-center gap-1.5 min-w-0">{task.time} · {task.service}<SourceBadge source={task.source} /></div>
                          <div className={`text-sm ${sub}`}>{task.clientName}</div>
                          <div className={`text-xs ${sub}`}>{task.box} · {task.duration} мин</div>
                          {task.car && <div className={`text-xs ${sub}`}>{task.car}{task.plate ? ` (${task.plate})` : ''}</div>}
                          {(task.additionalServices || []).some(as => as.workers.some(w => w.workerId === workerId)) && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {(task.additionalServices || []).filter(as => as.workers.some(w => w.workerId === workerId)).map(as => (
                                <span key={as.id} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${accent}1A`, color: accent }}>
                                  + {as.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${workerStatusBadge(task.status)}`}>
                          {workerStatusLabel(task.status)}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {READY_TO_START_STATUSES.includes(task.status) && (
                          <button onClick={() => setShowStartConfirm(task)} className="flex-1 py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1" style={{ background: accent }}>
                            <Play size={14} strokeWidth={1.75} />Начать
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button onClick={() => openFinishModal(task)} className="flex-1 py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1" style={{ background: primary }}>
                            <Check size={14} strokeWidth={1.75} />Завершить
                          </button>
                        )}
                        <button onClick={() => { setSelectedTask(task); setShowDetail(true); }} className={`flex-1 py-2 rounded-xl text-sm ${glass} flex items-center justify-center gap-1`}>
                          <Info size={14} strokeWidth={1.75} />Детали
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
            </>

          ) : tab === 'schedule' && !profileSection ? (
            <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <h2 className="font-semibold mb-4">Расписание</h2>
              {upcomingDates.slice(0, 3).map(date => {
                const dayTasks = bookings.filter(b => b.date === date && isMyTask(b));
                return (
                  <div key={date} className="mb-4">
                    <div className={`text-xs font-medium ${sub} mb-2`}>{date}</div>
                    {dayTasks.length === 0 ? (
                      <div className={`${glass} rounded-xl p-3 text-sm ${sub}`}>Свободный день</div>
                    ) : dayTasks.map(task => (
                      <div key={task.id} className={`${glass} rounded-xl p-3 mb-2`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium">{task.time} — {task.service}</div>
                            <div className={`text-xs ${sub}`}>{task.box} · {task.clientName}<SourceBadge source={task.source} className="ml-1.5 align-middle" /></div>
                            {task.car && <div className={`text-xs ${sub}`}>{task.car}{task.plate ? ` (${task.plate})` : ''}</div>}
                            {(task.additionalServices || []).some(as => as.workers.some(w => w.workerId === workerId)) && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(task.additionalServices || []).filter(as => as.workers.some(w => w.workerId === workerId)).map(as => (
                                  <span key={as.id} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${accent}1A`, color: accent }}>
                                    + {as.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${task.status === 'completed' ? 'bg-green-500/15 text-green-600' : workerStatusBadge(task.status)}`}>
                            {task.status === 'completed' ? 'Выполнено' : workerStatusLabel(task.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </motion.div>


          ) : tab === 'earnings' && !profileSection ? (
            <motion.div key="earnings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              {/* Period + Segment filters */}
              <div className={`${glass} rounded-2xl p-3 mb-3`}>
                <div className="flex gap-1.5 mb-1.5">
                  {(['day', 'week', 'month', 'all', 'custom'] as const).map(p => (
                    <button key={p} onClick={() => setSalaryPeriod(p)}
                      className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: salaryPeriod === p ? primary : 'transparent', color: salaryPeriod === p ? '#fff' : sub }}>
                      {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : p === 'all' ? 'Всё' : 'Своё'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {(['all', 'wash', 'detailing'] as const).map(s => (
                    <button key={s} onClick={() => setSalarySegment(s)}
                      className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: salarySegment === s ? primary : 'transparent', color: salarySegment === s ? '#fff' : sub }}>
                      {s === 'all' ? 'Все' : s === 'wash' ? 'Мойка' : 'Детейлинг'}
                    </button>
                  ))}
                </div>
                {salaryPeriod === 'custom' && (
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1">
                      <label className={`text-[11px] ${sub} block mb-1`}>От</label>
                      <input type="date" value={salaryDateFrom} onChange={(e) => setSalaryDateFrom(e.target.value)}
                        className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                    </div>
                    <div className="flex-1">
                      <label className={`text-[11px] ${sub} block mb-1`}>До</label>
                      <input type="date" value={salaryDateTo} onChange={(e) => setSalaryDateTo(e.target.value)}
                        className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                    </div>
                  </div>
                )}
              </div>

              {salaryLoading ? (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <div className={`text-sm ${sub}`}>Загрузка...</div>
                </div>
              ) : salaryError ? (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <AlertCircle size={36} strokeWidth={1.75} className={`mx-auto mb-3 text-red-400`} />
                  <p className="text-sm text-red-400 mb-2">{salaryError}</p>
                </div>
              ) : !salaryDetail ? (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <DollarSign size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>Нет данных за выбранный период</p>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className={`${glass} rounded-2xl p-3 text-center`}>
                      <div className="font-bold" style={{ color: primary }}>{salaryDetail.totalEarned.toLocaleString('ru')} ₽</div>
                      <div className={`text-xs ${sub}`}>Заработано</div>
                    </div>
                    <div className={`${glass} rounded-2xl p-3 text-center`}>
                      <div className="font-bold" style={{ color: '#EF4444' }}>{salaryDetail.totalPaid.toLocaleString('ru')} ₽</div>
                      <div className={`text-xs ${sub}`}>Выплачено</div>
                    </div>
                    <div className={`${glass} rounded-2xl p-3 text-center`}>
                      <div className="font-bold" style={{ color: salaryDetail.balanceToPay > 0 ? accent : sub }}>{salaryDetail.balanceToPay.toLocaleString('ru')} ₽</div>
                      <div className={`text-xs ${sub}`}>К выплате</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className={`${glass} rounded-2xl p-3 text-center`}>
                      <div className="font-bold text-sm">{salaryDetail.completedBookingsCount}</div>
                      <div className={`text-xs ${sub}`}>Задач</div>
                    </div>
                    <div className={`${glass} rounded-2xl p-3 text-center`}>
                      <div className="font-bold text-sm">{salaryDetail.shiftCount}</div>
                      <div className={`text-xs ${sub}`}>Смен</div>
                    </div>
                    <div className={`${glass} rounded-2xl p-3 text-center`}>
                      <div className="font-bold text-sm">{(salaryDetail.salaryBase || 0).toLocaleString('ru')} ₽</div>
                      <div className={`text-xs ${sub}`}>Оклад</div>
                    </div>
                  </div>

                  {/* Salary composition */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <div className={`text-xs font-medium ${sub} mb-2`}>СОСТАВ ЗП</div>
                    {(() => {
                      const shiftPay = (salaryDetail.shiftCount || 0) * (salaryDetail.salaryPerShift || 0);
                      const bonuses = (salaryDetail.entries || []).filter((e: any) => e.kind === 'bonus').reduce((s: number, e: any) => s + e.amount, 0);
                      const advances = (salaryDetail.entries || []).filter((e: any) => e.kind === 'advance').reduce((s: number, e: any) => s + e.amount, 0);
                      const deductions = (salaryDetail.entries || []).filter((e: any) => e.kind === 'deduction').reduce((s: number, e: any) => s + e.amount, 0);
                      const adjustments = (salaryDetail.entries || []).filter((e: any) => e.kind === 'adjustment').reduce((s: number, e: any) => s + e.amount, 0);
                      const totalAccrued = salaryDetail.totalEarned + (salaryDetail.salaryBase || 0) + shiftPay + bonuses + Math.max(adjustments, 0);
                      const totalDeducted = advances + deductions + salaryDetail.totalPaid + Math.max(-adjustments, 0);
                      return (
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between"><span className={sub}>С услуг</span><span>{salaryDetail.totalEarned.toLocaleString('ru')} ₽ <span className={`${sub} text-xs`}>({salaryDetail.completedBookingsCount} задач)</span></span></div>
                          <div className="flex justify-between"><span className={sub}>Оклад</span><span>{(salaryDetail.salaryBase || 0).toLocaleString('ru')} ₽</span></div>
                          <div className="flex justify-between"><span className={sub}>За смены</span><span>{shiftPay.toLocaleString('ru')} ₽ <span className={`${sub} text-xs`}>({salaryDetail.shiftCount} × {(salaryDetail.salaryPerShift || 0).toLocaleString('ru')} ₽)</span></span></div>
                          {bonuses > 0 && <div className="flex justify-between"><span className={sub}>Бонусы</span><span style={{ color: '#22c55e' }}>+{bonuses.toLocaleString('ru')} ₽</span></div>}
                          {advances > 0 && <div className="flex justify-between"><span className={sub}>Авансы</span><span style={{ color: '#f59e0b' }}>−{advances.toLocaleString('ru')} ₽</span></div>}
                          {deductions > 0 && <div className="flex justify-between"><span className={sub}>Штрафы</span><span style={{ color: '#EF4444' }}>−{deductions.toLocaleString('ru')} ₽</span></div>}
                          {adjustments !== 0 && <div className="flex justify-between"><span className={sub}>Корректировки</span><span style={{ color: adjustments > 0 ? '#22c55e' : '#EF4444' }}>{adjustments > 0 ? '+' : ''}{adjustments.toLocaleString('ru')} ₽</span></div>}
                          <div className="border-t pt-1.5 mt-1.5 flex justify-between font-semibold" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                            <span>Итого начислено</span><span style={{ color: primary }}>{totalAccrued.toLocaleString('ru')} ₽</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Удержано и выплачено</span><span style={{ color: '#EF4444' }}>{totalDeducted.toLocaleString('ru')} ₽</span>
                          </div>
                          <div className="flex justify-between font-bold text-base">
                            <span>К выплате</span><span style={{ color: accent }}>{(totalAccrued - totalDeducted).toLocaleString('ru')} ₽</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* View toggle for completed tasks */}
                  <div className="flex gap-1.5 mb-3">
                    <button onClick={() => setEarningsViewMode('calendar')}
                      className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: earningsViewMode === 'calendar' ? primary : 'transparent', color: earningsViewMode === 'calendar' ? '#fff' : sub }}>
                      Календарь
                    </button>
                    <button onClick={() => setEarningsViewMode('list')}
                      className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: earningsViewMode === 'list' ? primary : 'transparent', color: earningsViewMode === 'list' ? '#fff' : sub }}>
                      По датам
                    </button>
                  </div>

                  {/* Calendar view */}
                  {earningsViewMode === 'calendar' && (
                    <WorkerEarningsCalendar
                      bookings={salaryDetail.bookings || []}
                      selectedDate={selectedCalDate}
                      onSelectDate={setSelectedCalDate}
                      onSelectBooking={setSelectedCompletedOrder}
                      glass={glass}
                      isDark={isDark}
                      sub={sub}
                      primary={primary}
                      accent={accent}
                    />
                  )}

                  {/* Grouped by date list */}
                  {earningsViewMode === 'list' && (
                    <div className="space-y-3 mb-3">
                      {groupBookingsByDate(salaryDetail.bookings || []).map(({ date, items }) => (
                        <div key={date}>
                          <div className={`text-xs font-medium ${sub} mb-1.5`}>{date}</div>
                          {items.map((b: any) => (
                            <div key={b.id} className={`${glass} rounded-xl p-3 mb-1.5 cursor-pointer`} onClick={() => setSelectedCompletedOrder(b)}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="text-sm font-medium">{b.time} · {b.service}</div>
                                  {b.car && <div className={`text-xs ${sub}`}>{b.car}{b.plate ? ` (${b.plate})` : ''}</div>}
                                  <div className={`text-xs ${sub}`}>{b.box} · {b.price?.toLocaleString('ru')} ₽{b.paymentType ? ` · ${b.paymentType === 'cash' ? 'Наличные' : b.paymentType === 'transfer' ? 'Перевод' : 'По счёту'}` : ''}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-sm" style={{ color: accent }}>+{b.earned.toLocaleString('ru')} ₽</div>
                                  {isFixedMasterService(services, b.serviceId, b.service)
                                    ? <div className={`text-xs ${sub}`}>фикс {formatFixedMasterAmount()}</div>
                                    : b.payType === 'fixed'
                                      ? <div className={`text-xs ${sub}`}>{(b.fixedAmount || 0).toLocaleString('ru')} ₽</div>
                                      : <div className={`text-xs ${sub}`}>{b.percent}%</div>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      {(salaryDetail.bookings || []).length === 0 && (
                        <div className={`${glass} rounded-2xl p-8 text-center`}>
                          <DollarSign size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} />
                          <p className={sub}>Нет завершённых задач</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Percent card */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <div className={`text-xs ${sub} mb-1`}>Мой процент</div>
                    <div className="font-bold text-xl" style={{ color: accent }}>{complaintState.effectivePercent}% от каждого заказа</div>
                    <div className={`text-xs ${sub} mt-1`}>База: {complaintState.basePercent}% · максимум 40%</div>
                    <div className="h-2 rounded-full mt-2" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <div className="h-2 rounded-full" style={{ width: `${complaintState.effectivePercent}%`, background: accent }} />
                    </div>
                  </div>

                  {/* Penalties */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className={`text-xs ${sub}`}>Жалобы владельца</div>
                        <div className="font-bold text-xl text-red-500">{complaintState.activeCount}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs ${sub}`}>Оклад</div>
                        <div className="font-semibold">{(staffProfile?.salaryBase || 0).toLocaleString('ru')} ₽</div>
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
                    {myPenalties.length === 0 ? (
                      <div className={`text-sm ${sub}`}>Жалоб пока нет</div>
                    ) : (
                      <div className="space-y-2">
                        {myPenalties.slice(0, 3).map((penalty) => (
                          <div key={penalty.id} className={`${glass} rounded-xl p-3 flex justify-between items-start text-sm gap-3`}>
                            <div>
                              <div className="font-medium">{penalty.title}</div>
                              <div className={`text-xs ${sub}`}>{penalty.reason}</div>
                              <div className={`text-[11px] ${sub} mt-1`}>{`Активна до ${formatComplaintDate(penalty.activeUntil)}`}</div>
                            </div>
                            <div className="text-right text-xs shrink-0" style={{ color: '#EF4444' }}>Активна</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Operations history */}
                  {(salaryDetail.entries?.length || 0) > 0 && (
                    <div className={`${glass} rounded-2xl p-4 mb-3`}>
                      <div className={`text-xs font-medium ${sub} mb-2`}>ОПЕРАЦИИ ЗА ПЕРИОД</div>
                      <div className="space-y-1.5">
                        {salaryDetail.entries.slice(0, 10).map((entry: any) => (
                          <div key={entry.id} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3 flex items-center justify-between gap-3`}>
                            <div>
                              <div className="text-sm font-medium">{kindLabel[entry.kind] || entry.kind}</div>
                              <div className={`text-xs ${sub}`}>{entry.note || entry.createdByName}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{entry.amount.toLocaleString('ru')} ₽</div>
                              <div className={`text-[11px] ${sub}`}>{entry.entryDate || new Date(entry.createdAt).toLocaleDateString('ru-RU')}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>

          ) : tab === 'profile' && !profileSection ? (
            /* ── PROFILE MAIN ── */
            <motion.div key="profile-main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              {/* Avatar + name */}
              <div className={`${glass} rounded-2xl p-5 mb-4`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="w-18 h-18 w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: `linear-gradient(135deg, ${primary}, #312E81)` }}>
                      {profile.name.charAt(0)}
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: primary }}>
                      <Camera size={12} strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg">{profile.name}</div>
                    <div className={`text-sm ${sub}`}>Мастер · {profile.experience}</div>
                    <div className="text-xs mt-0.5" style={{ color: accent }}>База {profile.percent}% · сейчас {complaintState.effectivePercent}%</div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Задач', value: allMyTasks.length, icon: Star },
                    { label: 'Выполнено', value: completedCount, icon: Check },
                    { label: 'Заработано', value: `${(earnedForDisplay / 1000).toFixed(1)}к`, icon: TrendingUp },
                  ].map(s => (
                    <div key={s.label} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-2.5 text-center`}>
                      <div className="font-bold text-sm" style={{ color: primary }}>{s.value}</div>
                      <div className={`text-xs ${sub}`}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specialty */}
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-1`}>СПЕЦИАЛИЗАЦИЯ</div>
                <div className="text-sm">{profile.specialty}</div>
                {profile.about && <div className={`text-xs ${sub} mt-1`}>{profile.about}</div>}
              </div>

              {/* Attendance */}
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-3`}>МОИ ВЫХОДЫ НА СМЕНУ</div>
                <AttendanceTable mode="worker" workerId={session?.actorId} primary={primary} />
              </div>

              {/* Menu items */}
              <div className="space-y-2">
                {[
                  { id: 'personal', icon: Edit3, label: 'Личные данные', desc: profile.phone, color: primary },
                  { id: 'shift', icon: Check, label: 'Чек-лист смены', desc: 'Химия на начало и конец', color: '#10B981' },
                  { id: 'attendance', icon: TrendingUp, label: 'Мои выходы', desc: 'Посещаемость за период', color: '#8B5CF6' },
                  { id: 'notifications', icon: Bell, label: 'Уведомления', desc: 'Управление оповещениями', color: '#312E81' },
                  { id: 'history', icon: History, label: 'История задач', desc: `${allMyTasks.length} всего`, color: '#F59E0B' },
                  { id: 'security', icon: Shield, label: 'Безопасность', desc: 'Пароль и сессии', color: '#EF4444' },
                ].map(item => (
                  <motion.button key={item.id} whileTap={{ scale: 0.98 }}
                    onClick={() => setProfileSection(item.id as ProfileSection)}
                    className={`${glass} rounded-2xl p-4 w-full text-left flex items-center gap-3`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}15` }}>
                      <item.icon size={16} strokeWidth={1.75} style={{ color: item.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className={`text-xs ${sub}`}>{item.desc}</div>
                    </div>
                    <ChevronRight size={15} strokeWidth={1.75} className={sub} />
                  </motion.button>
                ))}
              </div>
            </motion.div>

          ) : tab === 'profile' && profileSection === 'personal' ? (
            /* ── PROFILE: PERSONAL ── */
            <motion.div key="profile-personal" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className="space-y-3 mb-4">
                {[
                  { key: 'name', label: 'Имя', placeholder: 'Имя Фамилия', icon: User },
                  { key: 'phone', label: 'Телефон', placeholder: '+7 (___) ___-__-__', icon: Phone },
                  { key: 'email', label: 'Email', placeholder: 'email@domain.ru', icon: Mail },
                  { key: 'city', label: 'Город', placeholder: 'Москва', icon: MapPin },
                  { key: 'experience', label: 'Опыт', placeholder: '5 лет', icon: Award },
                  { key: 'specialty', label: 'Специализация', placeholder: 'Детейлинг, полировка', icon: Star },
                ].map(f => (
                  <div key={f.key}>
                    <label className={`text-xs ${sub} block mb-1`}>{f.label}</label>
                    <div className="relative">
                      <f.icon size={14} strokeWidth={1.75} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                      <input className={`${inputCls} pl-9`} placeholder={f.placeholder}
                        value={(profile as any)[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} />
                    </div>
                  </div>
                ))}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>О себе</label>
                  <textarea className={`${inputCls} h-20 resize-none`} placeholder="Расскажите о себе..."
                    value={profile.about} onChange={e => setProfile(p => ({ ...p, about: e.target.value }))} />
                </div>
                <div className={`${glass} rounded-2xl p-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Привязка Telegram</div>
                      <div className={`text-xs ${sub}`}>
                        {staffProfile?.telegramChatId ? 'Telegram уже привязан' : 'Получите код и отправьте его боту командой /link'}
                      </div>
                    </div>
                    <button onClick={handleGenerateTelegramCode} className="px-3 py-2 rounded-xl text-sm text-white" style={{ background: primary }}>
                      Код
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
              <button onClick={handleSaveProfile} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} strokeWidth={1.75} />{profileSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>

          ) : tab === 'profile' && profileSection === 'shift' ? (
            <motion.div key="profile-shift" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="font-semibold mb-2">Химия на смену</div>
                <div className={`text-xs ${sub} mb-3`}>Заполните остатки по химии при начале и закрытии смены</div>
                <div className="space-y-2 mb-3">
                  {chemistryItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className={`text-xs ${sub}`}>Сейчас на складе: {item.qty} {item.unit}</div>
                      </div>
                      <input
                        className={`${inputCls} w-24`}
                        type="number"
                        min={0}
                        value={shiftChecklistDraft[item.id] ?? item.qty}
                        onChange={(event) => setShiftChecklistDraft((current) => ({ ...current, [item.id]: event.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <textarea
                  className={`${inputCls} h-20 resize-none mb-3`}
                  placeholder="Примечание по смене"
                  value={shiftChecklistNote}
                  onChange={(event) => setShiftChecklistNote(event.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { void handleSubmitShiftChecklist('start'); }} disabled={submittingShiftPhase !== null} className="py-3 rounded-2xl text-white font-semibold disabled:opacity-60" style={{ background: primary }}>
                    {submittingShiftPhase === 'start' ? 'Сохраняю...' : 'Принять смену'}
                  </button>
                  <button onClick={() => { void handleSubmitShiftChecklist('end'); }} disabled={submittingShiftPhase !== null} className="py-3 rounded-2xl text-white font-semibold disabled:opacity-60" style={{ background: accent }}>
                    {submittingShiftPhase === 'end' ? 'Сохраняю...' : 'Закрыть смену'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {shiftChecklists.map((entry) => (
                  <div key={entry.id} className={`${glass} rounded-2xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{entry.phase === 'start' ? 'Принятие смены' : 'Закрытие смены'}</div>
                      <div className={`text-xs ${sub}`}>{entry.createdAt.toLocaleString('ru-RU')}</div>
                    </div>
                    {entry.items.slice(0, 4).map((item: any) => (
                      <div key={item.stockItemId} className="flex justify-between text-sm py-1">
                        <span>{item.name}</span>
                        <span>{item.actualQty} {item.unit}</span>
                      </div>
                    ))}
                    {entry.note && <div className={`text-xs ${sub} mt-2`}>{entry.note}</div>}
                  </div>
                ))}
              </div>
            </motion.div>

          ) : tab === 'profile' && profileSection === 'notifications' ? (
            /* ── PROFILE: NOTIFICATIONS ── */
            <motion.div key="profile-notif" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              {[
                { key: 'newTask', label: 'Новые задачи', desc: 'При назначении задачи' },
                { key: 'taskUpdate', label: 'Обновления задач', desc: 'Изменение статуса' },
                { key: 'payment', label: 'Начисление оплаты', desc: 'После завершения задачи' },
                { key: 'reminders', label: 'Напоминания', desc: 'За 30 мин до задачи' },
                { key: 'sms', label: 'SMS уведомления', desc: 'На номер телефона' },
              ].map(item => (
                <div key={item.key} className={`${glass} rounded-xl p-4 mb-2 flex items-center justify-between`}>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className={`text-xs ${sub}`}>{item.desc}</div>
                  </div>
                  <button onClick={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                    className="w-11 h-6 rounded-full relative transition-all shrink-0"
                    style={{ background: notifPrefs[item.key as keyof typeof notifPrefs] ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#D4D4D8' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifPrefs[item.key as keyof typeof notifPrefs] ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
              <button onClick={handleSaveNotifications} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: primary }}>
                <Save size={16} strokeWidth={1.75} />{profileSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>

          ) : tab === 'profile' && profileSection === 'history' ? (
            /* ── PROFILE: HISTORY ── */
            <motion.div key="profile-history" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              {allMyTasks.length === 0 ? (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <History size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>Нет выполненных задач</p>
                </div>
              ) : allMyTasks.map(task => {
                const w = task.workers.find(wk => wk.workerId === workerId);
                const earned = task.status === 'completed'
                  ? (w?.payType === 'fixed' ? (w.fixedAmount || 0) : (isFixedMasterService(services, task.serviceId, task.service) ? FIXED_MASTER_EARNED : Math.round(task.price * (w?.percent || 0) / 100)))
                  : 0;
                const paymentLabel = task.paymentType === 'cash' ? 'Наличные' : task.paymentType === 'transfer' ? 'Перевод' : task.paymentType === 'invoice' ? 'По счёту' : '';
                return (
                  <div key={task.id} className={`${glass} rounded-xl p-3 mb-2 cursor-pointer`} onClick={() => setSelectedCompletedOrder({ service: task.service, car: task.car, plate: task.plate, date: task.date, time: task.time, box: task.box, price: task.price, paymentType: task.paymentType, paymentSettled: task.paymentSettled, earned, percent: w?.percent, payType: w?.payType, fixedAmount: w?.fixedAmount, notes: task.notes })}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{task.service}</div>
                        {task.car && <div className={`text-xs ${sub}`}>{task.car}{task.plate ? ` (${task.plate})` : ''}</div>}
                        <div className={`text-xs ${sub}`}>{task.date} · {task.box} · {task.duration} мин</div>
                        <div className={`text-xs ${sub}`}>{task.price.toLocaleString('ru')} ₽ · {paymentLabel}{task.paymentSettled ? '' : ' (не оплачено)'}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${task.status === 'completed' ? 'bg-green-500/15 text-green-600' : workerStatusBadge(task.status)}`}>
                          {task.status === 'completed' ? 'Выполнено' : workerStatusLabel(task.status)}
                        </span>
                        {earned > 0 && <div className="text-xs font-semibold mt-1" style={{ color: accent }}>+{earned.toLocaleString('ru')} ₽</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>

          ) : tab === 'profile' && profileSection === 'security' ? (
            /* ── PROFILE: SECURITY ── */
            <motion.div key="profile-security" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-3`}>СМЕНА ПАРОЛЯ</div>
                {[{ key: 'current', label: 'Текущий пароль' }, { key: 'new_', label: 'Новый пароль' }, { key: 'confirm', label: 'Повторите' }].map(f => (
                  <div key={f.key} className="mb-3">
                    <label className={`text-xs ${sub} block mb-1`}>{f.label}</label>
                    <div className="relative">
                      <input className={inputCls} type={showPass ? 'text' : 'password'} placeholder="••••••••"
                        value={password[f.key as keyof typeof password]}
                        onChange={e => {
                          setPassError(null);
                          setPassSaved(false);
                          setPassword(p => ({ ...p, [f.key]: e.target.value }));
                        }} />
                      <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                        {showPass ? <EyeOff size={14} strokeWidth={1.75} className={sub} /> : <Eye size={14} strokeWidth={1.75} className={sub} />}
                      </button>
                    </div>
                  </div>
                ))}
                {passError && <div className="text-xs text-red-500">{passError}</div>}
                {passSaved && <div className="text-xs text-green-600">Пароль обновлён</div>}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs ${sub} mb-2`}>АКТИВНЫЕ СЕССИИ</div>
                {activeSessions.length === 0 ? (
                  <div className={`text-xs ${sub}`}>Нет активных сессий</div>
                ) : activeSessions.map((item) => (
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
              <button onClick={handleSavePass}
                disabled={!password.current || !password.new_ || password.new_ !== password.confirm}
                className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#EF4444' }}>
                <Shield size={16} strokeWidth={1.75} />{passSaved ? 'Изменён!' : 'Изменить пароль'}
              </button>
            </motion.div>

          ) : tab === 'profile' && profileSection === 'attendance' ? (
            <motion.div key="profile-attendance" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setProfileSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />Назад</button>
              <h2 className="font-semibold mb-2">Мои выходы на смену</h2>
              <p className={`text-xs ${sub} mb-4`}>Количество выходов за выбранный период.</p>
              <AttendanceTable mode="worker" workerId={session?.actorId} primary={primary} />
            </motion.div>

          ) : null}
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <div className={`fixed bottom-[calc(.9rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 flex gap-1 rounded-full border p-1.5 shadow-lg backdrop-blur-xl max-w-[calc(100vw-1.5rem)] overflow-x-auto ${isDark ? 'bg-[#1C1C1F]/92 border-white/10' : 'bg-white/92 border-black/[.06]'}`} style={{ scrollbarWidth: 'none' }}>
        {[
          { id: 'today', icon: CalendarClock, label: 'Сегодня' },
          { id: 'schedule', icon: CalendarDays, label: 'Расписание' },
          { id: 'earnings', icon: Wallet, label: 'Доход' },
          { id: 'profile', icon: UserRound, label: 'Профиль' },
        ].map(t => {
          const isActive = tab === t.id;
          return (
          <button key={t.id} onClick={() => { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); setTab(t.id as WorkerTab); setShowDetail(false); setProfileSection(null); setSelectedCompletedOrder(null); setSelectedCalDate(null); }} className={`relative flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${isActive ? 'pl-3 pr-4' : ''}`}>
            {isActive && (
              <motion.span layoutId="worker-nav-pill" transition={{ type: 'spring', stiffness: 480, damping: 38 }} className="absolute inset-0 rounded-full" style={{ background: 'var(--primary, #4F46E5)' }} />
            )}
            <t.icon size={19} strokeWidth={1.75} fill={isActive ? 'currentColor' : 'none'} className="relative" style={{ color: isActive ? '#fff' : undefined }} />
            <span className={`relative whitespace-nowrap ${isActive ? '' : 'hidden'}`} style={{ color: isActive ? '#fff' : undefined }}>{t.label}</span>
            {!isActive && <span className={`sr-only`}>{t.label}</span>}
          </button>
          );
        })}
      </div>

      {/* ── START CONFIRMATION — DS Dialog ── */}
      <Dialog
        open={Boolean(showStartConfirm)}
        onClose={() => setShowStartConfirm(null)}
        title="Начать задачу?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setShowStartConfirm(null)}>
              Отмена
            </Button>
            <Button className="flex-1" onClick={() => showStartConfirm && handleStartTask(showStartConfirm)}>
              Начать
            </Button>
          </>
        }
      >
        {showStartConfirm && (
          <>
            <span className="block font-medium text-foreground">{showStartConfirm.service}</span>
            <span className="mt-0.5 block">{showStartConfirm.clientName} · {showStartConfirm.time}</span>
          </>
        )}
      </Dialog>

      {/* ── FINISH — DS Sheet ── */}
      <Sheet
        open={showFinishModal}
        onClose={() => { if (!finishSuccess) { setShowFinishModal(false); setFinishError(null); } }}
        title="Завершить задачу"
      >
        {finishSuccess ? (
          <div className="flex flex-col items-center py-10 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
              className="mb-3 flex size-16 items-center justify-center rounded-full bg-[var(--status-success-soft)]">
              <Check size={28} strokeWidth={1.75} style={{ color: 'var(--status-success)' }} aria-hidden />
            </motion.div>
            <div className="font-semibold">Задача завершена!</div>
            {sendCheck && <div className="mt-1 text-sm text-[var(--fg-secondary,#5A6072)]">Отметка о чеке отправлена администратору</div>}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <FormRow label="Сумма услуги">
                <div className="flex items-center justify-between rounded-xl border border-border bg-[var(--sunken,#EEEFF3)] px-3.5 py-2.5 text-sm dark:bg-white/5">
                  <Money amount={selectedTask?.price ?? 0} />
                  <span className="text-xs text-[var(--fg-secondary,#5A6072)]">Фиксировано</span>
                </div>
              </FormRow>
              <FormRow label="Клиент оплатил?">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setFinishError(null); setFinishPaymentSettled(true); }}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${finishPaymentSettled ? 'text-white' : 'text-[var(--fg-secondary,#5A6072)]'}`}
                    style={{ background: finishPaymentSettled ? 'var(--primary-600)' : 'transparent', borderColor: finishPaymentSettled ? 'var(--primary-600)' : 'var(--border-strong)' }}
                  >
                    Да, оплатил
                  </button>
                  <button
                    onClick={() => { setFinishError(null); setFinishPaymentSettled(false); }}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${!finishPaymentSettled ? 'text-white' : 'text-[var(--fg-secondary,#5A6072)]'}`}
                    style={{ background: !finishPaymentSettled ? 'var(--status-danger)' : 'transparent', borderColor: !finishPaymentSettled ? 'var(--status-danger)' : 'var(--border-strong)' }}
                  >
                    Нет, не оплатил
                  </button>
                </div>
              </FormRow>
              {finishPaymentSettled && (
                <FormRow label="Способ оплаты">
                  <select
                    className="w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-[var(--ring)] dark:bg-white/[.06]"
                    value={finishPaymentType ?? 'cash'}
                    onChange={(e) => { setFinishError(null); setFinishPaymentType(e.target.value as PaymentType); }}
                  >
                    <option value="cash">Наличные</option>
                    <option value="transfer">Перевод</option>
                    <option value="invoice">По счёту</option>
                  </select>
                </FormRow>
              )}
              <FormRow label="Комментарий">
                <Input placeholder="Добавьте комментарий..." value={finishNote} onChange={(e) => { setFinishError(null); setFinishNote(e.target.value); }} />
              </FormRow>
              {finishError && <div className="text-xs text-[var(--status-danger)]">{finishError}</div>}
              <label className="flex cursor-pointer items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={sendCheck}
                  onClick={() => setSendCheck(!sendCheck)}
                  className="relative h-6 w-10 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] outline-none"
                  style={{ background: sendCheck ? 'var(--primary-600)' : 'var(--switch-background, #D4D4D8)' }}
                >
                  <span className={`absolute top-1 size-4 rounded-full bg-white transition-all ${sendCheck ? 'left-5' : 'left-1'}`} />
                </button>
                <span className="text-sm">Отправить чек клиенту</span>
              </label>
            </div>
            <div className="mt-5 space-y-2 pb-2">
              <Button size="lg" onClick={() => { void handleFinish(); }}>Подтвердить</Button>
              <button onClick={() => { setShowFinishModal(false); setFinishError(null); }} className="w-full py-2 text-sm text-[var(--fg-secondary,#5A6072)]">Отмена</button>
            </div>
          </>
        )}
      </Sheet>

      {/* ── NOTIFICATIONS ── */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowNotifications(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl max-h-[70vh] overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0" style={{ background: surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Уведомления</h3>
                <button onClick={() => setShowNotifications(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="p-4 space-y-2">
                {myNotifications.length === 0 ? (
                  <p className={`text-sm ${sub} text-center py-8`}>Нет уведомлений</p>
                ) : myNotifications.map(n => (
                  <div key={n.id} onClick={() => markNotificationRead(n.id)}
                    className={`${glass} rounded-xl p-3 cursor-pointer border-l-2`} style={{ borderLeftColor: n.read ? 'transparent' : primary }}>
                    <div className="flex items-start gap-2">
                      <Bell size={13} strokeWidth={1.75} style={{ color: primary }} className="mt-0.5 shrink-0" />
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

      {/* ── COMPLETED ORDER DETAIL ── */}
      <AnimatePresence>
        {selectedCompletedOrder && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelectedCompletedOrder(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl max-h-[70vh] overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0" style={{ background: surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Детали заказа</h3>
                <button onClick={() => setSelectedCompletedOrder(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="p-4 space-y-3">
                {/* Service */}
                <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                  <div className={`text-xs ${sub} mb-1`}>Услуга</div>
                  <div className="font-semibold">{selectedCompletedOrder.service}</div>
                </div>

                {/* Car */}
                {selectedCompletedOrder.car && (
                  <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                    <div className={`text-xs ${sub} mb-1`}>Автомобиль</div>
                    <div className="font-semibold">{selectedCompletedOrder.car}</div>
                    {selectedCompletedOrder.plate && <div className={`text-sm ${sub}`}>Гос. номер: {selectedCompletedOrder.plate}</div>}
                  </div>
                )}

                {/* Date & Time */}
                <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                  <div className={`text-xs ${sub} mb-1`}>Дата и время</div>
                  <div className="font-semibold">{selectedCompletedOrder.date} · {selectedCompletedOrder.time}</div>
                  {selectedCompletedOrder.box && <div className={`text-sm ${sub}`}>{selectedCompletedOrder.box}</div>}
                </div>

                {/* Payment */}
                <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                  <div className={`text-xs ${sub} mb-1`}>Оплата</div>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-lg" style={{ color: accent }}>{selectedCompletedOrder.price?.toLocaleString('ru')} ₽</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCompletedOrder.paymentSettled ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'}`}>
                      {selectedCompletedOrder.paymentSettled ? 'Оплачено' : 'Не оплачено'}
                    </span>
                  </div>
                  {selectedCompletedOrder.paymentType && (
                    <div className={`text-sm ${sub} mt-1`}>
                      Способ: {selectedCompletedOrder.paymentType === 'cash' ? 'Наличные' : selectedCompletedOrder.paymentType === 'transfer' ? 'Перевод' : 'По счёту'}
                    </div>
                  )}
                </div>

                {/* Worker earnings */}
                {selectedCompletedOrder.earned != null && (
                  <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                    <div className={`text-xs ${sub} mb-1`}>Мой заработок</div>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-lg" style={{ color: primary }}>+{selectedCompletedOrder.earned?.toLocaleString('ru')} ₽</div>
                      {isFixedMasterService(services, selectedCompletedOrder.serviceId, selectedCompletedOrder.service)
                        ? <div className={`text-sm ${sub}`}>фикс {formatFixedMasterAmount()}</div>
                        : selectedCompletedOrder.payType === 'fixed'
                          ? <div className={`text-sm ${sub}`}>{(selectedCompletedOrder.fixedAmount || 0).toLocaleString('ru')} ₽</div>
                          : selectedCompletedOrder.percent != null && <div className={`text-sm ${sub}`}>{selectedCompletedOrder.percent}%</div>}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedCompletedOrder.notes && (
                  <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                    <div className={`text-xs ${sub} mb-1`}>Комментарий</div>
                    <div className="text-sm">{selectedCompletedOrder.notes}</div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Profile saved toast */}
      <AnimatePresence>
        {profileSaved && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-16 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${accent}40` }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}20` }}><Check size={14} strokeWidth={1.75} style={{ color: accent }} /></div>
            <span className="text-sm font-medium">Профиль обновлён</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
