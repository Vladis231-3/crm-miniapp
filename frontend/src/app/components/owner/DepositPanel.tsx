import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle, AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CalendarDays,
  Check, ChevronRight, Download, Plus, Send, Settings, Wallet, X,
} from 'lucide-react';
import {
  useApp,
  type DepositOverview,
  type DepositSummaryItem,
  type DepositWashInput,
  type RegisteredClient,
} from '../../context/AppContext';
import { formatDate, parseFlexibleDate } from '../../utils/date';
import { normalizePlateInput, type PlateType } from '../../utils/validation';

interface DepositPanelProps {

  onBack: () => void;
}

function toISODate(value: string) {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = String((i % 2) * 30).padStart(2, '0');
  return `${h}:${m}`;
});

const MONTH_LABELS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const PLAN_OPTIONS = [
  { value: 'fee', label: 'Абонплата', desc: 'Фиксированная абонплата в месяц' },
  { value: 'washes', label: 'N моек включено', desc: 'В абонемент входит N моек' },
  { value: 'per_wash', label: 'Оплата за мойку', desc: 'Клиент платит за каждую мойку' },
  { value: 'unlimited', label: 'Безлимит', desc: 'Любое число моек за абонплату' },
] as const;

const TXN_TYPE_OPTIONS = [
  { value: '', label: 'Все типы' },
  { value: 'topup', label: 'Пополнения' },
  { value: 'wash_deduction', label: 'Мойки' },
  { value: 'month_return', label: 'Закрытия месяца' },
  { value: 'adjust', label: 'Корректировки' },
] as const;

function monthKeyToLabel(month: string): string {
  const match = /^(\d{2})\.(\d{4})$/.exec(month);
  if (!match) return month;
  const monthIndex = Number(match[1]) - 1;
  return `${MONTH_LABELS[monthIndex] ?? match[1]} ${match[2]}`;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
}

function txnMonthOf(dateStr: string): string {
  const parts = (dateStr || '').split('.');
  return parts.length === 3 ? `${parts[1]}.${parts[2]}` : '';
}

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

function planLabel(plan: string): string {
  return PLAN_OPTIONS.find((option) => option.value === plan)?.label ?? 'Абонплата';
}

function fieldLabel(label: string) {
  return <label className="text-xs font-medium block mb-1">{label}</label>;
}

function BalanceSparkline({ overview, color }: { overview: DepositOverview; color: string }) {
  const points = useMemo(() => {
    if (overview.transactions.length === 0) return null;
    const sorted = [...overview.transactions].reverse();
    const values = sorted.map((txn) => txn.balance_after);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const w = 100;
    const h = 40;
    return sorted.map((txn, index) => ({
      x: (index / Math.max(1, sorted.length - 1)) * w,
      y: h - ((txn.balance_after - min) / range) * h,
    }));
  }, [overview.transactions]);
  if (!points) return null;
  const coords = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-10 block">
      <polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.2" fill={color} />
    </svg>
  );
}

interface SheetProps {
  title: string;
  isDark: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Sheet({ title, isDark, onClose, children }: SheetProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-4 pb-6 max-h-[85vh] overflow-y-auto"
        style={{ background: isDark ? '#1C1C1F' : '#ffffff' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">{title}</h3>
          <button onClick={onClose} className="p-1">
            <X size={18} strokeWidth={1.75} className="opacity-60" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function DepositPanel({ onBack }: DepositPanelProps) {
  const {
    clients,
    isDark,
    workers,
    listDepositClients,
    getDepositOverview,
    updateDepositSubscription,
    depositTopUp,
    depositAdjust,
    depositRecordWash,
    depositSettleMonth,
    downloadDepositExport,
    downloadDepositExportAll,
    sendDepositExport,
    sendDepositExportAll,
  } = useApp();

  const glass = isDark ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm';
  const sub = isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]';
  const primary = isDark ? '#6E76F2' : '#4F46E5';
  const accent = isDark ? '#34D399' : '#10B981';
  const danger = '#EF4444';
  const inputCls = `${isDark ? 'bg-white/[.07] border-transparent text-[#E4E4E7] placeholder-zinc-500 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/25 focus:bg-white/[.09]' : 'bg-black/[.05] border-transparent text-[#131316] placeholder-zinc-400 focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const selectCls = `${isDark ? 'bg-white/[.07] border-transparent text-[#E4E4E7] focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/25 focus:bg-white/[.09]' : 'bg-black/[.05] border-transparent text-[#131316] focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;

  const [summaries, setSummaries] = useState<DepositSummaryItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [overview, setOverview] = useState<DepositOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'activate' | 'topup' | 'adjust' | 'wash'>(null);

  const [activateClientId, setActivateClientId] = useState('');
  const [activateActive, setActivateActive] = useState(false);
  const [activateMonthly, setActivateMonthly] = useState('');
  const [activatePlan, setActivatePlan] = useState<string>('fee');
  const [activateWashesIncluded, setActivateWashesIncluded] = useState('');
  const [activateCarryover, setActivateCarryover] = useState(false);
  const [activateMinBalance, setActivateMinBalance] = useState('');
  const [activateBillingDay, setActivateBillingDay] = useState('1');
  const [activateWashPrice, setActivateWashPrice] = useState('');

  const [amountDraft, setAmountDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [dateDraft, setDateDraft] = useState('');

  const [txnMonthFilter, setTxnMonthFilter] = useState('');
  const [txnTypeFilter, setTxnTypeFilter] = useState('');

  const [washCar, setWashCar] = useState('');
  const [washPlate, setWashPlate] = useState('');
  const [washPlateType, setWashPlateType] = useState<PlateType>('russian');
  const [washPrice, setWashPrice] = useState('');
  const [washWorkerId, setWashWorkerId] = useState('');
  const [washService, setWashService] = useState('');
  const [washTime, setWashTime] = useState('');

  const loadSummaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummaries(await listDepositClients());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [listDepositClients]);

  const loadOverview = useCallback(async (clientId: string) => {
    setError(null);
    try {
      setOverview(await getDepositOverview(clientId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    }
  }, [getDepositOverview]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((client) => client.id === selectedClientId) ?? null;
  }, [clients, selectedClientId]);

  const workerOptions = useMemo(() => workers.filter((worker) => worker.role !== 'accountant'), [workers]);

  const eligibleClients = useMemo(() => clients.filter((client) => !client.depositActive), [clients]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>([overview?.monthLabel ?? '']);
    (overview?.monthRows ?? []).forEach((row) => months.add(row.month));
    return Array.from(months).filter(Boolean);
  }, [overview]);

  const filteredTxns = useMemo(() => {
    if (!overview) return [];
    return overview.transactions.filter((txn) => {
      if (txnMonthFilter && txnMonthOf(txn.date) !== txnMonthFilter) return false;
      if (txnTypeFilter && txn.transaction_type !== txnTypeFilter) return false;
      return true;
    });
  }, [overview, txnMonthFilter, txnTypeFilter]);

  const openClient = async (clientId: string) => {
    setSelectedClientId(clientId);
    setTxnMonthFilter('');
    setTxnTypeFilter('');
    await loadOverview(clientId);
  };

  const runAndRefresh = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      if (selectedClientId) await loadOverview(selectedClientId);
      await loadSummaries();
      setSheet(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка операции');
    }
  };

  const handleActivate = async () => {
    if (!activateClientId) return;
    await runAndRefresh(() =>
      updateDepositSubscription(activateClientId, {
        depositActive: activateActive,
        depositMonthly: activateMonthly ? Number(activateMonthly) : 0,
        depositStartMonth: currentMonthKey(),
        depositPlan: activatePlan,
        depositWashesIncluded: activateWashesIncluded ? Number(activateWashesIncluded) : 0,
        depositWashesCarryover: activateCarryover,
        depositMinBalance: activateMinBalance ? Number(activateMinBalance) : 0,
        depositBillingDay: activateBillingDay ? Math.min(31, Math.max(1, Number(activateBillingDay))) : 1,
        depositWashPrice: activateWashPrice ? Number(activateWashPrice) : 0,
      }),
    );
    setActivateClientId('');
    setActivateMonthly('');
    setActivateActive(false);
    setActivatePlan('fee');
    setActivateWashesIncluded('');
    setActivateCarryover(false);
    setActivateMinBalance('');
    setActivateBillingDay('1');
    setActivateWashPrice('');
  };

  const handleTopup = async () => {
    if (!selectedClientId || !amountDraft) return;
    await runAndRefresh(() =>
      depositTopUp(selectedClientId, Number(amountDraft), noteDraft, dateDraft),
    );
    setAmountDraft('');
    setNoteDraft('');
    setDateDraft('');
  };

  const handleAdjust = async () => {
    if (!selectedClientId || amountDraft === '') return;
    await runAndRefresh(() =>
      depositAdjust(selectedClientId, Number(amountDraft), noteDraft),
    );
    setAmountDraft('');
    setNoteDraft('');
  };

  const handleRecordWash = async () => {
    if (!selectedClientId) return;
    if (!washCar.trim() && !washPlate.trim()) {
      setError('Укажите марку авто или гос.номер');
      return;
    }
    if (!washPrice) {
      setError('Укажите стоимость мойки');
      return;
    }
    const selectedWorker = workerOptions.find((worker) => worker.id === washWorkerId);
    const input: DepositWashInput = {
      clientId: selectedClientId,
      car: washCar,
      plate: washPlate,
      plateType: washPlateType,
      price: Number(washPrice),
      date: dateDraft,
      time: washTime,
      service: washService,
      workerId: selectedWorker?.id,
      workerName: selectedWorker?.name,
      workerPercent: selectedWorker && selectedWorker.defaultPercent !== '' ? Number(selectedWorker.defaultPercent) : 0,
    };
    await runAndRefresh(() => depositRecordWash(input));
    setWashCar('');
    setWashPlate('');
    setWashPrice('');
    setWashWorkerId('');
    setWashService('');
    setWashTime('');
    setDateDraft('');
  };

  const handleSettle = async () => {
    if (!selectedClientId) return;
    await runAndRefresh(() => depositSettleMonth(selectedClientId, currentMonthKey()));
  };

  const handleExportOne = async () => {
    if (!selectedClientId) return;
    setError(null);
    setToast(null);
    try {
      const fileName = await downloadDepositExport(selectedClientId);
      try {
        const delivery = await sendDepositExport(selectedClientId);
        setToast(`${fileName} скачан и отправлен в Telegram: ${delivery.message}`);
      } catch (deliveryError) {
        const msg = deliveryError instanceof Error ? deliveryError.message : 'ошибка';
        setToast(`${fileName} скачан, но отправка в Telegram не удалась: ${msg}`);
      }
    } catch {
      try {
        const delivery = await sendDepositExport(selectedClientId);
        setToast(`Отправлено в Telegram: ${delivery.message}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка выгрузки');
      }
    }
  };

  const handleExportAll = async () => {
    setError(null);
    setToast(null);
    try {
      const fileName = await downloadDepositExportAll();
      try {
        const delivery = await sendDepositExportAll();
        setToast(`${fileName} скачан и отправлен в Telegram: ${delivery.message}`);
      } catch (deliveryError) {
        const msg = deliveryError instanceof Error ? deliveryError.message : 'ошибка';
        setToast(`${fileName} скачан, но отправка в Telegram не удалась: ${msg}`);
      }
    } catch {
      try {
        const delivery = await sendDepositExportAll();
        setToast(`Отправлено в Telegram: ${delivery.message}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка выгрузки');
      }
    }
  };

  const openActivateFor = (client: RegisteredClient | null) => {
    setActivateClientId(client?.id ?? '');
    setActivateActive(client ? !!client.depositActive : true);
    setActivateMonthly(client && client.depositMonthly ? String(client.depositMonthly) : '');
    setActivatePlan(client?.depositPlan || 'fee');
    setActivateWashesIncluded(client && client.depositWashesIncluded ? String(client.depositWashesIncluded) : '');
    setActivateCarryover(!!client?.depositWashesCarryover);
    setActivateMinBalance(client && client.depositMinBalance ? String(client.depositMinBalance) : '');
    setActivateBillingDay(client?.depositBillingDay ? String(client.depositBillingDay) : '1');
    setActivateWashPrice(client && client.depositWashPrice ? String(client.depositWashPrice) : '');
    setSheet('activate');
  };

  const openWashFor = (client: RegisteredClient | null) => {
    setWashCar(client?.car || '');
    setWashPlate(client?.plate || '');
    setWashPrice('');
    setWashWorkerId('');
    setWashService('');
    setWashTime('');
    setDateDraft('');
    setSheet('wash');
  };

  const openTopupFor = () => {
    setAmountDraft('');
    setNoteDraft('');
    setDateDraft('');
    setSheet('topup');
  };

  return (
    <motion.div key="s-deposit" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      <button onClick={onBack} className={`flex items-center gap-2 ${sub} mb-1 text-sm`}>
        <ArrowLeft size={16} strokeWidth={1.75} />
        Назад
      </button>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-semibold">Депозит</h2>
          <p className={`text-xs ${sub} mt-1`}>Абонентские клиенты · цех малярка</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white"
            style={{ background: primary }}
          >
            <Download size={14} strokeWidth={1.75} />
            Excel
          </button>
        </div>
      </div>

      {error && (
        <div className={`${glass} rounded-2xl p-3 mb-3 text-sm flex items-start gap-2`} style={{ color: danger }}>
          <AlertCircle size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {toast && (
        <div className="rounded-2xl p-3 mb-3 text-sm flex items-start gap-2" style={{ background: `${accent}18`, color: accent }}>
          <Check size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" />
          <span>{toast}</span>
        </div>
      )}

      {!selectedClientId ? (
        <>
          <button
            onClick={() => openActivateFor(null)}
            className={`${glass} rounded-2xl p-4 w-full mb-3 flex items-center justify-center gap-2 text-sm`}
            style={{ color: primary }}
          >
            <Plus size={16} strokeWidth={1.75} />
            Сделать клиента абонентом
          </button>

          {loading && summaries.length === 0 && (
            <div className={`${glass} rounded-2xl p-6 text-center text-sm ${sub}`}>Загрузка…</div>
          )}

          {!loading && summaries.length === 0 && (
            <div className={`${glass} rounded-2xl p-6 text-center`}>
              <Wallet size={36} strokeWidth={1.75} className={`mx-auto mb-2 ${sub}`} />
              <p className={`text-sm ${sub}`}>Пока нет абонентских клиентов</p>
            </div>
          )}

          {summaries.map((item) => (
            <motion.button
              key={item.clientId}
              whileTap={{ scale: 0.98 }}
              onClick={() => openClient(item.clientId)}
              className={`${glass} rounded-2xl p-4 w-full text-left mb-2 flex items-center gap-3`}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${primary}18` }}>
                <Wallet size={18} strokeWidth={1.75} style={{ color: primary }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.clientName}</div>
                <div className={`text-xs ${sub}`}>
                  {!item.active
                    ? 'Абонплата отключена'
                    : `${formatMoney(item.balance)} · ${formatMoney(item.depositMonthly)}/мес${item.planWashLimit > 0 ? ` · мойки ${item.monthWashCount}/${item.planWashLimit}` : ''}`}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {item.needsTopUp && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg font-medium" style={{ background: '#F59E0B22', color: '#F59E0B' }}>
                      низкий баланс
                    </span>
                  )}
                  {item.monthPending && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg font-medium" style={{ background: `${primary}18`, color: primary }}>
                      месяц не закрыт
                    </span>
                  )}
                  {!item.active && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg font-medium" style={{ background: 'rgba(128,128,128,0.18)', color: sub }}>
                      отключён
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} strokeWidth={1.75} className={sub} />
            </motion.button>
          ))}
        </>
      ) : (
        <>
          <button
            onClick={() => { setSelectedClientId(null); setOverview(null); }}
            className={`flex items-center gap-2 ${sub} mb-3 text-sm`}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            К списку абонентов
          </button>

          {overview && (
            <div className={`${glass} rounded-2xl p-4 mb-3`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{selectedClient?.name}</div>
                  <div className={`text-xs ${sub}`}>
                    {selectedClient?.phone}
                    {selectedClient?.plate ? ` · ${selectedClient.plate}` : ''}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-lg font-medium" style={{ background: `${primary}18`, color: primary }}>
                      {planLabel(overview.depositPlan)}
                    </span>
                    {overview.depositActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-lg font-medium" style={{ background: `${accent}18`, color: accent }}>
                        абонент
                      </span>
                    )}
                    {overview.stats.monthsActive > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-lg font-medium" style={{ background: 'rgba(128,128,128,0.18)', color: sub }}>
                        {overview.stats.monthsActive} мес
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-xs ${sub}`}>Баланс депозита</div>
                  <div className={`text-lg font-semibold ${overview.balance < 0 ? 'text-red-500' : ''}`}>{formatMoney(overview.balance)}</div>
                  {overview.depositMinBalance > 0 && (
                    <div className={`text-[10px] ${overview.needsTopUp ? 'text-[#F59E0B]' : sub}`}>
                      порог {formatMoney(overview.depositMinBalance)}
                    </div>
                  )}
                </div>
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-xs ${sub}`}>Мойки · {overview.monthLabel}</div>
                  <div className={`text-lg font-semibold ${overview.monthWashTotal > 0 ? '' : sub}`}>{formatMoney(overview.monthWashTotal)}</div>
                  <div className={`text-[10px] ${sub}`}>
                    {overview.monthWashCount} шт{overview.planWashLimit > 0 ? ` / лимит ${overview.planWashLimit}` : ''}
                  </div>
                </div>
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-xs ${sub}`}>Абонплата / мес</div>
                  <div className="text-sm font-semibold">{formatMoney(overview.monthSubscription)}</div>
                  <div className={`text-[10px] ${sub}`}>день {overview.depositBillingDay}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-xs ${sub}`}>К оплате за месяц</div>
                  <div className={`text-sm font-semibold ${overview.monthPayable < 0 ? 'text-red-500' : ''}`}>{formatMoney(overview.monthPayable)}</div>
                  {overview.planWashLimit > 0 && (
                    <div className={`text-[10px] ${overview.washesLeft > 0 ? sub : 'text-[#F59E0B]'}`}>
                      {overview.washesLeft > 0 ? `осталось ${overview.washesLeft} моек` : 'лимит исчерпан'}
                    </div>
                  )}
                </div>
              </div>

              {overview.transactions.length > 0 && (
                <div className={`rounded-xl p-2 mb-2`} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-[10px] ${sub} mb-1`}>Баланс по операциям</div>
                  <BalanceSparkline overview={overview} color={primary} />
                </div>
              )}

              {overview.needsTopUp && (
                <div className="rounded-xl p-3 mb-2 text-xs flex items-start gap-2" style={{ background: '#F59E0B18', color: '#F59E0B' }}>
                  <AlertTriangle size={14} strokeWidth={1.75} className="shrink-0 mt-0.5" />
                  Баланс ниже порога  -  рекомендуется пополнить депозит
                </div>
              )}

              {overview.monthPending && (
                <div className="rounded-xl p-3 mb-2 text-xs flex items-start gap-2" style={{ background: `${primary}14`, color: primary }}>
                  <CalendarDays size={14} strokeWidth={1.75} className="shrink-0 mt-0.5" />
                  Месяц {overview.monthLabel} ещё не закрыт  -  после окончания расчётов нажмите «Закрыть месяц»
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={openTopupFor}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white"
                  style={{ background: primary }}
                >
                  <Plus size={14} strokeWidth={1.75} />
                  Пополнить
                </button>
                <button
                  onClick={() => openWashFor(selectedClient)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white"
                  style={{ background: accent }}
                >
                  <Plus size={14} strokeWidth={1.75} />
                  Записать мойку
                </button>
                <button
                  onClick={() => { setAmountDraft(''); setNoteDraft(''); setSheet('adjust'); }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Settings size={14} strokeWidth={1.75} />
                  Коррекция
                </button>
                <button
                  onClick={() => openActivateFor(selectedClient)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Settings size={14} strokeWidth={1.75} />
                  Настройки
                </button>
                <button
                  onClick={handleSettle}
                  disabled={!overview.monthPending}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm disabled:opacity-40"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Check size={14} strokeWidth={1.75} />
                  Закрыть {overview.monthLabel}
                </button>
                <button
                  onClick={handleExportOne}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Send size={14} strokeWidth={1.75} />
                  Excel
                </button>
              </div>
            </div>
          )}

          {overview && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-[10px] ${sub}`}>Пополнено всего</div>
                  <div className="text-sm font-semibold">+{formatMoney(overview.stats.totalTopUps)}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-[10px] ${sub}`}>Мойки всего</div>
                  <div className="text-sm font-semibold">{overview.stats.totalWashCount} шт</div>
                  <div className={`text-[10px] ${sub}`}>{formatMoney(overview.stats.totalWashDebits)}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-[10px] ${sub}`}>Средний чек</div>
                  <div className="text-sm font-semibold">{formatMoney(overview.stats.avgWashPrice)}</div>
                </div>
              </div>

              {overview.monthRows.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-sm font-medium mb-2">По месяцам</h3>
                  <div className={`${glass} rounded-2xl overflow-hidden`}>
                    {overview.monthRows.map((row) => (
                      <div key={row.month} className="p-3 flex items-center gap-3 border-b border-white/5 last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium flex items-center gap-1.5">
                            {monthKeyToLabel(row.month)}
                            {row.closed && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: `${accent}18`, color: accent }}>
                                закрыт
                              </span>
                            )}
                          </div>
                          <div className={`text-xs ${sub}`}>
                            {row.washCount} моек · {formatMoney(row.washTotal)}
                            {row.washLimit > 0 ? ` · лимит ${row.washLimit}` : ''}
                            {row.carriedWashes > 0 ? ` · перенос ${row.carriedWashes}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-medium">{formatMoney(row.balanceAfter)}</div>
                          <div className={`text-[10px] ${sub}`}>+{formatMoney(row.topUp)} пополнено</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-3">
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <h3 className="text-sm font-medium">Движения</h3>
                  <div className="flex items-center gap-2">
                    <select
                      className={selectCls}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: 11 }}
                      value={txnMonthFilter}
                      onChange={(event) => setTxnMonthFilter(event.target.value)}
                    >
                      <option value="">Все месяцы</option>
                      {monthOptions.map((month) => (
                        <option key={month} value={month}>{monthKeyToLabel(month)}</option>
                      ))}
                    </select>
                    <select
                      className={selectCls}
                      style={{ width: 'auto', padding: '4px 8px', fontSize: 11 }}
                      value={txnTypeFilter}
                      onChange={(event) => setTxnTypeFilter(event.target.value)}
                    >
                      {TXN_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={`${glass} rounded-2xl overflow-hidden`}>
                  {filteredTxns.length === 0 && (
                    <div className={`p-4 text-sm text-center ${sub}`}>Нет движений по фильтру</div>
                  )}
                  {filteredTxns.map((txn) => (
                    <div key={txn.id} className="p-3 flex items-center gap-3 border-b border-white/5 last:border-b-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: txn.amount >= 0 ? `${accent}18` : `${danger}18` }}
                      >
                        {txn.amount >= 0 ? (
                          <ArrowUp size={14} strokeWidth={1.75} style={{ color: accent }} />
                        ) : (
                          <ArrowDown size={14} strokeWidth={1.75} style={{ color: danger }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{txn.description}</div>
                        <div className={`text-xs ${sub}`}>
                          {txn.date}
                          {txn.bookingId ? ' · мойка' : ''}
                          {(txn.car || txn.plate) ? ` · ${[txn.car, txn.plate].filter(Boolean).join(' ')}` : ''}
                          {TXN_TYPE_OPTIONS.find((option) => option.value === txn.transaction_type)?.label ? ` · ${TXN_TYPE_OPTIONS.find((option) => option.value === txn.transaction_type)?.label}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-medium ${txn.amount >= 0 ? '' : 'text-red-500'}`}>
                          {txn.amount >= 0 ? '+' : ''}{formatMoney(txn.amount)}
                        </div>
                        <div className={`text-xs ${sub}`}>баланс {formatMoney(txn.balance_after)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {overview.closedMonths.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-sm font-medium mb-2">Закрытые месяцы</h3>
                  <div className={`${glass} rounded-2xl overflow-hidden`}>
                    {overview.closedMonths.map((closed) => (
                      <div key={closed.id} className="p-3 flex items-center gap-3 border-b border-white/5 last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{monthKeyToLabel(closed.month)}</div>
                          <div className={`text-xs ${sub}`}>
                            Мойки {formatMoney(closed.washTotal)} · абонплата {formatMoney(closed.subscription)}
                            {closed.carryoverWashes ? ` · перенос ${closed.carryoverWashes} моек` : ''}
                          </div>
                        </div>
                        <div className="text-sm">{formatMoney(closed.balanceAfter)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <AnimatePresence>
        {sheet === 'activate' && (
          <Sheet title={activateClientId ? 'Настройки абонента' : 'Сделать клиента абонентом'} isDark={isDark} onClose={() => setSheet(null)}>
            {!activateClientId && (
              <div className="mb-3">
                {fieldLabel('Клиент')}
                <select className={selectCls} value={activateClientId} onChange={(event) => setActivateClientId(event.target.value)}>
                  <option value="">Выберите клиента…</option>
                  {eligibleClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} · {client.phone || client.plate || 'без номера'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-3">
              {fieldLabel('Тип абонемента')}
              <div className="grid grid-cols-2 gap-1.5">
                {PLAN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActivatePlan(option.value)}
                    className={`rounded-xl px-3 py-2 text-left text-xs ${activatePlan === option.value ? 'text-white font-medium' : ''}`}
                    style={activatePlan === option.value ? { background: primary } : { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="opacity-70 mt-0.5 leading-tight">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {activatePlan !== 'per_wash' && (
              <div className="mb-3">
                {fieldLabel('Абонентская плата в месяц (₽)')}
                <input
                  className={inputCls}
                  type="number"
                  placeholder="Например: 4000"
                  value={activateMonthly}
                  onChange={(event) => setActivateMonthly(event.target.value)}
                />
              </div>
            )}

            {activatePlan === 'washes' && (
              <div className="mb-3">
                {fieldLabel('Моек включено в месяц')}
                <input
                  className={inputCls}
                  type="number"
                  placeholder="Например: 8"
                  value={activateWashesIncluded}
                  onChange={(event) => setActivateWashesIncluded(event.target.value)}
                />
              </div>
            )}

            {(activatePlan === 'washes' || activatePlan === 'per_wash') && (
              <div className="mb-3">
                {fieldLabel(activatePlan === 'per_wash' ? 'Цена за мойку (₽)' : 'Цена за мойку сверх лимита (₽, необязательно)')}
                <input
                  className={inputCls}
                  type="number"
                  placeholder={activatePlan === 'per_wash' ? 'Например: 600' : 'Пусто  -  по факту цены мойки'}
                  value={activateWashPrice}
                  onChange={(event) => setActivateWashPrice(event.target.value)}
                />
              </div>
            )}

            {activatePlan === 'washes' && (
              <label className="flex items-center gap-2 text-sm mb-3">
                <input
                  type="checkbox"
                  checked={activateCarryover}
                  onChange={(event) => setActivateCarryover(event.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                Переносить неиспользованные мойки на следующий месяц
              </label>
            )}

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="min-w-0">
                {fieldLabel('Порог низкого баланса (₽)')}
                <input
                  className={inputCls}
                  type="number"
                  placeholder="0  -  выключено"
                  value={activateMinBalance}
                  onChange={(event) => setActivateMinBalance(event.target.value)}
                />
              </div>
              <div className="min-w-0">
                {fieldLabel('День расчёта месяца (1 - 31)')}
                <input
                  className={inputCls}
                  type="number"
                  placeholder="1"
                  min={1}
                  max={31}
                  value={activateBillingDay}
                  onChange={(event) => setActivateBillingDay(event.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm mb-4">
              <input
                type="checkbox"
                checked={activateActive}
                onChange={(event) => setActivateActive(event.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              Абонентская подписка активна
            </label>
            <button
              onClick={handleActivate}
              disabled={!activateClientId}
              className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40"
              style={{ background: primary }}
            >
              Сохранить
            </button>
          </Sheet>
        )}

        {sheet === 'topup' && (
          <Sheet title="Пополнение депозита" isDark={isDark} onClose={() => setSheet(null)}>
            {fieldLabel('Сумма пополнения (₽)')}
            <input
              className={inputCls}
              type="number"
              placeholder="Например: 4000"
              value={amountDraft}
              onChange={(event) => setAmountDraft(event.target.value)}
            />
            <div className="mt-3">
              {fieldLabel('Дата (ДД.ММ.ГГГГ, пусто  -  сегодня)')}
              <input
                className={inputCls}
                placeholder="сегодня"
                value={dateDraft}
                onChange={(event) => setDateDraft(event.target.value)}
              />
            </div>
            <div className="mt-3">
              {fieldLabel('Комментарий')}
              <input
                className={inputCls}
                placeholder="Оплата за месяц"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
            </div>
            <button
              onClick={handleTopup}
              disabled={!amountDraft}
              className="w-full py-3 rounded-xl text-white text-sm font-medium mt-4 disabled:opacity-40"
              style={{ background: primary }}
            >
              Пополнить
            </button>
          </Sheet>
        )}

        {sheet === 'adjust' && (
          <Sheet title="Корректировка баланса" isDark={isDark} onClose={() => setSheet(null)}>
            {fieldLabel('Сумма (может быть отрицательной, ₽)')}
            <input
              className={inputCls}
              type="number"
              placeholder="Например: -500"
              value={amountDraft}
              onChange={(event) => setAmountDraft(event.target.value)}
            />
            <div className="mt-3">
              {fieldLabel('Комментарий')}
              <input
                className={inputCls}
                placeholder="Причина корректировки"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
              />
            </div>
            <button
              onClick={handleAdjust}
              disabled={amountDraft === ''}
              className="w-full py-3 rounded-xl text-white text-sm font-medium mt-4 disabled:opacity-40"
              style={{ background: primary }}
            >
              Применить
            </button>
          </Sheet>
        )}

        {sheet === 'wash' && (
          <Sheet title="Записать мойку в долг" isDark={isDark} onClose={() => setSheet(null)}>
            {overview && overview.depositPlan === 'washes' && (
              <div className="rounded-xl p-3 mb-3 text-xs flex items-start gap-2" style={{ background: `${primary}14`, color: primary }}>
                <Wallet size={14} strokeWidth={1.75} className="shrink-0 mt-0.5" />
                <span>
                  Абонемент: использовано {overview.monthWashCount} из {overview.planWashLimit} моек
                  {overview.washesLeft > 0
                    ? ` · осталось ${overview.washesLeft}`
                    : ' · лимит исчерпан  -  мойка будет оплачена сверх абонемента'}
                </span>
              </div>
            )}
            {overview && overview.depositPlan === 'per_wash' && overview.depositWashPrice > 0 && (
              <div className="rounded-xl p-3 mb-3 text-xs flex items-start gap-2" style={{ background: `${primary}14`, color: primary }}>
                <Wallet size={14} strokeWidth={1.75} className="shrink-0 mt-0.5" />
                <span>Тариф «оплата за мойку»: {formatMoney(overview.depositWashPrice)} за мойку</span>
              </div>
            )}
            <div className="mb-3">
              {fieldLabel('Марка авто')}
              <input
                className={inputCls}
                placeholder="Например: Toyota Camry"
                value={washCar}
                onChange={(event) => setWashCar(event.target.value)}
              />
            </div>
            <div className="mb-3">
              {fieldLabel('Номер автомобиля')}
              <div className="mb-2 flex gap-1.5">
                {(['russian', 'motorcycle', 'foreign'] as PlateType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`text-[10px] px-2 py-1 rounded-lg ${washPlateType === t ? 'text-white font-medium' : `${sub}`}`}
                    style={washPlateType === t ? { background: primary } : { background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                    onClick={() => { setWashPlateType(t); setWashPlate(''); }}
                  >
                    {t === 'russian' ? 'Авто' : t === 'motorcycle' ? 'Мото' : 'Ино'}
                  </button>
                ))}
              </div>
              <input
                className={inputCls}
                placeholder={washPlateType === 'russian' ? 'а123вс777' : washPlateType === 'motorcycle' ? '1234ав77' : 'xyz1234'}
                maxLength={washPlateType === 'foreign' ? 15 : 9}
                value={washPlate}
                onChange={(event) => setWashPlate(normalizePlateInput(event.target.value, washPlateType))}
              />
            </div>
            <div className="mb-3">
              {fieldLabel('Цена мойки (₽)')}
              <input
                className={inputCls}
                type="number"
                placeholder="Например: 700"
                value={washPrice}
                onChange={(event) => setWashPrice(event.target.value)}
              />
            </div>
            <div className="mb-3">
              {fieldLabel('Мойщик')}
              <select
                className={selectCls}
                value={washWorkerId}
                onChange={(event) => setWashWorkerId(event.target.value)}
              >
                <option value="">Без мастера</option>
                {workerOptions.map((worker) => (
                  <option key={worker.id} value={worker.id}>{worker.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              {fieldLabel('Услуга (необязательно)')}
              <input
                className={inputCls}
                placeholder="Например: Кузов мойка"
                value={washService}
                onChange={(event) => setWashService(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-1">
              <div className="min-w-0">
                {fieldLabel('Дата (пусто  -  сегодня)')}
                <input
                  className={inputCls}
                  type="date"
                  value={toISODate(dateDraft)}
                  onChange={(event) => {
                    const val = parseFlexibleDate(event.target.value);
                    setDateDraft(val ? formatDate(val) : '');
                  }}
                />
              </div>
              <div className="min-w-0">
                {fieldLabel('Время')}
                <select
                  className={selectCls}
                  value={washTime}
                  onChange={(event) => setWashTime(event.target.value)}
                >
                  <option value="">--:--</option>
                  {TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </div>
            </div>
            <p className={`text-xs ${sub} mb-4`}>Сумма мойки спишется с депозита, в копилку вернётся при закрытии месяца.</p>
            <button
              onClick={handleRecordWash}
              className="w-full py-3 rounded-xl text-white text-sm font-medium"
              style={{ background: accent }}
            >
              Записать мойку
            </button>
          </Sheet>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
