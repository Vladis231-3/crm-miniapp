import { motion } from 'motion/react';
import { ArrowLeft, Bell, Eye, EyeOff, Save, Shield, Trash2 } from 'lucide-react';

/* ── Мелкие хелперы (копия из AdminApp для самодостаточности секций) ── */
const SERVICE_TYPE_OPTIONS = [
  { value: 'Мойка', label: 'Мойка', resourceGroup: 'wash' },
  { value: 'Детейлинг', label: 'Детейлинг', resourceGroup: 'detailing' },
  { value: 'Аренда бокса', label: 'Аренда бокса', resourceGroup: 'wash' },
] as const;

function adminServiceResourceGroupForCategory(category: string) {
  return SERVICE_TYPE_OPTIONS.find((option) => option.value === category)?.resourceGroup || 'wash';
}

function numberInputValue(value: number) {
  return value === 0 ? '' : String(value);
}

function numberFromInput(value: string) {
  return value === '' ? 0 : Number(value);
}

function formatFixedMasterAmount(): string {
  return String(FIXED_MASTER_EARNED);
}

import { FIXED_MASTER_EARNED } from '../../ui/utils';

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

/* ── PRICING ── */
export function PricingSection({
  services,
  searchQuery,
  onSearchChange,
  onServicePatch,
  onRemoveService,
  onBack,
  onSave,
  saved,
}: {
  services: Array<{ id: string; name: string; category: string; desc?: string; price: number; duration: number; materialConsumption?: number | null; isFixedMaster?: boolean }>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onServicePatch: (index: number, patch: Record<string, unknown>) => void;
  onRemoveService: (id: string) => void;
  onBack: () => void;
  onSave: () => void;
  saved: boolean;
}) {
  const q = searchQuery.trim().toLowerCase();
  const matches = (svc: { name: string; category: string; desc?: string }) =>
    !q || [svc.name, svc.category, svc.desc || ''].some((v) => v.toLowerCase().includes(q));

  return (
    <SectionShell title="Цены на услуги" subtitle="Изменения отображаются у клиентов после сохранения" onBack={onBack}>
      <div className="relative mb-3">
        <input
          className={`${inputCls} w-full`}
          placeholder="Поиск услуги..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {services.map((svc, i) => {
        if (!matches(svc)) return null;
        return (
          <div key={svc.id} className={`${glassCls} mb-3 rounded-2xl p-4`}>
            <div className="-mr-1 -mt-1 mb-1 flex justify-end">
              <button onClick={() => onRemoveService(svc.id)} className="rounded-xl p-1.5 text-[var(--status-danger)] transition-colors hover:bg-[var(--status-danger-soft)]" aria-label={`Удалить ${svc.name}`}>
                <Trash2 size={15} strokeWidth={1.75} />
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <label className={`mb-1 block text-xs ${subCls}`}>Название</label>
                <input className={inputCls} value={svc.name} onChange={(e) => onServicePatch(i, { name: e.target.value })} />
              </div>
              <div>
                <label className={`mb-1 block text-xs ${subCls}`}>Тип услуги</label>
                <select
                  className={inputCls}
                  value={svc.category}
                  onChange={(e) => onServicePatch(i, { category: e.target.value, resourceGroup: adminServiceResourceGroupForCategory(e.target.value) })}
                >
                  {SERVICE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`mb-1 block text-xs ${subCls}`}>Цена (₽)</label>
                  <input className={inputCls} type="number" value={numberInputValue(svc.price)} onChange={(e) => onServicePatch(i, { price: numberFromInput(e.target.value) })} />
                </div>
                <div>
                  <label className={`mb-1 block text-xs ${subCls}`}>Длит. (мин)</label>
                  <input className={inputCls} type="number" value={numberInputValue(svc.duration)} onChange={(e) => onServicePatch(i, { duration: numberFromInput(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className={`mb-1 block text-xs ${subCls}`}>Расход материала (₽)</label>
                <input
                  className={inputCls}
                  type="number"
                  placeholder="0"
                  value={numberInputValue(svc.materialConsumption ?? 0)}
                  onChange={(e) => onServicePatch(i, { materialConsumption: e.target.value ? numberFromInput(e.target.value) : null })}
                />
              </div>
              <label className={`${glassCls} mt-2 flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-sm`}>
                <span>Фикс оплата мастеру ({formatFixedMasterAmount()})</span>
                <input
                  type="checkbox"
                  checked={Boolean(svc.isFixedMaster)}
                  onChange={(event) => onServicePatch(i, { isFixedMaster: event.target.checked })}
                />
              </label>
            </div>
          </div>
        );
      })}
      {searchQuery.trim() && services.filter((svc) => matches(svc)).length === 0 && (
        <div className={`${glassCls} mb-3 rounded-2xl p-4 text-sm ${subCls}`}>По запросу «{searchQuery.trim()}» услуг не найдено</div>
      )}
      <SettingsSaveButton saved={saved} onClick={onSave} label="Сохранить цены" />
    </SectionShell>
  );
}

/* ── SECURITY ── */
export function SecuritySection({
  password,
  onPasswordChange,
  showPass,
  onToggleShowPass,
  error,
  saved,
  activeSessions,
  onRevokeSession,
  onBack,
  onSave,
}: {
  password: { current: string; new_: string; confirm: string };
  onPasswordChange: (key: 'current' | 'new_' | 'confirm', value: string) => void;
  showPass: boolean;
  onToggleShowPass: () => void;
  error: string | null;
  saved: boolean;
  activeSessions: Array<{ id: string; device: string; current?: boolean; ipAddress: string; lastSeenAt: Date }>;
  onRevokeSession: (id: string) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  return (
    <SectionShell title="Безопасность" onBack={onBack}>
      <div className={`${glassCls} mb-3 rounded-2xl p-4`}>
        <div className={`mb-3 text-xs font-medium ${subCls}`}>СМЕНА ПАРОЛЯ</div>
        <div className="space-y-3">
          {[
            { key: 'current', label: 'Текущий пароль', placeholder: '••••••••' },
            { key: 'new_', label: 'Новый пароль', placeholder: '8+ символов' },
            { key: 'confirm', label: 'Повторите пароль', placeholder: '••••••••' },
          ].map((field) => (
            <div key={field.key}>
              <label className={`mb-1 block text-xs ${subCls}`}>{field.label}</label>
              <div className="relative">
                <input
                  className={inputCls}
                  type={showPass ? 'text' : 'password'}
                  placeholder={field.placeholder}
                  value={password[field.key as keyof typeof password]}
                  onChange={(e) => onPasswordChange(field.key as 'current' | 'new_' | 'confirm', e.target.value)}
                />
                <button type="button" onClick={onToggleShowPass} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPass ? <EyeOff size={14} strokeWidth={1.75} className={subCls} /> : <Eye size={14} strokeWidth={1.75} className={subCls} />}
                </button>
              </div>
            </div>
          ))}
        </div>
        {error && <div className="mt-3 text-xs text-[var(--status-danger)]">{error}</div>}
        {saved && <div className="mt-3 text-xs text-[var(--status-success)]">Пароль обновлён</div>}
      </div>

      <div className={`${glassCls} mb-4 rounded-2xl p-4`}>
        <div className={`mb-2 text-xs ${subCls}`}>АКТИВНЫЕ СЕССИИ</div>
        {activeSessions.length === 0 ? (
          <div className={`text-xs ${subCls}`}>Нет активных сессий</div>
        ) : (
          activeSessions.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
              style={{ borderColor: 'rgba(128,128,128,0.15)' }}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {item.device}{item.current ? ' · Текущая' : ''}
                </div>
                <div className={`text-xs ${subCls}`}>
                  {item.ipAddress} · {item.lastSeenAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button onClick={() => onRevokeSession(item.id)} className="shrink-0 text-xs text-[var(--status-danger)]">
                Завершить
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onSave}
        disabled={!password.current || !password.new_ || password.new_ !== password.confirm}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white disabled:opacity-50"
        style={{ background: 'var(--status-danger)' }}
      >
        <Shield size={16} strokeWidth={1.75} aria-hidden />
        {saved ? 'Пароль изменён!' : 'Изменить пароль'}
      </button>
    </SectionShell>
  );
}

/* ── CONTENT ── */
export function ContentSectionShell({
  onBack,
  children,
}: {
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <SectionShell title="Контент сайта" onBack={onBack}>
      {children}
    </SectionShell>
  );
}
