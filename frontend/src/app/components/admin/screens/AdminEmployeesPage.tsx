import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Save, Search, UserRound, Users, Wallet } from 'lucide-react';
import { useApp, type EmployeeSetting, type Worker } from '../../../context/AppContext';

/**
 * AdminEmployeesPage — «Сотрудники» для админа (ранее кнопка отсутствовала вовсе).
 * Показывает мастеров: %, оклад, сменную ставку, активность; сохранение через
 * saveAdminWorkerPayroll (backend: PUT /api/admin/workers/payroll, роль admin разрешена).
 * Найм/увольнение — только владелец, поэтому здесь только просмотр + условия оплаты.
 */

const EASE = [0.2, 0.8, 0.2, 1] as const;

function toEmployeeSetting(worker: Worker): EmployeeSetting {
  return {
    id: worker.id,
    role: worker.role === 'owner' ? 'worker' : worker.role === 'accountant' ? 'accountant' : 'worker',
    name: worker.name,
    percent: worker.defaultPercent,
    salaryBase: worker.salaryBase,
    salaryPerShift: worker.salaryPerShift ?? 0,
    active: worker.active,
    telegramChatId: worker.telegramChatId || '',
  };
}

export function AdminEmployeesPage({ onOpenPayroll }: { onOpenPayroll?: () => void }) {
  const { workers, saveAdminWorkerPayroll } = useApp();
  const sub = 'text-[var(--fg-secondary,#5A6072)]';

  const [masters, setMasters] = useState<EmployeeSetting[]>([]);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMasters(
      workers
        .filter((worker) => worker.role === 'worker' || worker.role === 'owner')
        .map(toEmployeeSetting),
    );
  }, [workers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return masters;
    return masters.filter((m) => m.name.toLowerCase().includes(q));
  }, [masters, query]);

  const activeCount = masters.filter((m) => m.active).length;

  const patchMaster = (id: string, patch: Partial<EmployeeSetting>) => {
    setMasters((current) => current.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      // '' → 0: backend ждёт float (ge=0), пустая строка даёт 422
      await saveAdminWorkerPayroll(
        masters.map((m) => ({ ...m, percent: m.percent === '' ? 0 : m.percent })),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить сотрудников');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--ring)] dark:bg-white/[.06]';

  return (
    <motion.div
      key="admin-employees"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="px-4 py-4"
    >
      {/* Заголовок */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Сотрудники</h2>
          <p className={`mt-0.5 text-xs ${sub}`}>
            {masters.length} мастеров · {activeCount} на смене
          </p>
        </div>
        <div className="grid size-11 place-items-center rounded-2xl" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
          <Users size={20} strokeWidth={1.75} style={{ color: 'var(--primary)' }} />
        </div>
      </div>

      {/* Поиск */}
      <div className="relative mb-4">
        <Search size={15} strokeWidth={1.75} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск мастера"
          className={`${inputCls} pl-9`}
        />
      </div>

      {/* Карточки мастеров */}
      <motion.div layout className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-[var(--card)] p-8 text-center">
            <UserRound size={32} strokeWidth={1.75} className={`mx-auto mb-2 ${sub}`} />
            <p className={`text-sm ${sub}`}>{masters.length === 0 ? 'Мастеров пока нет' : 'Ничего не найдено'}</p>
          </div>
        ) : (
          filtered.map((master, index) => {
            const live = workers.find((w) => w.id === master.id);
            const completed = live?.payrollSummary?.completedBookings ?? 0;
            const balance = live?.payrollSummary?.balance ?? 0;
            return (
              <motion.div
                key={master.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE, delay: Math.min(index * 0.04, 0.2) }}
                className="rounded-2xl border border-border bg-[var(--card)] p-4"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                    style={{ background: 'var(--primary)' }}
                  >
                    {master.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{master.name}</div>
                    <div className={`text-xs ${sub}`}>{completed} завершённых записей</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold tabular-nums" style={{ color: 'var(--status-success)' }}>
                      {balance.toLocaleString('ru')} ₽
                    </div>
                    <div className={`text-[11px] ${sub}`}>к выплате</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={`mb-1 block text-[11px] ${sub}`}>Процент</label>
                    <input
                      className={inputCls}
                      type="number"
                      step="0.00001"
                      min={0}
                      max={100}
                      value={master.percent === '' ? '' : master.percent}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') { patchMaster(master.id, { percent: '' }); return; }
                        const n = parseFloat(raw);
                        if (!Number.isNaN(n)) patchMaster(master.id, { percent: Math.min(100, Math.max(0, n)) });
                      }}
                      onBlur={() => patchMaster(master.id, { percent: master.percent === '' ? 0 : master.percent })}
                    />
                  </div>
                  <div>
                    <label className={`mb-1 block text-[11px] ${sub}`}>Оклад, ₽</label>
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      value={master.salaryBase}
                      onChange={(e) => patchMaster(master.id, { salaryBase: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </div>
                  <div>
                    <label className={`mb-1 block text-[11px] ${sub}`}>Смена, ₽</label>
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      value={master.salaryPerShift}
                      onChange={(e) => patchMaster(master.id, { salaryPerShift: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Активен в расписании</div>
                    <div className={`text-[11px] ${sub}`}>Отключенный мастер недоступен для назначения</div>
                  </div>
                  <button
                    role="switch"
                    aria-checked={master.active}
                    aria-label={`Активность: ${master.name}`}
                    onClick={() => patchMaster(master.id, { active: !master.active })}
                    className="relative h-6 w-11 shrink-0 rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    style={{ background: master.active ? 'var(--primary-600)' : 'var(--switch-background, #D4D4D8)' }}
                  >
                    <span className={`absolute top-1 size-4 rounded-full bg-white transition-all ${master.active ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {error && (
        <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--status-danger)_20%,transparent)] bg-[var(--status-danger-soft)] px-3 py-2 text-xs text-[var(--status-danger)]">
          {error}
        </div>
      )}

      {/* Операции по зарплате */}
      {onOpenPayroll && (
        <button
          onClick={onOpenPayroll}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-semibold"
          style={{ color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}
        >
          <Wallet size={16} strokeWidth={1.75} />
          Операции по зарплате (авансы, премии, выплаты)
        </button>
      )}

      {/* Сохранение */}
      <button
        onClick={() => { void handleSave(); }}
        disabled={saving || masters.length === 0}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white disabled:opacity-60"
        style={{ background: 'var(--primary-600)' }}
      >
        {saved ? <Check size={16} strokeWidth={2} /> : <Save size={16} strokeWidth={1.75} />}
        {saving ? 'Сохраняю…' : saved ? 'Сохранено!' : 'Сохранить сотрудников'}
      </button>
    </motion.div>
  );
}
