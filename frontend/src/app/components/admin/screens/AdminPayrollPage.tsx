import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Save } from 'lucide-react';
import { useApp, type Worker } from '../../../context/AppContext';
import { apiRequest } from '../../../api';

type PayrollEntryKind = 'advance' | 'deduction' | 'bonus' | 'payout' | 'adjustment';

const PAYROLL_KIND_LABELS: Record<PayrollEntryKind, string> = {
  advance: 'Аванс',
  deduction: 'Списание',
  bonus: 'Премия',
  payout: 'Выплата',
  adjustment: 'Корректировка',
};

interface EmployeeSetting {
  id: string;
  role: string;
  name: string;
  percent: number | '';
  salaryBase: number;
  active: boolean;
  telegramChatId?: string | null;
}

/**
 * AdminPayrollPage — «Зарплаты» как полноценная страница (§6.2).
 * Устраняет навигационный хак settings→payroll (аудит §2.4, AdminApp:3016–3021).
 * Периоды/данные/операции — self-contained; сохранение процентов/окладов через
 * saveAdminWorkerPayroll, операции через createPayrollEntry (guard ≥1000₽ сохранён).
 */
export function AdminPayrollPage() {
  const { workers, saveAdminWorkerPayroll, createPayrollEntry } = useApp();

  const [payrollPeriod, setPayrollPeriod] = useState<'day' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [payrollDateFrom, setPayrollDateFrom] = useState('');
  const [payrollDateTo, setPayrollDateTo] = useState('');
  const [payrollData, setPayrollData] = useState<Worker[] | null>(null);
  const [payrollSettings, setPayrollSettings] = useState<EmployeeSetting[]>([]);
  const [payrollDrafts, setPayrollDrafts] = useState<Record<string, { kind: PayrollEntryKind; amount: string; note: string }>>({});
  const [payrollEntryLoading, setPayrollEntryLoading] = useState<string | null>(null);
  const [payrollError, setPayrollError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPayrollSettings(
      workers
        .filter((worker) => worker.role === 'worker' || worker.role === 'owner')
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
          .filter((worker) => worker.role === 'worker' || worker.role === 'owner')
          .map((worker) => [worker.id, current[worker.id] || { kind: 'advance' as PayrollEntryKind, amount: '', note: '' }]),
      ),
    );
  }, [workers]);

  const loadPayrollData = useCallback(() => {
    if (payrollPeriod === 'custom' && (!payrollDateFrom || !payrollDateTo)) {
      setPayrollData(null);
      return;
    }
    const params = new URLSearchParams({ period: payrollPeriod });
    if (payrollPeriod === 'custom') {
      params.set('date_from', payrollDateFrom);
      params.set('date_to', payrollDateTo);
    }
    apiRequest<Worker[]>(`/api/admin/workers/payroll?${params.toString()}`)
      .then(setPayrollData)
      .catch(() => setPayrollData(null));
  }, [payrollPeriod, payrollDateFrom, payrollDateTo]);

  useEffect(() => {
    loadPayrollData();
  }, [loadPayrollData]);

  useEffect(() => {
    setPayrollError(null);
  }, [payrollPeriod]);

  const handleSaveSettings = async () => {
    await saveAdminWorkerPayroll(payrollSettings);
    loadPayrollData();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCreatePayrollEntry = async (entryWorkerId: string, workerName: string) => {
    const draft = payrollDrafts[entryWorkerId];
    const amount = Number(draft?.amount || 0);
    if (!draft) return;
    if (!Number.isFinite(amount) || amount === 0) return;
    const liveWorker = workers.find((item) => item.id === entryWorkerId);
    const accruedFromBookings = liveWorker?.payrollSummary?.accruedFromBookings || 0;
    if (draft.kind === 'advance' && accruedFromBookings < 1000) {
      setPayrollError(`Админ не может выдать аванс ${workerName}, пока он не заработал минимум 1000 ₽`);
      return;
    }

    try {
      setPayrollError(null);
      setPayrollEntryLoading(entryWorkerId);
      await createPayrollEntry({
        workerId: entryWorkerId,
        kind: draft.kind,
        amount: Math.round(amount),
        note: draft.note.trim(),
        period: payrollPeriod,
        ...(payrollPeriod === 'custom' ? { dateFrom: payrollDateFrom, dateTo: payrollDateTo } : {}),
      });
      loadPayrollData();
      setPayrollDrafts((current) => ({
        ...current,
        [entryWorkerId]: { kind: draft.kind, amount: '', note: '' },
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setPayrollError(error instanceof Error ? error.message : 'Не удалось сохранить операцию по зарплате');
    } finally {
      setPayrollEntryLoading(null);
    }
  };

  // ── Токенные стили ──
  const glass = 'border border-border bg-[var(--card)]';
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  const inputCls =
    'w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3 py-2.5 text-sm text-foreground outline-none focus:border-[var(--ring)] dark:bg-white/[.06]';
  const selectCls = inputCls;

  return (
    <motion.div key="admin-payroll" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      <h2 className="mb-1 font-semibold">Контроль зарплат мастеров</h2>
      <p className={`mb-3 text-xs ${sub}`}>
        Процент, оклад, активность и операции по зарплате с примечанием
      </p>

      <div className="mb-2 flex gap-1.5">
        {(['day', 'week', 'month', 'all', 'custom'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPayrollPeriod(p)}
            className={`flex-1 rounded-xl py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              payrollPeriod !== p ? `${sub}` : ''
            }`}
            style={{ background: payrollPeriod === p ? 'var(--primary-600)' : 'transparent', color: payrollPeriod === p ? '#fff' : undefined }}
          >
            {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : p === 'all' ? 'Всё' : 'Свой'}
          </button>
        ))}
      </div>

      {payrollPeriod === 'custom' && (
        <div className={`${glass} mb-4 rounded-xl p-3`}>
          <div className="mb-2 flex items-center gap-2">
            <Calendar size={14} strokeWidth={1.75} className={sub} aria-hidden />
            <span className={`text-xs ${sub}`}>Выберите период</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={`mb-1 block text-[11px] ${sub}`}>От</label>
              <input type="date" value={payrollDateFrom} onChange={(e) => setPayrollDateFrom(e.target.value)} className={`${inputCls} px-3 py-2`} />
            </div>
            <div className="flex-1">
              <label className={`mb-1 block text-[11px] ${sub}`}>До</label>
              <input type="date" value={payrollDateTo} onChange={(e) => setPayrollDateTo(e.target.value)} className={`${inputCls} px-3 py-2`} />
            </div>
          </div>
        </div>
      )}

      {payrollSettings.map((worker, index) => {
        const liveWorker = (payrollData ?? workers).find((item) => item.id === worker.id) ?? workers.find((item) => item.id === worker.id);
        const payrollSummary = liveWorker?.payrollSummary;
        return (
          <div key={worker.id} className={`${glass} mb-3 rounded-2xl p-4`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{worker.name}</div>
                <div className={`text-xs ${sub}`}>{payrollSummary?.completedBookings || 0} завершённых записей</div>
              </div>
              <div className={`text-right text-xs ${sub}`}>
                <div className="text-sm font-semibold tabular-nums" style={{ color: 'var(--status-success)' }}>
                  {(payrollSummary?.balance || 0).toLocaleString('ru')} ₽
                </div>
                <div>к выплате сейчас</div>
              </div>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className={`${glass} rounded-xl p-3`}>
                <div className={`mb-1 text-[11px] ${sub}`}>Начислено всего</div>
                <div className="text-sm font-semibold tabular-nums">{(payrollSummary?.totalAccrued || 0).toLocaleString('ru')} ₽</div>
                <div className={`mt-1 text-[11px] ${sub}`}>
                  С заказов: {(payrollSummary?.accruedFromBookings || 0).toLocaleString('ru')} ₽ · Оклад: {(payrollSummary?.baseSalary || worker.salaryBase).toLocaleString('ru')} ₽
                </div>
              </div>
              <div className={`${glass} rounded-xl p-3`}>
                <div className={`mb-1 text-[11px] ${sub}`}>Списания и выплаты</div>
                <div className="text-sm font-semibold tabular-nums">{(payrollSummary?.totalDeducted || 0).toLocaleString('ru')} ₽</div>
                <div className={`mt-1 text-[11px] ${sub}`}>
                  Авансы: {(payrollSummary?.advanceTotal || 0).toLocaleString('ru')} ₽ · Удержания: {(payrollSummary?.deductionTotal || 0).toLocaleString('ru')} ₽
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`mb-1 block text-xs ${sub}`}>Процент мастера</label>
                <input
                  className={inputCls}
                  type="number"
                  step="0.00001"
                  min={0}
                  max={100}
                  value={worker.percent === '' ? '' : worker.percent}
                  onChange={(event) => {
                    const r = event.target.value;
                    if (r === '') {
                      setPayrollSettings((current) => current.map((item, i) => (i === index ? { ...item, percent: '' } : item)));
                      return;
                    }
                    const n = parseFloat(r);
                    if (!isNaN(n)) {
                      setPayrollSettings((current) =>
                        current.map((item, i) => (i === index ? { ...item, percent: Math.min(100, Math.max(0, n)) } : item)),
                      );
                    }
                  }}
                  onBlur={() =>
                    setPayrollSettings((current) =>
                      current.map((item, i) => (i === index ? { ...item, percent: item.percent === '' ? 0 : item.percent } : item)),
                    )
                  }
                />
              </div>
              <div>
                <label className={`mb-1 block text-xs ${sub}`}>Оклад</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  value={worker.salaryBase}
                  onChange={(event) =>
                    setPayrollSettings((current) =>
                      current.map((item, i) => (i === index ? { ...item, salaryBase: Math.max(0, Number(event.target.value) || 0) } : item)),
                    )
                  }
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Активен в расписании</div>
                <div className={`text-xs ${sub}`}>Отключенный мастер не будет доступен для назначения</div>
              </div>
              <button
                role="switch"
                aria-checked={worker.active}
                aria-label={`Активность: ${worker.name}`}
                onClick={() =>
                  setPayrollSettings((current) => current.map((item, i) => (i === index ? { ...item, active: !item.active } : item)))
                }
                className="relative h-6 w-11 shrink-0 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                style={{ background: worker.active ? 'var(--primary-600)' : 'var(--switch-background, #D4D4D8)' }}
              >
                <span className={`absolute top-1 size-4 rounded-full bg-white transition-all ${worker.active ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {/* Операция по зарплате */}
            <div className={`${glass} mt-3 rounded-xl p-3`}>
              <div className="mb-2 grid grid-cols-2 gap-2">
                <select
                  className={selectCls}
                  value={payrollDrafts[worker.id]?.kind || 'advance'}
                  onChange={(event) =>
                    setPayrollDrafts((current) => ({
                      ...current,
                      [worker.id]: {
                        ...(current[worker.id] || { amount: '', note: '' }),
                        kind: event.target.value as PayrollEntryKind,
                      },
                    }))
                  }
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
                  onChange={(event) =>
                    setPayrollDrafts((current) => ({
                      ...current,
                      [worker.id]: {
                        ...(current[worker.id] || { kind: 'advance', note: '' }),
                        amount: event.target.value,
                      },
                    }))
                  }
                  placeholder="Сумма"
                />
              </div>
              <textarea
                className={`${inputCls} mb-2 h-20 resize-none`}
                value={payrollDrafts[worker.id]?.note || ''}
                onChange={(event) =>
                  setPayrollDrafts((current) => ({
                    ...current,
                    [worker.id]: {
                      ...(current[worker.id] || { kind: 'advance', amount: '' }),
                      note: event.target.value,
                    },
                  }))
                }
                placeholder="Примечание к авансу, списанию или выплате"
              />
              {payrollError && (
                <div className="mb-2 rounded-xl border border-[color-mix(in_srgb,var(--status-danger)_20%,transparent)] bg-[var(--status-danger-soft)] px-3 py-2 text-xs text-[var(--status-danger)]">
                  {payrollError}
                </div>
              )}
              <button
                onClick={() => { void handleCreatePayrollEntry(worker.id, worker.name); }}
                disabled={payrollEntryLoading === worker.id || !payrollDrafts[worker.id]?.amount}
                className="w-full rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ background: 'var(--primary-600)' }}
              >
                {payrollEntryLoading === worker.id
                  ? 'Сохраняю...'
                  : `${PAYROLL_KIND_LABELS[payrollDrafts[worker.id]?.kind || 'advance']} мастеру`}
              </button>
            </div>

            {(payrollSummary?.bookingItems?.length || 0) > 0 && (
              <div className="mt-3 space-y-2">
                {payrollSummary?.bookingItems.slice(0, 4).map((item: any) => (
                  <div key={item.bookingId} className={`${glass} flex items-center justify-between gap-3 rounded-xl p-3`}>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{item.service}</div>
                      <div className={`text-[11px] ${sub}`}>{item.date} · {item.time}</div>
                      {(item.car || item.plate) && (
                        <div className={`mt-0.5 text-[11px] ${sub}`}>{[item.car, item.plate].filter(Boolean).join(' · ')}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums">+{item.earned.toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub}`}>{item.percent}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(payrollSummary?.entries?.length || 0) > 0 && (
              <div className="mt-3 space-y-2">
                {payrollSummary?.entries.slice(0, 4).map((entry: any) => (
                  <div key={entry.id} className={`${glass} rounded-xl p-3`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{PAYROLL_KIND_LABELS[entry.kind as PayrollEntryKind]}</div>
                      <div className="text-sm font-semibold tabular-nums">{entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString('ru')} ₽</div>
                    </div>
                    <div className={`mt-1 text-[11px] ${sub}`}>
                      {entry.createdByName} · {new Date(entry.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {entry.note && <div className={`mt-1 text-xs ${sub}`}>{entry.note}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={handleSaveSettings}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white"
        style={{ background: 'var(--primary-600)' }}
      >
        <Save size={16} strokeWidth={1.75} />
        {saved ? 'Сохранено!' : 'Сохранить зарплаты'}
      </button>
    </motion.div>
  );
}
