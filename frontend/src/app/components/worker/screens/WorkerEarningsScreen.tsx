import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, DollarSign } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { apiRequest } from '../../../api';
import { COMPLAINT_THRESHOLD, isComplaintActive, getComplaintPenaltyState } from '../../../utils/complaints';
import { isFixedMasterService, formatFixedMasterAmount } from '../../ui/utils';
import { EarningsCalendar } from '../shared/EarningsCalendar';
import { Money, StatTile } from '../../atmosfera';

const kindLabel: Record<string, string> = {
  bonus: 'Премия',
  deduction: 'Штраф',
  payout: 'Выплата',
  advance: 'Аванс',
  adjustment: 'Корректировка',
};

const DANGER = 'var(--status-danger)';
const SUCCESS = 'var(--status-success)';
const WARNING = 'var(--status-warning)';

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

export interface WorkerEarningsScreenProps {
  /** workerId текущего мастера (фильтр жалоб). */
  workerId: string;
  onSelectBooking: (booking: any) => void;
}

/**
 * WorkerEarningsScreen — вырезка из WorkerApp (§6.3).
 * Периоды/сегменты/загрузка — внутри экрана; выбор задачи уходит родителю
 * (детальный sheet завершённого заказа живёт там). Цвета метрик — токены.
 */
export function WorkerEarningsScreen({ workerId, onSelectBooking }: WorkerEarningsScreenProps) {
  const { penalties, staffProfile, services, isDark } = useApp();

  const [salaryPeriod, setSalaryPeriod] = useState<'day' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [salarySegment, setSalarySegment] = useState<'all' | 'wash' | 'detailing'>('all');
  const [salaryDateFrom, setSalaryDateFrom] = useState('');
  const [salaryDateTo, setSalaryDateTo] = useState('');
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [salaryDetail, setSalaryDetail] = useState<any>(null);
  const [earningsViewMode, setEarningsViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);

  useEffect(() => {
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
      .catch((e) => {
        console.error('worker salary-detail error:', e);
        setSalaryError(e?.message || 'Ошибка загрузки данных');
        setSalaryDetail(null);
      })
      .finally(() => setSalaryLoading(false));
  }, [salaryPeriod, salarySegment, salaryDateFrom, salaryDateTo]);

  // 1-в-1 из родителя: активные жалобы текущего мастера + состояние процента
  const myPenalties = (penalties || []).filter((penalty) => penalty.workerId === workerId && isComplaintActive(penalty));
  const complaintState = getComplaintPenaltyState(staffProfile?.defaultPercent || 0, myPenalties);

  const inputCls =
    'border border-[var(--input,var(--border))] rounded-xl bg-[var(--input-background,#EEEFF3)] px-3 py-2.5 w-full text-sm text-foreground outline-none focus:border-[var(--ring)] dark:bg-white/[.06]';
  const glass = 'border border-border bg-[var(--card)]';
  const sub = 'text-[var(--fg-secondary,#5A6072)]';

  return (
    <motion.div key="earnings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      {/* Фильтры периода и сегмента */}
      <div className={`${glass} mb-3 rounded-2xl p-3`}>
        <div className="mb-1.5 flex gap-1.5">
          {(['day', 'week', 'month', 'all', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSalaryPeriod(p)}
              className="flex-1 rounded-xl py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              style={{ background: salaryPeriod === p ? 'var(--primary-600)' : 'transparent', color: salaryPeriod === p ? '#fff' : undefined }}
            >
              {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : p === 'all' ? 'Всё' : 'Своё'}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'wash', 'detailing'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSalarySegment(s)}
              className={`flex-1 rounded-xl py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${salarySegment !== s ? `${sub}` : ''}`}
              style={{ background: salarySegment === s ? 'var(--primary-600)' : 'transparent', color: salarySegment === s ? '#fff' : undefined }}
            >
              {s === 'all' ? 'Все' : s === 'wash' ? 'Мойка' : 'Детейлинг'}
            </button>
          ))}
        </div>
        {salaryPeriod === 'custom' && (
          <div className="mt-3 flex gap-2">
            <div className="flex-1">
              <label className={`mb-1 block text-[11px] ${sub}`}>От</label>
              <input type="date" value={salaryDateFrom} onChange={(e) => setSalaryDateFrom(e.target.value)} className={`${inputCls} px-3 py-2`} />
            </div>
            <div className="flex-1">
              <label className={`mb-1 block text-[11px] ${sub}`}>До</label>
              <input type="date" value={salaryDateTo} onChange={(e) => setSalaryDateTo(e.target.value)} className={`${inputCls} px-3 py-2`} />
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
          <AlertCircle size={36} strokeWidth={1.75} className="mx-auto mb-3 text-[var(--status-danger)]" aria-hidden />
          <p className="mb-2 text-sm text-[var(--status-danger)]">{salaryError}</p>
        </div>
      ) : !salaryDetail ? (
        <div className={`${glass} rounded-2xl p-8 text-center`}>
          <DollarSign size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} aria-hidden />
          <p className={sub}>Нет данных за выбранный период</p>
        </div>
      ) : (
        <>
          {/* Сводка */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            <StatTile
              label="Заработано"
              value={<span className="text-[var(--primary-600)]"><Money amount={salaryDetail.totalEarned} /></span>}
              className="text-center [&>div:last-child]:mt-1"
            />
            <StatTile label="Выплачено" value={<span className="font-semibold" style={{ color: DANGER }}><Money amount={salaryDetail.totalPaid} /></span>} className="text-center" />
            <StatTile
              label="К выплате"
              value={<span className="font-semibold" style={{ color: salaryDetail.balanceToPay > 0 ? SUCCESS : undefined }}><Money amount={salaryDetail.balanceToPay} /></span>}
              className="text-center"
            />
          </div>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <StatTile label="Задач" value={String(salaryDetail.completedBookingsCount)} className="text-center" />
            <StatTile label="Смен" value={String(salaryDetail.shiftCount)} className="text-center" />
            <StatTile label="Оклад" value={<Money amount={salaryDetail.salaryBase || 0} />} className="text-center" />
          </div>

          {/* Состав ЗП */}
          <div className={`${glass} mb-3 rounded-2xl p-4`}>
            <div className={`section-kicker mb-2`}>Состав ЗП</div>
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
                  <div className="flex justify-between"><span className={sub}>С услуг</span><span><Money amount={salaryDetail.totalEarned} /> <span className={`text-xs ${sub}`}>({salaryDetail.completedBookingsCount} задач)</span></span></div>
                  <div className="flex justify-between"><span className={sub}>Оклад</span><span><Money amount={salaryDetail.salaryBase || 0} /></span></div>
                  <div className="flex justify-between"><span className={sub}>За смены</span><span><Money amount={shiftPay} /> <span className={`text-xs ${sub}`}>({salaryDetail.shiftCount} × {(salaryDetail.salaryPerShift || 0).toLocaleString('ru')} ₽)</span></span></div>
                  {bonuses > 0 && <div className="flex justify-between"><span className={sub}>Бонусы</span><span style={{ color: SUCCESS }}>+<Money amount={bonuses} /></span></div>}
                  {advances > 0 && <div className="flex justify-between"><span className={sub}>Авансы</span><span style={{ color: WARNING }}>-<Money amount={advances} /></span></div>}
                  {deductions > 0 && <div className="flex justify-between"><span className={sub}>Штрафы</span><span style={{ color: DANGER }}>-<Money amount={deductions} /></span></div>}
                  {adjustments !== 0 && <div className="flex justify-between"><span className={sub}>Корректировки</span><span style={{ color: adjustments > 0 ? SUCCESS : DANGER }}>{adjustments > 0 ? '+' : ''}<Money amount={Math.abs(adjustments)} /></span></div>}
                  <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-semibold">
                    <span>Итого начислено</span><span className="text-[var(--primary-600)]"><Money amount={totalAccrued} /></span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Удержано и выплачено</span><span style={{ color: DANGER }}><Money amount={totalDeducted} /></span>
                  </div>
                  <div className="flex justify-between text-base font-bold">
                    <span>К выплате</span><span style={{ color: SUCCESS }}><Money amount={totalAccrued - totalDeducted} /></span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Переключатель вида завершённых задач */}
          <div className="mb-3 flex gap-1.5">
            {(['calendar', 'list'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setEarningsViewMode(mode)}
                className={`flex-1 rounded-xl py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${earningsViewMode !== mode ? sub : ''}`}
                style={{ background: earningsViewMode === mode ? 'var(--primary-600)' : 'transparent', color: earningsViewMode === mode ? '#fff' : undefined }}
              >
                {mode === 'calendar' ? 'Календарь' : 'По датам'}
              </button>
            ))}
          </div>

          {earningsViewMode === 'calendar' && (
            <EarningsCalendar
              bookings={salaryDetail.bookings || []}
              selectedDate={selectedCalDate}
              onSelectDate={setSelectedCalDate}
              onSelectBooking={onSelectBooking}
              glass={glass}
              isDark={isDark}
              sub={sub}
              primary="var(--primary-600)"
              accent={SUCCESS}
            />
          )}

          {earningsViewMode === 'list' && (
            <div className="mb-3 space-y-3">
              {groupBookingsByDate(salaryDetail.bookings || []).map(({ date, items }) => (
                <div key={date}>
                  <div className={`mb-1.5 text-xs font-medium ${sub}`}>{date}</div>
                  {items.map((b: any) => (
                    <div key={b.id} className={`${glass} mb-1.5 cursor-pointer rounded-xl p-3`} onClick={() => onSelectBooking(b)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium tabular-nums">{b.time} · {b.service}</div>
                          {b.car && <div className={`text-xs ${sub}`}>{b.car}{b.plate ? ` (${b.plate})` : ''}</div>}
                          <div className={`text-xs ${sub}`}>
                            {b.box} · <Money amount={b.price ?? 0} />
                            {b.paymentType ? ` · ${b.paymentType === 'cash' ? 'Наличные' : b.paymentType === 'transfer' ? 'Перевод' : 'По счёту'}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold" style={{ color: SUCCESS }}>
                            +<Money amount={b.earned} />
                          </div>
                          {isFixedMasterService(services, b.serviceId, b.service)
                            ? <div className={`text-xs ${sub}`}>фикс {formatFixedMasterAmount()}</div>
                            : b.payType === 'fixed'
                              ? <div className={`text-xs ${sub}`}><Money amount={b.fixedAmount || 0} /></div>
                              : <div className={`text-xs ${sub}`}>{b.percent}%</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {(salaryDetail.bookings || []).length === 0 && (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <DollarSign size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} aria-hidden />
                  <p className={sub}>Нет завершённых задач</p>
                </div>
              )}
            </div>
          )}

          {/* Процент */}
          <div className={`${glass} mb-3 rounded-2xl p-4`}>
            <div className={`mb-1 text-xs ${sub}`}>Мой процент</div>
            <div className="text-xl font-bold" style={{ color: SUCCESS }}>{complaintState.effectivePercent}% от каждого заказа</div>
            <div className={`mt-1 text-xs ${sub}`}>База: {complaintState.basePercent}% · максимум 40%</div>
            <div className="mt-2 h-2 rounded-full bg-[var(--sunken,#EEEFF3)] dark:bg-white/5">
              <div className="h-2 rounded-full bg-[var(--primary-600)]" style={{ width: `${complaintState.effectivePercent}%` }} />
            </div>
          </div>

          {/* Жалобы владельца */}
          <div className={`${glass} mb-3 rounded-2xl p-4`}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className={`text-xs ${sub}`}>Жалобы владельца</div>
                <div className="text-xl font-bold text-[var(--status-danger)]">{complaintState.activeCount}</div>
              </div>
              <div className="text-right">
                <div className={`text-xs ${sub}`}>Оклад</div>
                <div className="font-semibold"><Money amount={staffProfile?.salaryBase || 0} /></div>
              </div>
            </div>
            {complaintState.reductionActive ? (
              <div className="mb-3 rounded-xl border border-[color-mix(in_srgb,var(--status-danger)_20%,transparent)] bg-[var(--status-danger-soft)] px-3 py-2 text-xs text-[var(--status-danger)]">
                Снижение активно: -10 п.п. до {complaintState.reductionUntil ? new Date(complaintState.reductionUntil).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'конца недели'}.
              </div>
            ) : (
              <div className={`mb-3 text-xs ${sub}`}>
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
                  <div key={penalty.id} className={`${glass} flex items-start justify-between gap-3 rounded-xl p-3 text-sm`}>
                    <div>
                      <div className="font-medium">{penalty.title}</div>
                      <div className={`text-xs ${sub}`}>{penalty.reason}</div>
                      <div className={`mt-1 text-[11px] ${sub}`}>{`Активна до ${new Date(penalty.activeUntil).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs" style={{ color: DANGER }}>Активна</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Операции за период */}
          {(salaryDetail.entries?.length || 0) > 0 && (
            <div className={`${glass} mb-3 rounded-2xl p-4`}>
              <div className={`section-kicker mb-2`}>Операции за период</div>
              <div className="space-y-1.5">
                {salaryDetail.entries.slice(0, 10).map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sunken,#EEEFF3)] p-3 dark:bg-white/5">
                    <div>
                      <div className="text-sm font-medium">{kindLabel[entry.kind] || entry.kind}</div>
                      <div className={`text-xs ${sub}`}>{entry.note || entry.createdByName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold"><Money amount={entry.amount} /></div>
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
  );
}
