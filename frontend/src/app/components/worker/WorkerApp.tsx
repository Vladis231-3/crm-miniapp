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
import { WorkerTodayScreen } from './screens/WorkerTodayScreen';
import { WorkerScheduleScreen } from './screens/WorkerScheduleScreen';
import { WorkerEarningsScreen } from './screens/WorkerEarningsScreen';
import { WorkerProfileScreen } from './screens/WorkerProfileScreen';
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
  const [finishError, setFinishError] = useState<string | null>(null);

  // Profile state (профиль/безопасность/чек-лист/уведомления) переехал в
  // screens/WorkerProfileScreen.tsx вместе с эффектами и хендлерами


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
            <WorkerTodayScreen
              tasks={todayTasks}
              workerId={workerId}
              onOpenTask={(task) => { setSelectedTask(task); setShowDetail(true); }}
              onStartRequest={setShowStartConfirm}
              onFinishRequest={openFinishModal}
              onOpenChecklist={() => setProfileSection(`shift`)}
              onGoSchedule={() => setTab(`schedule`)}
            />

          ) : tab === 'schedule' && !profileSection ? (
            <WorkerScheduleScreen
              upcomingDates={upcomingDates}
              bookings={bookings}
              workerId={workerId}
              isDark={isDark}
              workers={workers}
              schedule={schedule}
            />


          ) : tab === 'earnings' && !profileSection ? (
            <WorkerEarningsScreen workerId={workerId} onSelectBooking={setSelectedCompletedOrder} />

          ) : tab === 'profile' ? (
            <WorkerProfileScreen
              section={profileSection}
              onSectionChange={setProfileSection}
              workerId={workerId}
              onOpenTaskDetails={setSelectedCompletedOrder}
            />

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

      {/* Профильный тост переехал в WorkerProfileScreen (DS toast) */}
    </div>
  );
}
