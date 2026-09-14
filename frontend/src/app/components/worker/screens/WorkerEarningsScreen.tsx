import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, DollarSign } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { apiRequest } from '../../../api';
import { COMPLAINT_THRESHOLD, isComplaintActive, getComplaintPenaltyState } from '../../../utils/complaints';
import { isFixedMasterService, formatFixedMasterAmount } from '../../ui/utils';
import { EarningsCalendar } from '../shared/EarningsCalendar';
import { Money, StatTile } from '../../atmosfera';

const isWriteOffNote = (note?: string) => (note || '').trim().toLowerCase().startsWith('списан');

function getPayrollKindLabel(kind: string, note?: string): string {
  // kind="deduction" общий для штрафа и списания (бэкенд): списание
  // определяем по примечанию — форма списания у владельца всегда пишет
  // "Списание..." (см. OwnerApp handleAddWriteOff).
  if (kind === 'deduction') return isWriteOffNote(note) ? 'Списание' : 'Штраф';
  return ({ bonus: 'Премия', payout: 'Выплата', advance: 'Аванс', adjustment: 'Корректировка', fine: 'Штраф', } as Record<string, string>)[kind] || kind;
}

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
  /** Кликабельные плитки сводки: какая расшифровка открыта. */
  const [breakdown, setBreakdown] = useState<'earned' | 'paid' | 'balance' | 'shifts' | null>(null);
  const [opsFilter, setOpsFilter] = useState<'all' | 'payout'>('all');
  const compositionRef = useRef<HTMLDivElement | null>(null);
  const bookingsRef = useRef<HTMLDivElement | null>(null);
  const opsRef = useRef<HTMLDivElement | null>(null);
  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

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
              onClick={() => { setBreakdown(null); setSalaryPeriod(p); }}
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
              onClick={() => { setBreakdown(null); setSalarySegment(s); }}
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
              <input type="date" value={salaryDateFrom} onChange={(e) => { setBreakdown(null); setSalaryDateFrom(e.target.value); }} className={`${inputCls} px-3 py-2`} />
            </div>
            <div className="flex-1">
              <label className={`mb-1 block text-[11px] ${sub}`}>До</label>
              <input type="date" value={salaryDateTo} onChange={(e) => { setBreakdown(null); setSalaryDateTo(e.target.value); }} className={`${inputCls} px-3 py-2`} />
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
          {/* Сводка — плитки кликабельны, открывают расшифровку */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            <StatTile
              label="Заработано"
              value={<span className="text-[var(--primary-600)]"><Money amount={salaryDetail.totalEarned} /></span>}
              className="text-center [&>div:last-child]:mt-1"
              onClick={() => setBreakdown('earned')}
            />
            <StatTile
              label="Выплачено"
              value={<span className="font-semibold" style={{ color: DANGER }}><Money amount={salaryDetail.totalPaid} /></span>}
              className="text-center"
              onClick={() => setBreakdown('paid')}
            />
            <StatTile
              label="К выплате"
              value={<span className="font-semibold" style={{ color: salaryDetail.balanceToPay > 0 ? SUCCESS : undefined }}><Money amount={salaryDetail.balanceToPay} /></span>}
              className="text-center"
              onClick={() => setBreakdown('balance')}
            />
          </div>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <StatTile label="Задач" value={String(salaryDetail.completedBookingsCount)} className="text-center" onClick={() => setBreakdown('earned')} />
            <StatTile label="Смен" value={String(salaryDetail.shiftCount)} className="text-center" onClick={() => setBreakdown('shifts')} />
            <StatTile label="Оклад" value={<Money amount={salaryDetail.salaryBase || 0} />} className="text-center" onClick={() => setBreakdown('balance')} />
          </div>

          {/* Состав ЗП */}
          <div ref={compositionRef} className={`${glass} mb-3 scroll-mt-24 rounded-2xl p-4`}>
            <div className={`section-kicker mb-2`}>Состав ЗП</div>
            {(() => {
              const shiftPay = (salaryDetail.shiftCount || 0) * (salaryDetail.salaryPerShift || 0);
              const bonuses = (salaryDetail.entries || []).filter((e: any) => e.kind === 'bonus').reduce((s: number, e: any) => s + e.amount, 0);
              const advances = (salaryDetail.entries || []).filter((e: any) => e.kind === 'advance').reduce((s: number, e: any) => s + e.amount, 0);
              const isLegacyFine = (e: any) => e.kind === 'deduction' && /штраф/i.test(e.note || '');
              const deductions = (salaryDetail.entries || []).filter((e: any) => e.kind === 'deduction' && !isLegacyFine(e)).reduce((s: number, e: any) => s + e.amount, 0);
              const fines = (salaryDetail.entries || []).filter((e: any) => e.kind === 'fine' || isLegacyFine(e)).reduce((s: number, e: any) => s + e.amount, 0);
              const adjustments = (salaryDetail.entries || []).filter((e: any) => e.kind === 'adjustment').reduce((s: number, e: any) => s + e.amount, 0);
              const totalAccrued = salaryDetail.totalEarned + (salaryDetail.salaryBase || 0) + shiftPay + bonuses + Math.max(adjustments, 0);
              const totalDeducted = advances + deductions + fines + salaryDetail.totalPaid + Math.max(-adjustments, 0);
              return (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className={sub}>С услуг</span><span><Money amount={salaryDetail.totalEarned} /> <span className={`text-xs ${sub}`}>({salaryDetail.completedBookingsCount} задач{(salaryDetail.totalAsvcEarned || 0) > 0 ? ` · осн. ${(salaryDetail.totalMainEarned ?? 0).toLocaleString('ru')} + допы ${(salaryDetail.totalAsvcEarned || 0).toLocaleString('ru')}` : ''})</span></span></div>
                  <div className="flex justify-between"><span className={sub}>Оклад</span><span><Money amount={salaryDetail.salaryBase || 0} /></span></div>
                  <div className="flex justify-between"><span className={sub}>За смены</span><span><Money amount={shiftPay} /> <span className={`text-xs ${sub}`}>({salaryDetail.shiftCount} × {(salaryDetail.salaryPerShift || 0).toLocaleString('ru')} ₽)</span></span></div>
                  {bonuses > 0 && <div className="flex justify-between"><span className={sub}>Бонусы</span><span style={{ color: SUCCESS }}>+<Money amount={bonuses} /></span></div>}
                  {advances > 0 && <div className="flex justify-between"><span className={sub}>Авансы</span><span style={{ color: WARNING }}>-<Money amount={advances} /></span></div>}
                  {deductions > 0 && <div className="flex justify-between"><span className={sub}>Списания</span><span style={{ color: DANGER }}>-<Money amount={deductions} /></span></div>}
                  {fines > 0 && <div className="flex justify-between"><span className={sub}>Штрафы</span><span style={{ color: DANGER }}>-<Money amount={fines} /></span></div>}
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
          <div ref={bookingsRef} className="mb-3 flex scroll-mt-24 gap-1.5">
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
                          {(b.asvcEarned || 0) > 0 && (
                            <div className={`text-xs ${sub}`}>осн. {(b.mainEarned ?? (b.earned - (b.asvcEarned || 0))).toLocaleString('ru')} + допы {(b.asvcEarned || 0).toLocaleString('ru')}</div>
                          )}
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
            <div ref={opsRef} className={`${glass} mb-3 scroll-mt-24 rounded-2xl p-4`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className={`section-kicker`}>Операции за период</div>
                <div className="flex gap-1">
                  {(['all', 'payout'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setOpsFilter(f)}
                      className="rounded-lg px-2 py-1 text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                      style={{
                        background: opsFilter === f ? 'var(--primary-600)' : 'transparent',
                        color: opsFilter === f ? '#fff' : undefined,
                      }}
                    >
                      {f === 'all' ? 'Все' : 'Выплаты'}
                    </button>
                  ))}
                </div>
              </div>
              {(() => {
                const visible = opsFilter === 'payout'
                  ? (salaryDetail.entries || []).filter((e: any) => e.kind === 'payout')
                  : (salaryDetail.entries || []);
                if (visible.length === 0) {
                  return (
                    <div className="space-y-1.5">
                      <div className={`rounded-xl bg-[var(--sunken,#EEEFF3)] p-3 text-center text-xs ${sub} dark:bg-white/5`}>
                        Выплат за период нет
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpsFilter('all')}
                        className="w-full rounded-xl py-1.5 text-xs font-medium underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                      >
                        Показать все операции
                      </button>
                    </div>
                  );
                }
                return (
              <div className="space-y-1.5">
                {visible.slice(0, 10).map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sunken,#EEEFF3)] p-3 dark:bg-white/5">
                    <div>
                      <div className="text-sm font-medium">{getPayrollKindLabel(entry.kind, entry.note)}</div>
                      <div className={`text-xs ${sub}`}>{entry.note || entry.createdByName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold"><Money amount={entry.amount} /></div>
                      <div className={`text-[11px] ${sub}`}>{entry.entryDate || new Date(entry.createdAt).toLocaleDateString('ru-RU')}</div>
                    </div>
                  </div>
                ))}
              </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* ── Расшифровка плитки (bottom-sheet) ── */}
      {breakdown && salaryDetail && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50" onClick={() => setBreakdown(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} w-full max-w-sm rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto`}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">
                {breakdown === 'earned' ? `Заработано · ${salaryDetail.completedBookingsCount} задач` : breakdown === 'paid' ? 'Выплачено' : breakdown === 'shifts' ? `Смены · ${salaryDetail.shiftCount}` : 'К выплате — состав'}
              </h3>
              <button onClick={() => setBreakdown(null)} className={`rounded-xl px-3 py-1.5 text-sm ${sub} border border-border`}>Закрыть</button>
            </div>

            {breakdown === 'earned' && (
              <div className="space-y-1.5">
                {(salaryDetail.bookings || []).length === 0 && <div className={`text-sm ${sub} py-4 text-center`}>Нет задач за период</div>}
                {(salaryDetail.bookings || []).slice(0, 50).map((b: any) => (
                  <button key={b.id} onClick={() => { setBreakdown(null); onSelectBooking(b); }} className="flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--sunken,#EEEFF3)] p-3 text-left active:opacity-70 dark:bg-white/5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium tabular-nums">{b.date} {b.time} · {b.service}</div>
                      <div className={`text-xs ${sub}`}>{b.car ? `${b.car} · ` : ''}{b.box || ''}</div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold" style={{ color: SUCCESS }}>+<Money amount={b.earned} /></div>
                  </button>
                ))}
              </div>
            )}

            {breakdown === 'paid' && (
              <div className="space-y-1.5">
                {(() => {
                  const payouts = (salaryDetail.entries || []).filter((e: any) => e.kind === 'payout');
                  if (payouts.length === 0) return <div className={`text-sm ${sub} py-4 text-center`}>Выплат за период не было · всего выплачено <Money amount={salaryDetail.totalPaid} /></div>;
                  return payouts.slice(0, 50).map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sunken,#EEEFF3)] p-3 dark:bg-white/5">
                      <div>
                        <div className="text-sm font-medium">Выплата</div>
                        <div className={`text-xs ${sub}`}>{e.note || e.createdByName} · {e.entryDate || new Date(e.createdAt).toLocaleDateString('ru-RU')}</div>
                      </div>
                      <div className="font-semibold"><Money amount={e.amount} /></div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {breakdown === 'shifts' && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className={sub}>Смен</span><span className="font-semibold">{salaryDetail.shiftCount} × {(salaryDetail.salaryPerShift || 0).toLocaleString('ru')} ₽</span></div>
                <div className="flex justify-between"><span className={sub}>За смены</span><span className="font-semibold"><Money amount={(salaryDetail.shiftCount || 0) * (salaryDetail.salaryPerShift || 0)} /></span></div>
                {(salaryDetail.shiftDates?.length || 0) > 0 && (
                  <div className={`rounded-xl p-3 text-xs ${sub} bg-[var(--sunken,#EEEFF3)] dark:bg-white/5`}>Выходы: {salaryDetail.shiftDates.join(', ')}</div>
                )}
              </div>
            )}

            {breakdown === 'balance' && (
              <div className="space-y-1.5 text-sm">
                {(() => {
                  const shiftPay = (salaryDetail.shiftCount || 0) * (salaryDetail.salaryPerShift || 0);
                  const bonuses = (salaryDetail.entries || []).filter((e: any) => e.kind === 'bonus').reduce((s: number, e: any) => s + e.amount, 0);
                  const advances = (salaryDetail.entries || []).filter((e: any) => e.kind === 'advance').reduce((s: number, e: any) => s + e.amount, 0);
                  const isLegacyFine = (e: any) => e.kind === 'deduction' && /штраф/i.test(e.note || '');
                  const deductions = (salaryDetail.entries || []).filter((e: any) => e.kind === 'deduction' && !isLegacyFine(e)).reduce((s: number, e: any) => s + e.amount, 0);
                  const fines = (salaryDetail.entries || []).filter((e: any) => e.kind === 'fine' || isLegacyFine(e)).reduce((s: number, e: any) => s + e.amount, 0);
                  const adjustments = (salaryDetail.entries || []).filter((e: any) => e.kind === 'adjustment').reduce((s: number, e: any) => s + e.amount, 0);
                  return (
                    <>
                      <div className="flex justify-between"><span className={sub}>С услуг</span><span><Money amount={salaryDetail.totalEarned} /></span></div>
                      <div className="flex justify-between"><span className={sub}>Оклад</span><span><Money amount={salaryDetail.salaryBase || 0} /></span></div>
                      <div className="flex justify-between"><span className={sub}>За смены</span><span><Money amount={shiftPay} /></span></div>
                      {bonuses > 0 && <div className="flex justify-between"><span className={sub}>Бонусы</span><span style={{ color: SUCCESS }}>+<Money amount={bonuses} /></span></div>}
                      {adjustments > 0 && <div className="flex justify-between"><span className={sub}>Корректировки +</span><span style={{ color: SUCCESS }}>+<Money amount={adjustments} /></span></div>}
                      {advances > 0 && <div className="flex justify-between"><span className={sub}>Авансы</span><span style={{ color: WARNING }}>-<Money amount={advances} /></span></div>}
                      {deductions > 0 && <div className="flex justify-between"><span className={sub}>Списания</span><span style={{ color: DANGER }}>-<Money amount={deductions} /></span></div>}
                      {fines > 0 && <div className="flex justify-between"><span className={sub}>Штрафы</span><span style={{ color: DANGER }}>-<Money amount={fines} /></span></div>}
                      {adjustments < 0 && <div className="flex justify-between"><span className={sub}>Корректировки −</span><span style={{ color: DANGER }}><Money amount={adjustments} /></span></div>}
                      <div className="flex justify-between"><span className={sub}>Выплачено</span><span style={{ color: DANGER }}>-<Money amount={salaryDetail.totalPaid} /></span></div>
                      <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 text-base font-bold"><span>К выплате</span><span style={{ color: SUCCESS }}><Money amount={salaryDetail.balanceToPay} /></span></div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
