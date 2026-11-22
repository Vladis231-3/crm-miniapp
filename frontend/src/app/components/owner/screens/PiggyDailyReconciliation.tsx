import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Check, ChevronDown, Trash2, X } from 'lucide-react';
import { apiRequest } from '../../../api';
import { toast } from '../../atmosfera';

/**
 * Сверка копилки по дням: расчётный остаток копилки на конец дня vs факт кассы.
 *
 * Владелец вечером считает наличные в ящике и вносит сумму. Карточка сразу
 * показывает разницу «факт − расчёт» за этот день — перекос (например, чек,
 * разнесённый не по той копилке) виден в тот же вечер, а не на сверке в конце
 * месяца. Дни с проводками, внесёнными задним числом, помечены ⚠.
 */

interface DailyGroupEntry {
  deposits: number;
  withdrawals: number;
  adjust: number;
  expenses: number;
  incomes: number;
  count: number;
  net: number;
  closing: number;
}

interface DailyDay {
  date: string;
  isoDate: string;
  groups: Record<string, DailyGroupEntry>;
  facts: Record<string, number | null>;
  diffs: Record<string, number | null>;
  hasBackdated: boolean;
  total: { net: number; closing: number };
}

interface DailyPayload {
  dateFrom: string;
  dateTo: string;
  groups: string[];
  opening: Record<string, number>;
  closing: Record<string, number>;
  days: DailyDay[];
  recorded: Record<string, number>;
  unexplained: Record<string, number>;
}

const GROUPS: Record<string, { icon: string; label: string }> = {
  wash: { icon: '🚗', label: 'Мойка' },
  detailing: { icon: '✨', label: 'Детейлинг' },
};

const PERIODS = [7, 14, 30] as const;

const pad = (value: number) => String(value).padStart(2, '0');
const dmy = (value: Date) => `${pad(value.getDate())}.${pad(value.getMonth() + 1)}.${value.getFullYear()}`;
const rub = (value: number) => `${value.toLocaleString('ru')} ₽`;
const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('ru')} ₽`;

export function PiggyDailyReconciliation({
  piggyTab,
  glass,
  sub,
  isDark,
  primary,
}: {
  piggyTab: 'all' | 'wash' | 'detailing' | 'general';
  glass: string;
  sub: string;
  isDark: boolean;
  primary: string;
}) {
  const [period, setPeriod] = useState<number>(14);
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<DailyPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ date: string; group: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (piggyTab === 'general') return;
    setLoading(true);
    setError(null);
    try {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - (period - 1));
      const qs = new URLSearchParams({
        date_from: dmy(from),
        date_to: dmy(to),
        resource_group: piggyTab,
      });
      const payload = await apiRequest<DailyPayload>(`/api/owner/piggy-bank/daily?${qs.toString()}`);
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить сверку');
    } finally {
      setLoading(false);
    }
  }, [piggyTab, period]);

  useEffect(() => {
    void load();
  }, [load]);

  if (piggyTab === 'general') return null;

  const groups = data?.groups ?? [];
  const unexplainedTotal = groups.reduce((sum, g) => sum + (data?.unexplained[g] ?? 0), 0);
  const recordedTotal = groups.reduce((sum, g) => sum + (data?.recorded[g] ?? 0), 0);

  const startEdit = (day: DailyDay, group: string) => {
    setEdit({ date: day.date, group });
    const fact = day.facts[group];
    setAmount(String(fact ?? day.groups[group]?.closing ?? 0));
    setNote(((day as unknown as Record<string, unknown>)[`note_${group}`] as string) || '');
  };

  const cancelEdit = () => {
    setEdit(null);
    setAmount('');
    setNote('');
  };

  const save = async () => {
    if (!edit) return;
    const value = Number(amount.replace(',', '.').replace(/\s/g, ''));
    if (!Number.isFinite(value) || value < 0) {
      toast({ type: 'error', title: 'Введите сумму факта (0 или больше)' });
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/api/owner/piggy-bank/cash-count', {
        method: 'PUT',
        body: { date: edit.date, resourceGroup: edit.group, amount: value, note: note.trim() },
      });
      toast({ type: 'success', title: `Факт кассы на ${edit.date}: ${rub(value)}` });
      cancelEdit();
      await load();
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : 'Не удалось сохранить факт' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      await apiRequest(
        `/api/owner/piggy-bank/cash-count?date=${encodeURIComponent(edit.date)}&resource_group=${encodeURIComponent(edit.group)}`,
        { method: 'DELETE' },
      );
      toast({ type: 'success', title: 'Факт кассы удалён' });
      cancelEdit();
      await load();
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : 'Не удалось удалить факт' });
    } finally {
      setSaving(false);
    }
  };

  const fieldBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  return (
    <div className={`${glass} rounded-2xl p-4 mb-4`}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
          <CalendarCheck size={14} strokeWidth={1.75} aria-hidden />
          Сверка по дням
          {unexplainedTotal !== 0 && (
            <span
              className="normal-case text-[10px] px-1.5 py-0.5 rounded-full text-white"
              style={{ background: 'var(--status-danger)' }}
            >
              расхождение {signed(unexplainedTotal)}
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          aria-hidden
          className={`${sub} transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className={`text-[11px] ${sub} mt-2 leading-snug`}>
            Считайте кассу вечером и вносите факт: расхождение видно в тот же день.
            {data ? ` Период ${data.dateFrom}–${data.dateTo} · сверено дней: ${recordedTotal}` : ''}
          </div>

          <div className="flex items-center gap-1 mt-3">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${period === p ? 'text-white' : sub}`}
                style={period === p ? { background: primary } : { background: fieldBg }}
              >
                {p} дней
              </button>
            ))}
            <button onClick={() => void load()} disabled={loading} className={`ml-auto px-2.5 py-1 rounded-lg text-[11px] ${sub}`} style={{ background: fieldBg }}>
              {loading ? '…' : 'Обновить'}
            </button>
          </div>

          {error && <div className="text-xs mt-3" style={{ color: 'var(--status-danger)' }}>{error}</div>}

          {!error && data && data.days.length === 0 && (
            <div className={`text-xs ${sub} mt-3`}>За период движений нет — нечего сверять.</div>
          )}

          {!error && data && data.days.length > 0 && (
            <div className="space-y-4 mt-3">
              {groups.map(group => {
                const meta = GROUPS[group] ?? { icon: '📦', label: group };
                const diff = data.unexplained[group] ?? 0;
                return (
                  <div key={group}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold">{meta.icon} {meta.label}</span>
                      <span className={`text-[11px] tabular-nums ${sub}`}>
                        сверено: {data.recorded[group] ?? 0}
                        {diff !== 0 && (
                          <span
                            className="ml-1.5 font-semibold"
                            style={{ color: diff > 0 ? 'var(--status-warning)' : 'var(--status-danger)' }}
                          >
                            {signed(diff)}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {data.days.map(day => {
                        const entry = day.groups[group];
                        if (!entry) return null;
                        const isEditing = edit?.date === day.date && edit?.group === group;
                        const fact = day.facts[group];
                        const factDiff = day.diffs[group];
                        const hasMovement = entry.count > 0 || entry.expenses !== 0 || entry.incomes !== 0;
                        return (
                          <div
                            key={`${group}-${day.date}`}
                            className="py-1.5 border-b last:border-0"
                            style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[13px] font-medium flex items-center gap-1">
                                  {day.date}
                                  {day.hasBackdated && (
                                    <span
                                      className="text-[10px] px-1 py-0.5 rounded"
                                      style={{ background: 'rgba(245,158,11,0.18)', color: '#B45309' }}
                                      title="Есть проводки, внесённые задним числом — могли попасть в кассу раньше"
                                    >
                                      ⚠ задним числом
                                    </span>
                                  )}
                                </div>
                                <div className={`text-[11px] ${sub} tabular-nums`}>
                                  {hasMovement ? (
                                    <>
                                      {entry.deposits !== 0 && <span style={{ color: 'var(--status-success)' }}>+{rub(entry.deposits)} </span>}
                                      {entry.withdrawals !== 0 && <span style={{ color: 'var(--status-danger)' }}>{signed(entry.withdrawals)} </span>}
                                      {entry.adjust !== 0 && <span>корр. {signed(entry.adjust)} </span>}
                                      {entry.expenses !== 0 && <span style={{ color: 'var(--status-danger)' }}>расход {rub(entry.expenses)} </span>}
                                      {entry.incomes !== 0 && <span style={{ color: 'var(--status-success)' }}>доход {rub(entry.incomes)} </span>}
                                    </>
                                  ) : (
                                    'движений нет'
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-[13px] tabular-nums">{rub(entry.closing)}</div>
                                {fact === null || fact === undefined ? (
                                  <button
                                    onClick={() => startEdit(day, group)}
                                    className="text-[10px] px-1.5 py-0.5 rounded-lg mt-0.5"
                                    style={{ background: `${primary}20`, color: primary }}
                                  >
                                    + факт кассы
                                  </button>
                                ) : (
                                  <button onClick={() => startEdit(day, group)} className="text-[10px] mt-0.5 tabular-nums">
                                    <span className={sub}>факт {rub(fact)}</span>{' '}
                                    <span
                                      className="font-semibold"
                                      style={{ color: (factDiff ?? 0) === 0 ? 'var(--status-success)' : 'var(--status-danger)' }}
                                    >
                                      {signed(factDiff ?? 0)}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {isEditing && (
                              <div className="mt-2 rounded-xl p-2.5 space-y-2" style={{ background: fieldBg }}>
                                <div className="flex items-center gap-2">
                                  <input
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    inputMode="decimal"
                                    placeholder="Факт, ₽"
                                    className="flex-1 min-w-0 px-2.5 py-2 rounded-lg text-sm tabular-nums"
                                    style={{ background: isDark ? '#1C1C1F' : '#fff' }}
                                  />
                                  <button
                                    onClick={() => void save()}
                                    disabled={saving}
                                    className="p-2 rounded-lg text-white disabled:opacity-60"
                                    style={{ background: 'var(--status-success)' }}
                                    title="Сохранить факт"
                                  >
                                    <Check size={16} strokeWidth={2} aria-hidden />
                                  </button>
                                  <button onClick={cancelEdit} className="p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} title="Отмена">
                                    <X size={16} strokeWidth={1.75} aria-hidden />
                                  </button>
                                  {fact !== null && fact !== undefined && (
                                    <button
                                      onClick={() => void remove()}
                                      disabled={saving}
                                      className="p-2 rounded-lg disabled:opacity-60"
                                      style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--status-danger)' }}
                                      title="Удалить факт"
                                    >
                                      <Trash2 size={16} strokeWidth={1.75} aria-hidden />
                                    </button>
                                  )}
                                </div>
                                <input
                                  value={note}
                                  onChange={e => setNote(e.target.value)}
                                  placeholder="Примечание (необязательно): кто считал, что нашли"
                                  className="w-full px-2.5 py-2 rounded-lg text-xs"
                                  style={{ background: isDark ? '#1C1C1F' : '#fff' }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}