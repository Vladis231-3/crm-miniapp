import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle, ArrowDown, ArrowLeft, ArrowUp, Check, ChevronRight,
  Download, Plus, Settings, Wallet, X,
} from 'lucide-react';
import {
  useApp,
  type DepositOverview,
  type DepositSummaryItem,
  type DepositWashInput,
  type RegisteredClient,
} from '../../context/AppContext';
import { formatDate } from '../../utils/date';

interface DepositPanelProps {
  onBack: () => void;
}

const MONTH_LABELS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

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

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

function fieldLabel(label: string) {
  return <label className="text-xs font-medium block mb-1">{label}</label>;
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
        style={{ background: isDark ? '#0E1624' : '#ffffff' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">{title}</h3>
          <button onClick={onClose} className="p-1">
            <X size={18} className="opacity-60" />
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
  } = useApp();

  const glass = isDark ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm';
  const sub = isDark ? 'text-[#9AA6B2]' : 'text-[#6B7280]';
  const primary = isDark ? '#4AA8FF' : '#0A84FF';
  const accent = isDark ? '#5DD68F' : '#34C759';
  const danger = '#EF4444';
  const inputCls = `${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-white border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const selectCls = `${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8]' : 'bg-white border-black/10 text-[#0B1226]'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;

  const [summaries, setSummaries] = useState<DepositSummaryItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [overview, setOverview] = useState<DepositOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | 'activate' | 'topup' | 'adjust' | 'wash'>(null);

  const [activateClientId, setActivateClientId] = useState('');
  const [activateActive, setActivateActive] = useState(false);
  const [activateMonthly, setActivateMonthly] = useState('');

  const [amountDraft, setAmountDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [dateDraft, setDateDraft] = useState('');

  const [washCar, setWashCar] = useState('');
  const [washPlate, setWashPlate] = useState('');
  const [washPlateType, setWashPlateType] = useState('russian');
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

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((client) => client.id === selectedClientId) ?? null;
  }, [clients, selectedClientId]);

  const workerOptions = useMemo(() => workers.filter((worker) => worker.role !== 'accountant'), [workers]);

  const eligibleClients = useMemo(() => clients.filter((client) => !client.depositActive), [clients]);

  const openClient = async (clientId: string) => {
    setSelectedClientId(clientId);
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
      }),
    );
    setActivateClientId('');
    setActivateMonthly('');
    setActivateActive(false);
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
    try {
      await downloadDepositExport(selectedClientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка выгрузки');
    }
  };

  const handleExportAll = async () => {
    setError(null);
    try {
      await downloadDepositExportAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка выгрузки');
    }
  };

  const openActivateFor = (client: RegisteredClient | null) => {
    setActivateClientId(client?.id ?? '');
    setActivateActive(client ? !!client.depositActive : true);
    setActivateMonthly(client && client.depositMonthly ? String(client.depositMonthly) : '');
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

  const txnRows = useMemo(() => {
    if (!overview) return [];
    return overview.transactions;
  }, [overview]);

  return (
    <motion.div key="s-deposit" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      <button onClick={onBack} className={`flex items-center gap-2 ${sub} mb-1 text-sm`}>
        <ArrowLeft size={16} />
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
            <Download size={14} />
            Excel
          </button>
        </div>
      </div>

      {error && (
        <div className={`${glass} rounded-2xl p-3 mb-3 text-sm flex items-start gap-2`} style={{ color: danger }}>
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!selectedClientId ? (
        <>
          <button
            onClick={() => openActivateFor(null)}
            className={`${glass} rounded-2xl p-4 w-full mb-3 flex items-center justify-center gap-2 text-sm`}
            style={{ color: primary }}
          >
            <Plus size={16} />
            Сделать клиента абонентом
          </button>

          {loading && summaries.length === 0 && (
            <div className={`${glass} rounded-2xl p-6 text-center text-sm ${sub}`}>Загрузка…</div>
          )}

          {!loading && summaries.length === 0 && (
            <div className={`${glass} rounded-2xl p-6 text-center`}>
              <Wallet size={36} className={`mx-auto mb-2 ${sub}`} />
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
                <Wallet size={18} style={{ color: primary }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.clientName}</div>
                <div className={`text-xs ${sub}`}>
                  {!item.active ? 'Абонплата отключена' : `${formatMoney(item.balance)}${item.depositMonthly > 0 ? ` · ${formatMoney(item.depositMonthly)}/мес` : ''}`}
                </div>
              </div>
              <ChevronRight size={16} className={sub} />
            </motion.button>
          ))}
        </>
      ) : (
        <>
          <button
            onClick={() => { setSelectedClientId(null); setOverview(null); }}
            className={`flex items-center gap-2 ${sub} mb-3 text-sm`}
          >
            <ArrowLeft size={16} />
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
                </div>
                {overview.depositActive && (
                  <span className="text-xs px-2 py-1 rounded-lg shrink-0" style={{ background: `${accent}18`, color: accent }}>
                    абонент
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-xs ${sub}`}>Баланс депозита</div>
                  <div className={`text-lg font-semibold ${overview.balance < 0 ? 'text-red-500' : ''}`}>{formatMoney(overview.balance)}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-xs ${sub}`}>Мойки · {overview.monthLabel}</div>
                  <div className={`text-lg font-semibold ${overview.monthWashTotal > 0 ? '' : sub}`}>{formatMoney(overview.monthWashTotal)}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-xs ${sub}`}>Абонплата / мес</div>
                  <div className="text-sm font-semibold">{formatMoney(overview.monthSubscription)}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className={`text-xs ${sub}`}>К оплате за месяц</div>
                  <div className={`text-sm font-semibold ${overview.monthPayable < 0 ? 'text-red-500' : ''}`}>{formatMoney(overview.monthPayable)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={openTopupFor}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white"
                  style={{ background: primary }}
                >
                  <Plus size={14} />
                  Пополнить
                </button>
                <button
                  onClick={() => openWashFor(selectedClient)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white"
                  style={{ background: accent }}
                >
                  <Plus size={14} />
                  Записать мойку
                </button>
                <button
                  onClick={() => { setAmountDraft(''); setNoteDraft(''); setSheet('adjust'); }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Settings size={14} />
                  Коррекция
                </button>
                <button
                  onClick={() => openActivateFor(selectedClient)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Settings size={14} />
                  Настройки
                </button>
                <button
                  onClick={handleSettle}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Check size={14} />
                  Закрыть {overview.monthLabel}
                </button>
                <button
                  onClick={handleExportOne}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Download size={14} />
                  Excel
                </button>
              </div>
            </div>
          )}

          {overview && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Движения</h3>
                {txnRows.length > 0 && <span className={`text-xs ${sub}`}>{txnRows.length} операций</span>}
              </div>
              <div className={`${glass} rounded-2xl overflow-hidden`}>
                {txnRows.length === 0 && (
                  <div className={`p-4 text-sm text-center ${sub}`}>Нет движений за этот месяц</div>
                )}
                {txnRows.map((txn) => (
                  <div key={txn.id} className="p-3 flex items-center gap-3 border-b border-white/5 last:border-b-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: txn.amount >= 0 ? `${accent}18` : `${danger}18` }}
                    >
                      {txn.amount >= 0 ? (
                        <ArrowUp size={14} style={{ color: accent }} />
                      ) : (
                        <ArrowDown size={14} style={{ color: danger }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{txn.description}</div>
                      <div className={`text-xs ${sub}`}>
                        {formatDate(new Date(txn.date))}
                        {txn.bookingId ? ' · мойка' : ''}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${txn.amount >= 0 ? '' : 'text-red-500'}`}>
                      {txn.amount >= 0 ? '+' : ''}{formatMoney(txn.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {overview && overview.closedMonths.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-medium mb-2">Закрытые месяцы</h3>
              <div className={`${glass} rounded-2xl overflow-hidden`}>
                {overview.closedMonths.map((closed) => (
                  <div key={closed.id} className="p-3 flex items-center gap-3 border-b border-white/5 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{monthKeyToLabel(closed.month)}</div>
                      <div className={`text-xs ${sub}`}>
                        Мойки {formatMoney(closed.washTotal)} · абонплата {formatMoney(closed.subscription)}
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
              {fieldLabel('Абонентская плата в месяц (₽)')}
              <input
                className={inputCls}
                type="number"
                placeholder="Например: 4000"
                value={activateMonthly}
                onChange={(event) => setActivateMonthly(event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm mb-4">
              <input
                type="checkbox"
                checked={activateActive}
                onChange={(event) => setActivateActive(event.target.checked)}
                className="w-4 h-4 accent-blue-500"
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
              {fieldLabel('Дата (ДД.ММ.ГГГГ, пусто — сегодня)')}
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
              <div className="flex gap-2">
                <input
                  className={`${inputCls} flex-1 min-w-0`}
                  placeholder="Например: а123вс777"
                  value={washPlate}
                  onChange={(event) => setWashPlate(event.target.value)}
                />
                <select
                  className={`${selectCls} w-24 shrink-0`}
                  value={washPlateType}
                  onChange={(event) => setWashPlateType(event.target.value)}
                >
                  <option value="russian">RU</option>
                  <option value="foreign">EU</option>
                </select>
              </div>
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
            <div className="flex gap-2 mb-1">
              <div className="flex-1 min-w-0">
                {fieldLabel('Дата (пусто — сегодня)')}
                <input
                  className={inputCls}
                  placeholder="ДД.ММ.ГГГГ"
                  value={dateDraft}
                  onChange={(event) => setDateDraft(event.target.value)}
                />
              </div>
              <div className="flex-1 min-w-0">
                {fieldLabel('Время')}
                <input
                  className={inputCls}
                  placeholder="Например: 14:00"
                  value={washTime}
                  onChange={(event) => setWashTime(event.target.value)}
                />
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
