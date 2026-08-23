import { motion } from 'motion/react';
import { ArrowLeft, Bell, Save } from 'lucide-react';

/* Общая оболочка секции настроек: назад + заголовок */
function SectionShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  return (
    <motion.div key={title} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
      <button onClick={onBack} className={`mb-4 flex items-center gap-2 text-sm ${sub}`}>
        <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
        Назад
      </button>
      <h2 className="mb-4 font-semibold">{title}</h2>
      {subtitle && <p className={`-mt-2 mb-4 text-xs ${sub}`}>{subtitle}</p>}
      {children}
    </motion.div>
  );
}

/** Тумблер на токенах (role=switch) */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative h-6 w-11 shrink-0 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      style={{ background: checked ? 'var(--primary-600)' : 'var(--switch-background, #D4D4D8)' }}
    >
      <span className={`absolute top-1 size-4 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

export function SettingsSaveButton({
  saved,
  onClick,
  label = 'Сохранить',
  className = '',
}: {
  saved: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white ${className}`}
      style={{ background: 'var(--primary-600)' }}
    >
      <Save size={16} strokeWidth={1.75} aria-hidden />
      {saved ? 'Сохранено!' : label}
    </button>
  );
}

const glassCls = 'border border-border bg-[var(--card)]';
const subCls = 'text-[var(--fg-secondary,#5A6072)]';
const inputCls =
  'w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3 py-2.5 text-sm text-foreground outline-none focus:border-[var(--ring)] dark:bg-white/[.06]';

/* ── ATTENDANCE ── */
export function AttendanceSectionShell({
  onBack,
  table,
}: {
  onBack: () => void;
  table: React.ReactNode;
}) {
  return (
    <SectionShell title="Посещаемость мастеров" subtitle="Количество выходов каждого мастера на смену за выбранный период." onBack={onBack}>
      {table}
    </SectionShell>
  );
}

/* ── BOXES ── */
export function BoxesSection({
  boxes,
  onBoxPatch,
  onBack,
  onSave,
  saved,
}: {
  boxes: Array<{ id: string; name: string; active: boolean; pricePerHour: number }>;
  onBoxPatch: (id: string, patch: { active?: boolean; pricePerHour?: number }) => void;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <SectionShell title="Управление боксами" onBack={onBack}>
      {boxes.map((box) => (
        <div key={box.id} className={`${glassCls} mb-3 rounded-2xl p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-medium">{box.name}</div>
            <Toggle checked={box.active} onChange={() => onBoxPatch(box.id, { active: !box.active })} label={`Активен: ${box.name}`} />
          </div>
          <div>
            <label className={`mb-1 block text-xs ${subCls}`}>Цена (₽/час)</label>
            <input
              className={inputCls}
              type="number"
              value={box.pricePerHour}
              onChange={(e) => onBoxPatch(box.id, { pricePerHour: Number(e.target.value) })}
            />
          </div>
        </div>
      ))}
      <SettingsSaveButton saved={saved} onClick={onSave} />
    </SectionShell>
  );
}

/* ── SCHEDULE ── */
export function ScheduleSection({
  days,
  onDayPatch,
  onBack,
  onSave,
  saved,
}: {
  days: Array<{ day: string; open: string; close: string; active: boolean }>;
  onDayPatch: (index: number, patch: { active?: boolean; open?: string; close?: string }) => void;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <SectionShell title="Расписание работы" onBack={onBack}>
      {days.map((day, i) => (
        <div key={day.day} className={`${glassCls} mb-2 rounded-2xl p-4`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">{day.day}</span>
            <Toggle checked={day.active} onChange={() => onDayPatch(i, { active: !day.active })} label={`Работает: ${day.day}`} />
          </div>
          {day.active && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`mb-1 block text-xs ${subCls}`}>Открытие</label>
                <input className={inputCls} type="time" value={day.open} onChange={(e) => onDayPatch(i, { open: e.target.value })} />
              </div>
              <div>
                <label className={`mb-1 block text-xs ${subCls}`}>Закрытие</label>
                <input className={inputCls} type="time" value={day.close} onChange={(e) => onDayPatch(i, { close: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      ))}
      <SettingsSaveButton saved={saved} onClick={onSave} className="mt-2" />
    </SectionShell>
  );
}

/* ── NOTIFICATIONS ── */
const NOTIF_ITEMS = [
  { key: 'newBooking', label: 'Новая запись', desc: 'При создании новой записи' },
  { key: 'cancelled', label: 'Отмена записи', desc: 'При отмене клиентом' },
  { key: 'paymentDue', label: 'Ожидание оплаты', desc: 'Напоминание об оплате' },
  { key: 'workerAssigned', label: 'Назначение мастера', desc: 'После назначения мастера' },
  { key: 'reminders', label: 'Напоминания', desc: 'За 1 час до записи' },
];

export function NotificationsSection({
  prefs,
  onToggle,
  onBack,
  onSave,
  saved,
}: {
  prefs: Record<string, boolean>;
  onToggle: (key: string) => void;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <SectionShell title="Уведомления" onBack={onBack}>
      {NOTIF_ITEMS.map((item) => (
        <div key={item.key} className={`${glassCls} mb-2 flex items-center justify-between rounded-2xl p-4`}>
          <div className="flex items-center gap-3">
            <Bell size={16} strokeWidth={1.75} style={{ color: 'var(--primary-600)' }} aria-hidden />
            <div>
              <div className="text-sm font-medium">{item.label}</div>
              <div className={`text-xs ${subCls}`}>{item.desc}</div>
            </div>
          </div>
          <Toggle
            checked={Boolean(prefs[item.key])}
            onChange={() => onToggle(item.key)}
            label={item.label}
          />
        </div>
      ))}
      <SettingsSaveButton saved={saved} onClick={onSave} className="mt-2" />
    </SectionShell>
  );
}

/* ── PROFILE ── */
export function ProfileSection({
  profile,
  onFieldChange,
  telegramLinkCode,
  onGenerateCode,
  onBack,
  onSave,
  saved,
}: {
  profile: { name: string; email: string; phone: string; telegramChatId: string };
  onFieldChange: (patch: Partial<{ name: string; email: string; phone: string; telegramChatId: string }>) => void;
  telegramLinkCode: { code: string; expiresAt: Date } | null;
  onGenerateCode: () => void;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <SectionShell title="Профиль" onBack={onBack}>
      <div className="mb-6 flex flex-col items-center">
        <div
          className="mb-2 flex size-20 items-center justify-center rounded-full text-3xl font-bold text-white"
          style={{ background: 'var(--primary-600)' }}
        >
          {(profile.name || 'A').charAt(0).toUpperCase()}
        </div>
        <div className={`text-xs ${subCls}`}>Аватар формируется из имени профиля</div>
      </div>
      <div className="space-y-3">
        <div>
          <label className={`mb-1 block text-xs ${subCls}`}>Имя</label>
          <input className={inputCls} value={profile.name} onChange={(e) => onFieldChange({ name: e.target.value })} />
        </div>
        <div>
          <label className={`mb-1 block text-xs ${subCls}`}>Email</label>
          <input className={inputCls} type="email" value={profile.email} onChange={(e) => onFieldChange({ email: e.target.value })} />
        </div>
        <div>
          <label className={`mb-1 block text-xs ${subCls}`}>Телефон</label>
          <input className={inputCls} value={profile.phone} onChange={(e) => onFieldChange({ phone: e.target.value })} />
        </div>
        <div>
          <label className={`mb-1 block text-xs ${subCls}`}>Telegram chat id</label>
          <input className={inputCls} value={profile.telegramChatId} onChange={(e) => onFieldChange({ telegramChatId: e.target.value })} />
        </div>
        <div className={`${glassCls} rounded-2xl p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Автопривязка Telegram</div>
              <div className={`text-xs ${subCls}`}>
                {profile.telegramChatId ? 'Telegram уже привязан' : 'Сгенерируйте код и отправьте боту /link CODE'}
              </div>
            </div>
            <button
              onClick={onGenerateCode}
              className="rounded-xl px-3 py-2 text-sm text-white"
              style={{ background: 'var(--primary-600)' }}
            >
              Получить код
            </button>
          </div>
          {telegramLinkCode && (
            <div className="mt-3">
              <div className="text-2xl font-bold tabular-nums tracking-[0.3em]">{telegramLinkCode.code}</div>
              <div className={`mt-1 text-xs ${subCls}`}>
                До {telegramLinkCode.expiresAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} отправьте боту `/link {telegramLinkCode.code}`
              </div>
            </div>
          )}
        </div>
      </div>
      <SettingsSaveButton saved={saved} onClick={onSave} label="Сохранить изменения" className="mt-4" />
    </SectionShell>
  );
}
