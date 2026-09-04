import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Award, Bell, Camera, Check, ChevronRight, Edit3, Eye, EyeOff,
  History, Mail, MapPin, Phone, Save, Shield, Star, TrendingUp, User,
} from 'lucide-react';
import { useApp, getWorkerNotificationSettings } from '../../../context/AppContext';
import {
  COMPLAINT_THRESHOLD,
  isComplaintActive,
  getComplaintPenaltyState,
} from '../../../utils/complaints';
import { isFixedMasterService, FIXED_MASTER_EARNED } from '../../ui/utils';
import { AttendanceTable } from '../../shared/AttendanceTable';

export type WorkerProfileSection =
  | null
  | 'personal'
  | 'notifications'
  | 'history'
  | 'security'
  | 'shift'
  | 'attendance';

export interface WorkerProfileScreenProps {
  section: WorkerProfileSection;
  onSectionChange: (section: WorkerProfileSection) => void;
  workerId: string;
  onOpenTaskDetails: (payload: any) => void;
}

/**
 * WorkerProfileScreen — вырезка из WorkerApp (§6.3, Фаза 3).
 * Меню + 6 секций. Состояния профиля/безопасности/чек-листа — внутри;
 * section живёт у родителя (заголовок хедера и back-button).
 */
export function WorkerProfileScreen({
  section,
  onSectionChange,
  workerId,
  onOpenTaskDetails,
}: WorkerProfileScreenProps) {
  const {
    staffProfile,
    settings,
    penalties,
    stockItems,
    services,
    bookings,
    session,
    isDark,
    saveWorkerProfile,
    saveWorkerNotificationSettings,
    createTelegramLinkCode,
    listShiftChecklists,
    submitShiftChecklist,
    changePassword,
  } = useApp();

  // ── Profile state (перенесено из WorkerApp) ──
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
  const [profileSaved, setProfileSaved] = useState(false);
  const [telegramLinkCode, setTelegramLinkCode] = useState<{ code: string; expiresAt: Date } | null>(null);
  const [shiftChecklists, setShiftChecklists] = useState<any[]>([]);
  const [shiftChecklistDraft, setShiftChecklistDraft] = useState<Record<string, string>>({});
  const [shiftChecklistNote, setShiftChecklistNote] = useState('');
  const [submittingShiftPhase, setSubmittingShiftPhase] = useState<'start' | 'end' | null>(null);
  const [notifPrefs, setNotifPrefs] = useState(getWorkerNotificationSettings(settings, workerId));
  const [showPass, setShowPass] = useState(false);
  const [password, setPassword] = useState({ current: '', new_: '', confirm: '' });
  const [passSaved, setPassSaved] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

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
    if (section === 'shift') void listShiftChecklists().then(setShiftChecklists);
  }, [section]);

  // ── Derived (формулы 1-в-1 из родителя) ──
  const isMyTask = (b: any) =>
    b.workers.some((w: any) => w.workerId === workerId) ||
    (b.additionalServices || []).some((as: any) => as.workers.some((w: any) => w.workerId === workerId));

  const allMyTasks = (bookings || []).filter(isMyTask);
  const myEarnings = (bookings || [])
    .filter((b) => b.status === 'completed' && isMyTask(b))
    .map((b) => {
      const w = b.workers.find((wk: any) => wk.workerId === workerId);
      const earned =
        w?.payType === 'fixed'
          ? w.fixedAmount || 0
          : isFixedMasterService(services, b.serviceId, b.service)
            ? FIXED_MASTER_EARNED
            : Math.round(b.price * (w?.percent || 0) / 100);
      return { ...b, earned };
    });
  const totalEarned = myEarnings.reduce((s, b) => s + b.earned, 0);
  const payrollSummary = staffProfile?.payrollSummary;
  const earnedForDisplay = payrollSummary?.accruedFromBookings ?? totalEarned;
  const completedCount = payrollSummary?.completedBookings ?? allMyTasks.filter((b) => b.status === 'completed').length;
  const myPenalties = (penalties || []).filter((penalty) => penalty.workerId === workerId && isComplaintActive(penalty));
  const complaintState = getComplaintPenaltyState(staffProfile?.defaultPercent || 0, myPenalties);
  const chemistryItems = (stockItems || []).filter((item) => item.category === 'Химия');

  // ── Handlers (перенесены 1-в-1) ──
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

  // ── Токенные стили вместо легаси-квартета ──
  const glass = 'border border-border bg-[var(--card)]';
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  const inputCls =
    'w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3 py-2.5 text-sm text-foreground placeholder:text-[var(--fg-muted,#8A91A0)] outline-none focus:border-[var(--ring)] dark:bg-white/[.06]';
  const primaryColor = 'var(--primary-600)';
  const accentColor = 'var(--status-success)';

  const fmtDateTime = (value: Date) =>
    value.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  /* ── PROFILE MAIN ── */
  if (!section) {
    return (
      <motion.div key="profile-main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
        <div className={`${glass} mb-4 rounded-2xl p-5`}>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative">
              <div
                className="flex size-[72px] items-center justify-center rounded-full text-2xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-900))' }}
              >
                {profile.name.charAt(0)}
              </div>
              <button
                aria-label="Сменить фото"
                className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full text-white"
                style={{ background: primaryColor }}
              >
                <Camera size={12} strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold">{profile.name}</div>
              <div className={`text-sm ${sub}`}>Мастер · {profile.experience}</div>
              <div className="mt-0.5 text-xs" style={{ color: accentColor }}>
                База {profile.percent}% · сейчас {complaintState.effectivePercent}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Задач', value: String(allMyTasks.length) },
              { label: 'Выполнено', value: String(completedCount) },
              { label: 'Заработано', value: `${(earnedForDisplay / 1000).toFixed(1)}к` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-[var(--sunken,#EEEFF3)] p-2.5 text-center dark:bg-white/5">
                <div className="text-sm font-bold" style={{ color: primaryColor }}>{s.value}</div>
                <div className={`text-xs ${sub}`}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${glass} mb-3 rounded-2xl p-4`}>
          <div className={`mb-1 text-xs font-medium ${sub}`}>СПЕЦИАЛИЗАЦИЯ</div>
          <div className="text-sm">{profile.specialty}</div>
          {profile.about && <div className={`mt-1 text-xs ${sub}`}>{profile.about}</div>}
        </div>

        <div className={`${glass} mb-3 rounded-2xl p-4`}>
          <div className={`mb-3 text-xs font-medium ${sub}`}>МОИ ВЫХОДЫ НА СМЕНУ</div>
          <AttendanceTable mode="worker" workerId={session?.actorId} primary={primaryColor} />
        </div>

        <div className="space-y-2">
          {[
            { id: 'personal', icon: Edit3, label: 'Личные данные', desc: profile.phone, color: 'var(--primary-600)', bg: 'var(--primary-50)' },
            { id: 'shift', icon: Check, label: 'Чек-лист смены', desc: 'Химия на начало и конец', color: 'var(--status-success)', bg: 'var(--status-success-soft)' },
            { id: 'attendance', icon: TrendingUp, label: 'Мои выходы', desc: 'Посещаемость за период', color: '#8B5CF6', bg: 'rgba(139,92,246,.15)' },
            { id: 'notifications', icon: Bell, label: 'Уведомления', desc: 'Управление оповещениями', color: 'var(--primary-800)', bg: 'var(--primary-50)' },
            { id: 'history', icon: History, label: 'История задач', desc: `${allMyTasks.length} всего`, color: 'var(--status-warning)', bg: 'var(--status-warning-soft)' },
            { id: 'security', icon: Shield, label: 'Безопасность', desc: 'Пароль и сессии', color: 'var(--status-danger)', bg: 'var(--status-danger-soft)' },
          ].map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSectionChange(item.id as WorkerProfileSection)}
              className={`${glass} flex w-full items-center gap-3 rounded-2xl p-4 text-left`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ background: item.bg }}>
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
    );
  }

  /* ── PERSONAL ── */
  if (section === 'personal') {
    return (
      <motion.div key="profile-personal" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="px-4 py-4">
        <button onClick={() => onSectionChange(null)} className={`mb-4 flex items-center gap-2 text-sm ${sub}`}>
          <ArrowLeft size={16} strokeWidth={1.75} />Назад
        </button>
        <div className="mb-4 space-y-3">
          {[
            { key: 'name', label: 'Имя', placeholder: 'Имя Фамилия', icon: User },
            { key: 'phone', label: 'Телефон', placeholder: '+7 (___) ___-__-__', icon: Phone },
            { key: 'email', label: 'Email', placeholder: 'email@domain.ru', icon: Mail },
            { key: 'city', label: 'Город', placeholder: 'Москва', icon: MapPin },
            { key: 'experience', label: 'Опыт', placeholder: '5 лет', icon: Award },
            { key: 'specialty', label: 'Специализация', placeholder: 'Детейлинг, полировка', icon: Star },
          ].map((f) => (
            <div key={f.key}>
              <label className={`mb-1 block text-xs ${sub}`}>{f.label}</label>
              <div className="relative">
                <f.icon size={14} strokeWidth={1.75} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} aria-hidden />
                <input
                  className={`${inputCls} pl-9`}
                  placeholder={f.placeholder}
                  value={(profile as any)[f.key]}
                  onChange={(e) => setProfile((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            </div>
          ))}
          <div>
            <label className={`mb-1 block text-xs ${sub}`}>О себе</label>
            <textarea
              className={`${inputCls} h-20 resize-none`}
              placeholder="Расскажите о себе..."
              value={profile.about}
              onChange={(e) => setProfile((p) => ({ ...p, about: e.target.value }))}
            />
          </div>
          <div className={`${glass} rounded-2xl p-4`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Привязка Telegram</div>
                <div className={`text-xs ${sub}`}>
                  {staffProfile?.telegramChatId ? 'Telegram уже привязан' : 'Получите код и отправьте его боту командой /link'}
                </div>
              </div>
              <button
                onClick={handleGenerateTelegramCode}
                className="rounded-xl px-3 py-2 text-sm text-white"
                style={{ background: primaryColor }}
              >
                Код
              </button>
            </div>
            {telegramLinkCode && (
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-[0.3em] tabular-nums">{telegramLinkCode.code}</div>
                <div className={`mt-1 text-xs ${sub}`}>
                  До {telegramLinkCode.expiresAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} отправьте боту `/link {telegramLinkCode.code}`
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleSaveProfile}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white"
          style={{ background: primaryColor }}
        >
          <Save size={16} strokeWidth={1.75} />
          {profileSaved ? 'Сохранено!' : 'Сохранить'}
        </button>
      </motion.div>
    );
  }

  /* ── SHIFT CHECKLIST ── */
  if (section === 'shift') {
    return (
      <motion.div key="profile-shift" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="px-4 py-4">
        <button onClick={() => onSectionChange(null)} className={`mb-4 flex items-center gap-2 text-sm ${sub}`}>
          <ArrowLeft size={16} strokeWidth={1.75} />Назад
        </button>
        <div className={`${glass} mb-4 rounded-2xl p-4`}>
          <div className="mb-2 font-semibold">Химия на смену</div>
          <div className={`mb-3 text-xs ${sub}`}>Заполните остатки по химии при начале и закрытии смены</div>
          <div className="mb-3 space-y-2">
            {chemistryItems.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-2">
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
            className={`${inputCls} mb-3 h-20 resize-none`}
            placeholder="Примечание по смене"
            value={shiftChecklistNote}
            onChange={(event) => setShiftChecklistNote(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { void handleSubmitShiftChecklist('start'); }}
              disabled={submittingShiftPhase !== null}
              className="rounded-2xl py-3 font-semibold text-white disabled:opacity-60"
              style={{ background: primaryColor }}
            >
              {submittingShiftPhase === 'start' ? 'Сохраняю...' : 'Принять смену'}
            </button>
            <button
              onClick={() => { void handleSubmitShiftChecklist('end'); }}
              disabled={submittingShiftPhase !== null}
              className="rounded-2xl py-3 font-semibold text-white disabled:opacity-60"
              style={{ background: accentColor }}
            >
              {submittingShiftPhase === 'end' ? 'Сохраняю...' : 'Закрыть смену'}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {shiftChecklists.map((entry) => (
            <div key={entry.id} className={`${glass} rounded-2xl p-4`}>
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium">{entry.phase === 'start' ? 'Принятие смены' : 'Закрытие смены'}</div>
                <div className={`text-xs ${sub}`}>{entry.createdAt.toLocaleString('ru-RU')}</div>
              </div>
              {entry.items.slice(0, 4).map((item: any) => (
                <div key={item.stockItemId} className="flex justify-between py-1 text-sm">
                  <span>{item.name}</span>
                  <span>{item.actualQty} {item.unit}</span>
                </div>
              ))}
              {entry.note && <div className={`mt-2 text-xs ${sub}`}>{entry.note}</div>}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  /* ── NOTIFICATIONS ── */
  if (section === 'notifications') {
    return (
      <motion.div key="profile-notif" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="px-4 py-4">
        <button onClick={() => onSectionChange(null)} className={`mb-4 flex items-center gap-2 text-sm ${sub}`}>
          <ArrowLeft size={16} strokeWidth={1.75} />Назад
        </button>
        {[
          { key: 'newTask', label: 'Новые задачи', desc: 'При назначении задачи' },
          { key: 'taskUpdate', label: 'Обновления задач', desc: 'Изменение статуса' },
          { key: 'payment', label: 'Начисление оплаты', desc: 'После завершения задачи' },
          { key: 'reminders', label: 'Напоминания', desc: 'За 30 мин до задачи' },
          { key: 'sms', label: 'SMS уведомления', desc: 'На номер телефона' },
        ].map((item) => {
          const enabled = Boolean(notifPrefs[item.key as keyof typeof notifPrefs]);
          return (
            <div key={item.key} className={`${glass} mb-2 flex items-center justify-between rounded-xl p-4`}>
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className={`text-xs ${sub}`}>{item.desc}</div>
              </div>
              <button
                role="switch"
                aria-checked={enabled}
                aria-label={item.label}
                onClick={() => setNotifPrefs((p: any) => ({ ...p, [item.key]: !p[item.key] }))}
                className="relative h-6 w-11 shrink-0 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                style={{ background: enabled ? primaryColor : 'var(--switch-background, #D4D4D8)' }}
              >
                <span className={`absolute top-1 size-4 rounded-full bg-white transition-all ${enabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          );
        })}
        <button
          onClick={handleSaveNotifications}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white"
          style={{ background: primaryColor }}
        >
          <Save size={16} strokeWidth={1.75} />
          {profileSaved ? 'Сохранено!' : 'Сохранить'}
        </button>
      </motion.div>
    );
  }

  /* ── HISTORY ── */
  if (section === 'history') {
    return (
      <motion.div key="profile-history" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="px-4 py-4">
        <button onClick={() => onSectionChange(null)} className={`mb-4 flex items-center gap-2 text-sm ${sub}`}>
          <ArrowLeft size={16} strokeWidth={1.75} />Назад
        </button>
        {allMyTasks.length === 0 ? (
          <div className={`${glass} rounded-2xl p-8 text-center`}>
            <History size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} aria-hidden />
            <p className={sub}>Задач пока нет</p>
          </div>
        ) : (
          allMyTasks.map((task) => {
            const w = task.workers.find((wk: any) => wk.workerId === workerId);
            const earned =
              task.status === 'completed'
                ? w?.payType === 'fixed'
                  ? w.fixedAmount || 0
                  : isFixedMasterService(services, task.serviceId, task.service)
                    ? FIXED_MASTER_EARNED
                    : Math.round(task.price * (w?.percent || 0) / 100)
                : 0;
            const paymentLabel =
              task.paymentType === 'cash' ? 'Наличные' : task.paymentType === 'transfer' ? 'Перевод' : task.paymentType === 'invoice' ? 'По счёту' : '';
            return (
              <div
                key={task.id}
                className={`${glass} mb-2 cursor-pointer rounded-xl p-3`}
                onClick={() =>
                  onOpenTaskDetails({
                    service: task.service, car: task.car, plate: task.plate, date: task.date, time: task.time,
                    box: task.box, price: task.price, paymentType: task.paymentType, paymentSettled: task.paymentSettled,
                    earned, percent: w?.percent, payType: w?.payType, fixedAmount: w?.fixedAmount, notes: task.notes,
                  })
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{task.service}</div>
                    {task.car && <div className={`text-xs ${sub}`}>{task.car}{task.plate ? ` (${task.plate})` : ''}</div>}
                    <div className={`text-xs ${sub}`}>{task.date} · {task.box} · {task.duration} мин</div>
                    <div className={`text-xs ${sub}`}>
                      <span className="tabular-nums">{task.price.toLocaleString('ru')} ₽</span> · {paymentLabel}
                      {task.paymentSettled ? '' : ' (не оплачено)'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {task.status === 'completed' ? (
                      <span className="rounded-full bg-[var(--status-success-soft)] px-2 py-0.5 text-xs text-[var(--status-success)]">
                        Выполнено
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--fg-secondary,#5A6072)]">
                        {task.status === 'in_progress' ? 'В работе' : 'Активна'}
                      </span>
                    )}
                    {earned > 0 && (
                      <div className="mt-1 text-xs font-semibold" style={{ color: accentColor }}>
                        +{earned.toLocaleString('ru')} ₽
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </motion.div>
    );
  }

  /* ── SECURITY ── */
  if (section === 'security') {
    return (
      <motion.div key="profile-security" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="px-4 py-4">
        <button onClick={() => onSectionChange(null)} className={`mb-4 flex items-center gap-2 text-sm ${sub}`}>
          <ArrowLeft size={16} strokeWidth={1.75} />Назад
        </button>
        <div className={`${glass} mb-3 rounded-2xl p-4`}>
          <div className={`mb-3 text-xs font-medium ${sub}`}>СМЕНА ПАРОЛЯ</div>
          {[
            { key: 'current', label: 'Текущий пароль' },
            { key: 'new_', label: 'Новый пароль' },
            { key: 'confirm', label: 'Повторите' },
          ].map((f) => (
            <div key={f.key} className="mb-3">
              <label className={`mb-1 block text-xs ${sub}`}>{f.label}</label>
              <div className="relative">
                <input
                  className={inputCls}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password[f.key as keyof typeof password]}
                  onChange={(e) => {
                    setPassError(null);
                    setPassSaved(false);
                    setPassword((p) => ({ ...p, [f.key]: e.target.value }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPass ? <EyeOff size={14} strokeWidth={1.75} className={sub} /> : <Eye size={14} strokeWidth={1.75} className={sub} />}
                </button>
              </div>
            </div>
          ))}
          {passError && <div className="text-xs text-[var(--status-danger)]">{passError}</div>}
          {passSaved && <div className="text-xs text-[var(--status-success)]">Пароль обновлён</div>}
        </div>
        {/* SESS-001: карточка сессий удалена — API заглушка, revoke нет */}
        <button
          onClick={handleSavePass}
          disabled={!password.current || !password.new_ || password.new_ !== password.confirm}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--status-danger)' }}
        >
          <Shield size={16} strokeWidth={1.75} />
          {passSaved ? 'Изменён!' : 'Изменить пароль'}
        </button>
      </motion.div>
    );
  }

  /* ── ATTENDANCE ── */
  return (
    <motion.div key="profile-attendance" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="px-4 py-4">
      <button onClick={() => onSectionChange(null)} className={`mb-4 flex items-center gap-2 text-sm ${sub}`}>
        <ArrowLeft size={16} strokeWidth={1.75} />Назад
      </button>
      <h2 className="mb-2 font-semibold">Мои выходы на смену</h2>
      <p className={`mb-4 text-xs ${sub}`}>Количество выходов за выбранный период.</p>
      <AttendanceTable mode="worker" workerId={session?.actorId} primary={primaryColor} />
    </motion.div>
  );
}
