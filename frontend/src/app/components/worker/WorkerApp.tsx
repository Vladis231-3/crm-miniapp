import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Sun, Moon, Calendar, DollarSign, User, Play,
  Info, ArrowLeft, Phone, X, Check, Clock, ChevronRight, AlertCircle,
  Edit3, Save, Camera, Star, Shield, BellOff, History, LogOut,
  Mail, MapPin, Award, Eye, EyeOff, TrendingUp
} from 'lucide-react';
import { getWorkerNotificationSettings, useApp, Booking } from '../../context/AppContext';
import { COMPLAINT_THRESHOLD, getComplaintPenaltyState, isComplaintActive } from '../../utils/complaints';

type WorkerTab = 'today' | 'schedule' | 'earnings' | 'profile';
type ProfileSection = null | 'personal' | 'notifications' | 'history' | 'security' | 'shift';

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
    listShiftChecklists,
    submitShiftChecklist,
    changePassword,
    refreshActiveSessions,
    revokeSession,
    todayLabel,
    upcomingDates,
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
  const [finishAmount, setFinishAmount] = useState('');
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

  const myNotifications = notifications.filter(n => n.recipientRole === 'worker' && n.recipientId === workerId);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const allTasks = bookings.filter(b =>
    filterMine ? b.workers.some(w => w.workerId === workerId) : true
  );
  const todayTasks = allTasks.filter(b => b.date === todayLabel);

  const myEarnings = bookings
    .filter(b => b.status === 'completed' && b.workers.some(w => w.workerId === workerId))
    .map(b => {
      const w = b.workers.find(wk => wk.workerId === workerId);
      return { ...b, earned: Math.round(b.price * (w?.percent || 0) / 100) };
    });
  const totalEarned = myEarnings.reduce((s, b) => s + b.earned, 0);
  const payrollSummary = staffProfile?.payrollSummary;
  const myPenalties = penalties.filter((penalty) => penalty.workerId === workerId && isComplaintActive(penalty));
  const complaintState = getComplaintPenaltyState(staffProfile?.defaultPercent || 0, myPenalties);
  const payoutAfterPenalties = payrollSummary?.balance ?? Math.max(0, totalEarned + (staffProfile?.salaryBase || 0));

  const allMyTasks = bookings.filter(b => b.workers.some(w => w.workerId === workerId));
  const completedCount = payrollSummary?.completedBookings ?? allMyTasks.filter(b => b.status === 'completed').length;
  const avgCheck = completedCount > 0 ? Math.round((payrollSummary?.accruedFromBookings ?? totalEarned) / completedCount) : 0;
  const chemistryItems = stockItems.filter((item) => item.category === 'Химия');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning) interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const glass = isDark ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm';
  const bg = isDark ? 'bg-[#0B1226]' : 'bg-[#F6F7FA]';
  const text = isDark ? 'text-[#E6EEF8]' : 'text-[#0B1226]';
  const sub = isDark ? 'text-[#9AA6B2]' : 'text-[#6B7280]';
  const primary = isDark ? '#4AA8FF' : '#0A84FF';
  const accent = isDark ? '#5DD68F' : '#34C759';
  const surface = isDark ? '#0E1624' : '#ffffff';
  const inputCls = `${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-white border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const formatComplaintDate = (value: Date) => value.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const handleStartTask = (task: Booking) => {
    updateBooking(task.id, { status: 'in_progress' });
    setTimerRunning(true);
    setTimer(0);
    setShowStartConfirm(null);
  };

  const handleFinish = async () => {
    if (!selectedTask) return;
    const normalizedAmount = Number(finishAmount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
      setFinishError('Укажите корректную итоговую сумму');
      return;
    }
    const nextNote = finishNote.trim();
    const nextPrice = Math.round(normalizedAmount);
    try {
      await updateBooking(selectedTask.id, {
        status: 'completed',
        price: nextPrice,
        notes: nextNote || selectedTask.notes || '',
      });
      setSelectedTask(prev => prev ? {
        ...prev,
        status: 'completed',
        price: nextPrice,
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
    setFinishSuccess(true);
    setTimeout(() => {
      setFinishSuccess(false);
      setShowFinishModal(false);
      setShowDetail(false);
      setFinishAmount('');
      setFinishNote('');
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
    <div className={`${isDark ? 'dark' : ''} ${bg} ${text} min-h-screen flex flex-col`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 ${glass} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {(showDetail || profileSection) && (
            <button onClick={() => { setShowDetail(false); setProfileSection(null); }} className={`p-2 rounded-xl ${glass} mr-1`}><ArrowLeft size={18} /></button>
          )}
          <div>
            <div className="font-semibold text-sm">{headerTitle}</div>
            {!showDetail && tab === 'today' && !profileSection && <div className={`text-xs ${sub}`}>{todayLabel}</div>}
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
            <Bell size={18} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>}
          </button>
          <button onClick={toggleTheme} className={`p-2 rounded-xl ${glass}`}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">

          {/* ── TASK DETAIL ── */}
          {showDetail && selectedTask ? (
            <motion.div key="detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.22 }} className="px-4 py-4">
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-2`}>КЛИЕНТ</div>
                <div className="font-semibold">{selectedTask.clientName}</div>
                <a href={`tel:${selectedTask.clientPhone}`} className="flex items-center gap-2 mt-1" style={{ color: primary }}>
                  <Phone size={14} /><span className="text-sm">{selectedTask.clientPhone}</span>
                </a>
                {selectedTask.car && <div className={`text-sm ${sub} mt-1`}>{selectedTask.car} · {selectedTask.plate}</div>}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-2`}>ЗАДАЧА</div>
                <div className="font-semibold">{selectedTask.service}</div>
                <div className={`text-sm ${sub} mt-1`}>{selectedTask.date} в {selectedTask.time} · {selectedTask.duration} мин</div>
                <div className={`text-sm ${sub}`}>{selectedTask.box}</div>
              </div>
              {selectedTask.workers.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className={`text-xs font-medium ${sub} mb-2`}>КОЛЛЕГИ</div>
                  {selectedTask.workers.map(w => (
                    <div key={w.workerId} className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white" style={{ background: primary }}>{w.workerName.charAt(0)}</div>
                        <span className="text-sm">{w.workerName}</span>
                      </div>
                      <span className={`text-sm ${sub}`}>{w.percent}%</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedTask.status === 'in_progress' && (
                <div className={`${glass} rounded-2xl p-4 mb-3 text-center`}>
                  <div className={`text-xs ${sub} mb-2`}>Время работы</div>
                  <div className="text-3xl font-bold" style={{ color: primary }}>{formatTimer(timer)}</div>
                </div>
              )}
              <div className="space-y-2">
                {READY_TO_START_STATUSES.includes(selectedTask.status) && (
                  <button onClick={() => setShowStartConfirm(selectedTask)} className="w-full py-3.5 rounded-2xl font-semibold text-white flex items-center justify-center gap-2" style={{ background: accent }}>
                    <Play size={18} />Начать задачу
                  </button>
                )}
                {selectedTask.status === 'in_progress' && (
                  <button onClick={() => { setFinishAmount(String(selectedTask.price)); setFinishNote(selectedTask.notes || ''); setFinishError(null); setShowFinishModal(true); }} className="w-full py-3.5 rounded-2xl font-semibold text-white flex items-center justify-center gap-2" style={{ background: primary }}>
                    <Check size={18} />Завершить
                  </button>
                )}
              </div>
            </motion.div>

          ) : tab === 'today' && !profileSection ? (
            <motion.div key="today" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              {todayTasks.length === 0 ? (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <Clock size={36} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>Задач на сегодня нет</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayTasks.map(task => (
                    <motion.div key={task.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${glass} rounded-2xl p-4`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-sm">{task.time} · {task.service}</div>
                          <div className={`text-sm ${sub}`}>{task.clientName}</div>
                          <div className={`text-xs ${sub}`}>{task.box} · {task.duration} мин</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${workerStatusBadge(task.status)}`}>
                          {workerStatusLabel(task.status)}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {READY_TO_START_STATUSES.includes(task.status) && (
                          <button onClick={() => setShowStartConfirm(task)} className="flex-1 py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1" style={{ background: accent }}>
                            <Play size={14} />Начать
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button onClick={() => { setSelectedTask(task); setFinishAmount(String(task.price)); setFinishNote(task.notes || ''); setFinishError(null); setShowFinishModal(true); }} className="flex-1 py-2 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1" style={{ background: primary }}>
                            <Check size={14} />Завершить
                          </button>
                        )}
                        <button onClick={() => { setSelectedTask(task); setShowDetail(true); }} className={`flex-1 py-2 rounded-xl text-sm ${glass} flex items-center justify-center gap-1`}>
                          <Info size={14} />Детали
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

          ) : tab === 'schedule' && !profileSection ? (
            <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <h2 className="font-semibold mb-4">Расписание</h2>
              {upcomingDates.slice(0, 3).map(date => {
                const dayTasks = bookings.filter(b => b.date === date && b.workers.some(w => w.workerId === workerId));
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
                            <div className={`text-xs ${sub}`}>{task.box} · {task.clientName}</div>
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
              <h2 className="font-semibold mb-4">Заработок</h2>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'К выплате', value: `${payoutAfterPenalties.toLocaleString('ru')} ₽`, color: primary },
                  { label: 'Задач', value: completedCount, color: accent },
                  { label: 'Жалоб', value: complaintState.activeCount, color: '#EF4444' },
                ].map(s => (
                  <div key={s.label} className={`${glass} rounded-2xl p-3 text-center`}>
                    <div className="font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className={`text-xs ${sub}`}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-1`}>Мой процент</div>
                <div className="font-bold text-xl" style={{ color: accent }}>{complaintState.effectivePercent}% от каждого заказа</div>
                <div className={`text-xs ${sub} mt-1`}>База: {complaintState.basePercent}% · максимум 40%</div>
                <div className="h-2 rounded-full mt-2" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="h-2 rounded-full" style={{ width: `${complaintState.effectivePercent}%`, background: accent }} />
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
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
              {payrollSummary && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className={`text-xs ${sub}`}>Зарплата и выплаты</div>
                      <div className="font-bold text-xl" style={{ color: accent }}>{(payrollSummary.balance || 0).toLocaleString('ru')} ₽</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs ${sub}`}>К выплате</div>
                      <div className="font-semibold">{(payrollSummary.totalAccrued || 0).toLocaleString('ru')} ₽</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                      <div className={`text-xs ${sub}`}>Начислено</div>
                      <div className="font-semibold mt-1">{(payrollSummary.totalAccrued || 0).toLocaleString('ru')} ₽</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                      <div className={`text-xs ${sub}`}>Удержано и выдано</div>
                      <div className="font-semibold mt-1">{(payrollSummary.totalDeducted || 0).toLocaleString('ru')} ₽</div>
                    </div>
                  </div>
                  {(payrollSummary.entries?.length || 0) > 0 && (
                    <div className="space-y-2">
                      {payrollSummary.entries.slice(0, 4).map((entry) => (
                        <div key={entry.id} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3 flex items-center justify-between gap-3`}>
                          <div>
                            <div className="text-sm font-medium">{entry.kind}</div>
                            <div className={`text-xs ${sub}`}>{entry.note || entry.createdByName}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{entry.amount.toLocaleString('ru')} ₽</div>
                            <div className={`text-[11px] ${sub}`}>{entry.createdAt.toLocaleDateString('ru-RU')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {myEarnings.map(b => (
                  <div key={b.id} className={`${glass} rounded-xl p-3`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">{b.service}</div>
                        <div className={`text-xs ${sub}`}>{b.date} · {b.clientName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm" style={{ color: accent }}>+{b.earned.toLocaleString('ru')} ₽</div>
                        <div className={`text-xs ${sub}`}>{b.workers.find(w => w.workerId === workerId)?.percent}%</div>
                      </div>
                    </div>
                  </div>
                ))}
                {myEarnings.length === 0 && (
                  <div className={`${glass} rounded-2xl p-8 text-center`}>
                    <DollarSign size={36} className={`mx-auto mb-3 ${sub}`} />
                    <p className={sub}>Нет завершённых задач</p>
                  </div>
                )}
              </div>
            </motion.div>

          ) : tab === 'profile' && !profileSection ? (
            /* ── PROFILE MAIN ── */
            <motion.div key="profile-main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              {/* Avatar + name */}
              <div className={`${glass} rounded-2xl p-5 mb-4`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="w-18 h-18 w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: `linear-gradient(135deg, ${primary}, #A855F7)` }}>
                      {profile.name.charAt(0)}
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: primary }}>
                      <Camera size={12} />
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
                    { label: 'Заработано', value: `${(totalEarned / 1000).toFixed(1)}к`, icon: TrendingUp },
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

              {/* Menu items */}
              <div className="space-y-2">
                {[
                  { id: 'personal', icon: Edit3, label: 'Личные данные', desc: profile.phone, color: primary },
                  { id: 'shift', icon: Check, label: 'Чек-лист смены', desc: 'Химия на начало и конец', color: '#34C759' },
                  { id: 'notifications', icon: Bell, label: 'Уведомления', desc: 'Управление оповещениями', color: '#A855F7' },
                  { id: 'history', icon: History, label: 'История задач', desc: `${allMyTasks.length} всего`, color: '#F59E0B' },
                  { id: 'security', icon: Shield, label: 'Безопасность', desc: 'Пароль и сессии', color: '#EF4444' },
                ].map(item => (
                  <motion.button key={item.id} whileTap={{ scale: 0.98 }}
                    onClick={() => setProfileSection(item.id as ProfileSection)}
                    className={`${glass} rounded-2xl p-4 w-full text-left flex items-center gap-3`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}15` }}>
                      <item.icon size={16} style={{ color: item.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className={`text-xs ${sub}`}>{item.desc}</div>
                    </div>
                    <ChevronRight size={15} className={sub} />
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
                      <f.icon size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
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
                <Save size={16} />{profileSaved ? 'Сохранено!' : 'Сохранить'}
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
                    style={{ background: notifPrefs[item.key as keyof typeof notifPrefs] ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifPrefs[item.key as keyof typeof notifPrefs] ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
              <button onClick={handleSaveNotifications} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: primary }}>
                <Save size={16} />{profileSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>

          ) : tab === 'profile' && profileSection === 'history' ? (
            /* ── PROFILE: HISTORY ── */
            <motion.div key="profile-history" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              {allMyTasks.length === 0 ? (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <History size={36} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>Нет выполненных задач</p>
                </div>
              ) : allMyTasks.map(task => {
                const w = task.workers.find(wk => wk.workerId === workerId);
                const earned = task.status === 'completed' ? Math.round(task.price * (w?.percent || 0) / 100) : 0;
                return (
                  <div key={task.id} className={`${glass} rounded-xl p-3 mb-2`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{task.service}</div>
                        <div className={`text-xs ${sub}`}>{task.date} · {task.clientName}</div>
                        <div className={`text-xs ${sub}`}>{task.box} · {task.duration} мин</div>
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
                        {showPass ? <EyeOff size={14} className={sub} /> : <Eye size={14} className={sub} />}
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
                <Shield size={16} />{passSaved ? 'Изменён!' : 'Изменить пароль'}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <div className={`fixed bottom-0 left-0 right-0 z-10 ${glass} border-t ${isDark ? 'border-white/10' : 'border-black/5'} flex`}>
        {[
          { id: 'today', icon: Clock, label: 'Сегодня' },
          { id: 'schedule', icon: Calendar, label: 'Расписание' },
          { id: 'earnings', icon: DollarSign, label: 'Заработок' },
          { id: 'profile', icon: User, label: 'Профиль' },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id as WorkerTab); setShowDetail(false); setProfileSection(null); }} className="flex-1 py-3 flex flex-col items-center gap-1">
            <t.icon size={20} style={{ color: tab === t.id ? primary : undefined }} className={tab !== t.id ? sub : ''} />
            <span className="text-xs" style={{ color: tab === t.id ? primary : undefined }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── START CONFIRMATION ── */}
      <AnimatePresence>
        {showStartConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-2xl p-5 w-full max-w-xs`}>
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${accent}20` }}><Play size={18} style={{ color: accent }} /></div>
                <button onClick={() => setShowStartConfirm(null)} className={`p-1 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <h3 className="font-semibold mb-1">Начать задачу?</h3>
              <p className={`text-sm ${sub} mb-1`}>{showStartConfirm.service}</p>
              <p className={`text-sm ${sub} mb-5`}>{showStartConfirm.clientName} · {showStartConfirm.time}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowStartConfirm(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>Отмена</button>
                <button onClick={() => handleStartTask(showStartConfirm)} className="flex-1 py-2.5 rounded-xl text-sm text-white font-medium" style={{ background: accent }}>Начать</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FINISH MODAL ── */}
      <AnimatePresence>
        {showFinishModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm relative`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <AnimatePresence>
                {finishSuccess && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: isDark ? 'rgba(14,22,36,0.97)' : 'rgba(255,255,255,0.97)', borderRadius: '1.5rem 1.5rem 0 0' }}>
                    <div className="text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${accent}20` }}>
                        <Check size={28} style={{ color: accent }} />
                      </motion.div>
                      <div className="font-semibold">Задача завершена!</div>
                      {sendCheck && <div className={`text-sm ${sub} mt-1`}>Чек отправлен клиенту</div>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <h3 className="font-semibold mb-4">Завершить задачу</h3>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Фактическая сумма (₽)</label>
                  <input className={inputCls} type="number" min="0" value={finishAmount} onChange={e => { setFinishError(null); setFinishAmount(e.target.value); }} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Комментарий</label>
                  <input className={inputCls} placeholder="Добавьте комментарий..." value={finishNote} onChange={e => { setFinishError(null); setFinishNote(e.target.value); }} />
                </div>
                {finishError && <div className="text-xs text-red-500">{finishError}</div>}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setSendCheck(!sendCheck)} className="w-10 h-6 rounded-full relative transition-all"
                    style={{ background: sendCheck ? primary : isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${sendCheck ? 'left-5' : 'left-1'}`} />
                  </div>
                  <span className="text-sm">Отправить чек клиенту</span>
                </label>
              </div>
              <button onClick={() => { void handleFinish(); }} className="w-full py-3.5 rounded-2xl font-semibold text-white mb-2" style={{ background: primary }}>Подтвердить</button>
              <button onClick={() => { setShowFinishModal(false); setFinishError(null); }} className={`w-full py-2 text-sm ${sub}`}>Отмена</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {myNotifications.length === 0 ? (
                  <p className={`text-sm ${sub} text-center py-8`}>Нет уведомлений</p>
                ) : myNotifications.map(n => (
                  <div key={n.id} onClick={() => markNotificationRead(n.id)}
                    className={`${glass} rounded-xl p-3 cursor-pointer border-l-2`} style={{ borderLeftColor: n.read ? 'transparent' : primary }}>
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

      {/* Profile saved toast */}
      <AnimatePresence>
        {profileSaved && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-16 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${accent}40` }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}20` }}><Check size={14} style={{ color: accent }} /></div>
            <span className="text-sm font-medium">Профиль обновлён</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
