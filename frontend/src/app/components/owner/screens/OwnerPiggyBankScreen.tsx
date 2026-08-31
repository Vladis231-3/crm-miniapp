import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Download, Edit3, Minus, RefreshCw, X } from 'lucide-react';
import { useApp, type Booking } from '../../../context/AppContext';
import { toast } from '../../atmosfera';

type PiggyTab = 'all' | 'wash' | 'detailing';

/** Структурные копии локальных интерфейсов родителя (OwnerApp.tsx:229-253, 773-781). */
interface PiggyBankTx {
  id: string; bookingId: string | null; amount: number; transactionType: string;
  purpose: string; materialName: string | null; materialCost: number | null;
  date: string; resourceGroup: string; createdAt: string; bookingInfo: string | null;
  spentById?: string | null; spentByName?: string | null;
}
interface PiggyWashBreakdown {
  selfServiceRevenue: number; selfServiceMaster: number; selfServicePiggy: number;
  classicRevenue: number; classicMaster: number; classicPiggy: number;
  totalRevenue: number; totalMaster: number; totalPiggy: number;
}
interface PiggyDetailingBreakdown {
  detailingRevenue: number; detailingMaster: number;
  deposits24Percent: number; materialWithdrawals: number;
  materialRepayments: number; netPiggy: number;
}
interface PiggySpenderDebt {
  spentById: string | null; spentByName: string; totalSpent: number; count: number;
}
interface PiggyBankScreenData {
  balance: number;
  transactions: PiggyBankTx[];
  wash?: PiggyWashBreakdown;
  detailing?: PiggyDetailingBreakdown;
  masterDailyOutputs: number;
  washExpenses: number;
  washIncomes: number;
  detailingExpenses: number;
  detailingIncomes: number;
  remainingInPiggyBank: number;
  combinedBalance: number;
  archives?: Array<{ id: number }>;
  spenderDebts?: PiggySpenderDebt[];
}

interface ArchiveHighlightShape {
  target: 'worker' | 'owner' | 'piggy' | 'income' | 'expense';
  workerId?: string; ownerId?: string; txId?: string; incomeId?: string; expenseId?: string;
}

/**
 * OwnerPiggyBankScreen — вырезка из OwnerApp (§6.4, Фаза 5 / вырезка №4).
 * Копилка: баланс по табам Всё/Мойка/Детейлинг, мини-сводки (90%+60% / 24%),
 * снятие на материалы/прочее, корректировка, история операций с running-balance,
 * кто брал из копилки. Единая кнопка «Снять на расходы» (копилка или свои деньги).
 * Данные, формы withdraw/adjust и экспорт остаются в родителе (кросснав
 * gotoPiggyBank из архива/money-flow, piggyBankBalance читают отчёты и
 * finance-panel) и приходят props.
 */
export function OwnerPiggyBankScreen({
  piggyBank,
  piggyBankBalance,
  piggyBankTxs,
  piggyBankLoading,
  piggyTab,
  setPiggyTab,
  piggyTxExpanded,
  setPiggyTxExpanded,
  dateFrom,
  onClearDates,
  onReload,
  onExport,
  exportingKind,
  onOpenAdjust,
  onOpenWithdraw,
  onOpenArchives,
  archiveHighlight,
  highlightId,
  onSelectBooking,
  primary,
  glass,
  sub,
  isDark,
}: {
  piggyBank: PiggyBankScreenData | null;
  piggyBankBalance: number;
  piggyBankTxs: PiggyBankTx[];
  piggyBankLoading: boolean;
  piggyTab: PiggyTab;
  setPiggyTab: (tab: PiggyTab) => void;
  piggyTxExpanded: boolean;
  setPiggyTxExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  dateFrom: string;
  onClearDates: () => void;
  onReload: () => void;
  onExport: () => void;
  exportingKind: string | null;
  onOpenAdjust: (resourceGroup: 'wash' | 'detailing') => void;
  onOpenWithdraw: () => void;
  onOpenArchives: () => void;
  archiveHighlight: ArchiveHighlightShape | null;
  highlightId: (h: ArchiveHighlightShape) => string | undefined;
  onSelectBooking: (booking: Booking) => void;
  primary: string;
  glass: string;
  sub: string;
  isDark: boolean;
}) {
  const { bookings } = useApp();
  const [selectedDebt, setSelectedDebt] = useState<PiggySpenderDebt | null>(null);

  const ownerStatusBadge = (status: string) => ({
    new: 'bg-indigo-500/15 text-indigo-600',
    confirmed: 'bg-cyan-500/15 text-cyan-600',
    scheduled: 'bg-blue-500/15 text-blue-600',
    in_progress: 'bg-yellow-500/15 text-yellow-600',
    completed: 'bg-green-500/15 text-green-600',
    no_show: 'bg-orange-500/15 text-orange-600',
    admin_review: 'bg-amber-500/15 text-amber-600',
    cancelled: 'bg-red-500/15 text-red-500',
  }[status] || 'bg-slate-500/15 text-slate-600');

  return (
    <motion.div key="piggy-bank" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Копилка</h2>
          {dateFrom && (
            <button onClick={onClearDates}
              className="text-xs font-medium px-2.5 py-1 rounded-xl shrink-0" style={{ background: `${primary}20`, color: primary }}>
              За весь период
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onExport} disabled={exportingKind !== null} title="Excel-отчёт по копилке"
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs text-white disabled:opacity-60" style={{ background: 'var(--status-success)' }}>
            <Download size={14} strokeWidth={1.75} aria-hidden />{exportingKind === 'piggy-bank' ? '...' : 'Excel'}
          </button>
          <button onClick={onReload} disabled={piggyBankLoading} className={`p-2 rounded-xl ${glass}`}>
            <RefreshCw size={16} strokeWidth={1.75} aria-hidden className={piggyBankLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!piggyBank ? (
        piggyBankLoading ? (
          <div className="text-center py-12">
            <div className={`text-sm ${sub}`}>Загрузка...</div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className={`text-sm ${sub} mb-3`}>Не удалось загрузить данные</div>
            <button onClick={onReload} className={`px-4 py-2 rounded-xl text-sm font-medium`} style={{ background: `${primary}20`, color: primary }}>
              Повторить
            </button>
          </div>
        )
      ) : (
      <>
      {/* Balance card */}
      {(function() {
        const tabBalance = piggyTab === 'all' ? (piggyBank?.combinedBalance ?? piggyBankBalance)
          : piggyTab === 'wash' ? (piggyBank?.remainingInPiggyBank ?? 0)
          : (piggyBank?.detailing?.netPiggy ?? 0);
        const tabLabel = piggyTab === 'all' ? 'Баланс копилки'
          : piggyTab === 'wash' ? 'Баланс · Мойка'
          : 'Баланс · Детейлинг';
        return (
        <div className={`${glass} rounded-2xl p-5 mb-4 text-center`}>
          <div className={`text-xs ${sub} mb-1 flex items-center justify-center gap-2`}>
            {tabLabel}
            {piggyTab !== 'all' && (
              <button onClick={() => onOpenAdjust(piggyTab)} className="p-1 rounded-lg hover:brightness-125 transition active:scale-95"
                style={{ background: `${primary}20`, color: primary }} title="Изменить сумму">
                <Edit3 size={12} strokeWidth={1.75} aria-hidden />
              </button>
            )}
          </div>
          <div className="font-bold text-3xl tabular-nums" style={{ color: tabBalance >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
            {tabBalance.toLocaleString('ru')} ₽
          </div>
        </div>
        );
      })()}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
        {[
          { id: 'all' as const, label: 'Всё' },
          { id: 'wash' as const, label: '🚗 Мойка' },
          { id: 'detailing' as const, label: '✨ Детейлинг' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setPiggyTab(tab.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${piggyTab === tab.id ? 'bg-white/10 text-white' : sub}`}
            style={piggyTab === tab.id ? { background: `${primary}20`, color: primary } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: ALL ── */}
      {piggyTab === 'all' && (
        <>

      {/* Wash mini */}
      {piggyBank?.wash && (() => {
        const rem = piggyBank.remainingInPiggyBank ?? 0;
        return (
        <div className={`${glass} rounded-2xl p-4 mb-4`}>
          <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>🚗 Мойка</div>
          <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <span className={sub}>Выручка</span><span className="font-semibold tabular-nums">{piggyBank.wash.totalRevenue.toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <span className={sub}>ЗП мастеров</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{piggyBank.wash.totalMaster.toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <span className={sub}>В копилку (90%+60%)</span><span className="tabular-nums" style={{ color: 'var(--status-success)' }}>+{piggyBank.wash.totalPiggy.toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <span className={sub}>Выход мастеров</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{(piggyBank.masterDailyOutputs ?? 0).toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm font-semibold">
            <span>Остаток</span>
            <span className="tabular-nums" style={{ color: rem >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{rem.toLocaleString('ru')} ₽</span>
          </div>
        </div>
        );
      })()}

          {/* Detailing mini */}
          {piggyBank?.detailing && (
            <div className={`${glass} rounded-2xl p-4 mb-4`}>
              <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>✨ Детейлинг</div>
              <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                <span className={sub}>Выручка</span><span className="font-semibold tabular-nums">{piggyBank.detailing.detailingRevenue.toLocaleString('ru')} ₽</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                <span className={sub}>ЗП мастеров</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{piggyBank.detailing.detailingMaster.toLocaleString('ru')} ₽</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                <span className={sub}>Начислено 24%</span><span className="tabular-nums" style={{ color: 'var(--status-success)' }}>+{piggyBank.detailing.deposits24Percent.toLocaleString('ru')} ₽</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                <span className={sub}>Снято на материалы</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{piggyBank.detailing.materialWithdrawals.toLocaleString('ru')} ₽</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                <span className={sub}>Возврат материалов</span><span className="tabular-nums" style={{ color: 'var(--status-success)' }}>+{piggyBank.detailing.materialRepayments.toLocaleString('ru')} ₽</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm font-semibold">
                <span>Нетто в копилке</span><span className="tabular-nums" style={{ color: (piggyBank.detailing.netPiggy ?? 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{(piggyBank.detailing.netPiggy ?? 0).toLocaleString('ru')} ₽</span>
              </div>
            </div>
          )}

          {/* Total balance */}
          <div className={`${glass} rounded-2xl p-4 mb-4`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Общий баланс копилки</span>
              <span className="font-bold text-lg tabular-nums" style={{ color: (piggyBank?.combinedBalance ?? piggyBankBalance) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                {(piggyBank?.combinedBalance ?? piggyBankBalance).toLocaleString('ru')} ₽
              </span>
            </div>
          </div>

          {/* Withdraw button */}
          <div className="grid grid-cols-1 gap-2 mb-4">
            <button onClick={() => onOpenWithdraw()} className="w-full py-3 rounded-xl text-white font-medium text-sm" style={{ background: 'var(--status-success)' }}>
              <Minus size={16} strokeWidth={1.75} className="inline mr-1" aria-hidden />Снять на расходы
            </button>
          </div>
        </>
      )}

      {/* ── TAB: WASH ── */}
      {piggyTab === 'wash' && piggyBank?.wash && (
        <div className={`${glass} rounded-2xl p-4 mb-4`}>
          <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>🚗 КОПИЛКА · МОЙКА</div>
          {/* Self-service */}
          <div className="mb-3">
            <div className={`text-xs font-medium ${sub} mb-2`}>▸ Самообслуживание (1 000 ₽/ч)</div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className={sub}>Выручка</span><span className="font-semibold tabular-nums">{piggyBank.wash.selfServiceRevenue.toLocaleString('ru')} ₽</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className={sub}>ЗП мастера</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{piggyBank.wash.selfServiceMaster.toLocaleString('ru')} ₽</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
              <span className={sub}>В копилку (90%)</span><span className="font-semibold tabular-nums" style={{ color: 'var(--status-success)' }}>+{piggyBank.wash.selfServicePiggy.toLocaleString('ru')} ₽</span>
            </div>
          </div>
          {/* Classic */}
          <div className="mb-3">
            <div className={`text-xs font-medium ${sub} mb-2`}>▸ Классическая мойка</div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className={sub}>Выручка</span><span className="font-semibold tabular-nums">{piggyBank.wash.classicRevenue.toLocaleString('ru')} ₽</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className={sub}>ЗП мастера</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{piggyBank.wash.classicMaster.toLocaleString('ru')} ₽</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
              <span className={sub}>В копилку</span><span className="font-semibold tabular-nums" style={{ color: 'var(--status-success)' }}>+{piggyBank.wash.classicPiggy.toLocaleString('ru')} ₽</span>
            </div>
          </div>
          {/* Totals */}
          <div className="flex justify-between py-2 text-sm font-semibold">
            <span>Всего в копилку</span><span className="tabular-nums" style={{ color: 'var(--status-success)' }}>+{piggyBank.wash.totalPiggy.toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className={sub}>Выручка</span><span className="font-semibold tabular-nums">{piggyBank.wash.totalRevenue.toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className={sub}>ЗП мастеров всего</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{piggyBank.wash.totalMaster.toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <span className={sub}>Выход мастеров (смены)</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{(piggyBank.masterDailyOutputs ?? 0).toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className={sub}>Расходы на мойку</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{(piggyBank.washExpenses ?? 0).toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className={sub}>Доп. доходы</span><span className="font-semibold tabular-nums" style={{ color: primary }}>+{(piggyBank.washIncomes ?? 0).toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-3 text-base font-bold border-t mt-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
            <span>🏦 Остаток в копилке</span>
            <span className="tabular-nums" style={{ color: (piggyBank.remainingInPiggyBank ?? 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
              {(piggyBank.remainingInPiggyBank ?? 0) >= 0 ? '' : '−'}{Math.abs(piggyBank.remainingInPiggyBank ?? 0).toLocaleString('ru')} ₽
            </span>
          </div>
        </div>
      )}

      {/* ── TAB: DETAILING ── */}
      {piggyTab === 'detailing' && piggyBank?.detailing && (
        <div className={`${glass} rounded-2xl p-4 mb-4`}>
          <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>✨ КОПИЛКА · ДЕТЕЙЛИНГ</div>
          <div className="flex justify-between py-2 text-sm">
            <span className={sub}>Выручка</span><span className="font-semibold tabular-nums">{piggyBank.detailing.detailingRevenue.toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className={sub}>ЗП мастеров</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{piggyBank.detailing.detailingMaster.toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <span className={sub}>Начислено 24%</span><span className="tabular-nums" style={{ color: 'var(--status-success)' }}>+{piggyBank.detailing.deposits24Percent.toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className={sub}>Снято на материалы</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{piggyBank.detailing.materialWithdrawals.toLocaleString('ru')} ₽</span>
          </div>
          {(() => {
            const otherWd = piggyBankTxs
              .filter(tx => tx.resourceGroup === 'detailing' && tx.transactionType === 'other_withdrawal')
              .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
            if (!otherWd) return null;
            return (
              <div className="flex justify-between py-2 text-sm">
                <span className={sub}>Снято на прочие расходы</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{otherWd.toLocaleString('ru')} ₽</span>
              </div>
            );
          })()}
          <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <span className={sub}>Возврат материалов</span><span className="tabular-nums" style={{ color: 'var(--status-success)' }}>+{piggyBank.detailing.materialRepayments.toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className={sub}>Расходы на детейлинг</span><span className="tabular-nums" style={{ color: 'var(--status-danger)' }}>−{(piggyBank.detailingExpenses ?? 0).toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            <span className={sub}>Доп. доходы</span><span className="font-semibold tabular-nums" style={{ color: primary }}>+{(piggyBank.detailingIncomes ?? 0).toLocaleString('ru')} ₽</span>
          </div>
          <div className="flex justify-between py-3 text-base font-bold border-t mt-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
            <span>🏦 Нетто в копилке</span>
            <span className="tabular-nums" style={{ color: (piggyBank.detailing.netPiggy ?? 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
              {(piggyBank.detailing.netPiggy ?? 0) >= 0 ? '' : '−'}{Math.abs(piggyBank.detailing.netPiggy ?? 0).toLocaleString('ru')} ₽
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-4">
            <button onClick={() => onOpenWithdraw()} className="w-full py-3 rounded-xl text-white font-medium text-sm" style={{ background: 'var(--status-success)' }}>
              <Minus size={16} strokeWidth={1.75} className="inline mr-1" aria-hidden />Снять на расходы
            </button>
          </div>
        </div>
      )}

      {/* Who took from piggy - per person, clickable */}
      {piggyBank?.spenderDebts && piggyBank.spenderDebts.length > 0 && (
        <div className={`${glass} rounded-2xl p-4 mb-4`}>
          <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3 flex items-center justify-between`}>
            <span>👥 Кто брал из копилки</span>
            <span className={`text-[10px] ${sub}`}>нажми для деталей</span>
          </div>
          <div className="space-y-2">
            {piggyBank.spenderDebts.map(d => (
              <button key={d.spentById || d.spentByName} onClick={() => setSelectedDebt(d)}
                className="w-full flex justify-between items-center py-2.5 px-3 rounded-xl text-left transition active:scale-[0.98] hover:brightness-110 border last:border-0"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium flex items-center gap-1.5">{d.spentByName}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--status-danger)', color: 'white', opacity: 0.9 }}>{d.count}</span>
                  </span>
                  <span className={`text-[11px] ${sub}`}>{d.count} снятий на расходы из копилки</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tabular-nums" style={{ color: 'var(--status-danger)' }}>−{d.totalSpent.toLocaleString('ru')} ₽</span>
                  <ChevronRight size={14} strokeWidth={1.75} className={sub} />
                </div>
              </button>
            ))}
          </div>
          <div className={`text-[11px] ${sub} mt-3 p-2 rounded-lg`} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            <span className="font-medium">Как это работает:</span> снятия из копилки фиксируют, кто брал деньги и на что — с зарплатой они не связаны. Если покупка сделана за свой счёт, оформи её через «Свои деньги» — сумма компенсируется в ЗП. Нажми на строку — увидишь все снятия этого человека.
          </div>
        </div>
      )}

      {/* Debt detail sheet */}
      <AnimatePresence>
        {selectedDebt && (() => {
          const debtTxs = piggyBankTxs.filter(tx => {
            if (selectedDebt.spentById) return tx.spentById === selectedDebt.spentById;
            return (tx.spentByName || '').trim() === selectedDebt.spentByName.trim();
          }).sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          const total = debtTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={() => setSelectedDebt(null)} />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl max-h-[82vh] overflow-y-auto`}>
                <div className="p-4 border-b sticky top-0 flex justify-between items-center" style={{ background: isDark ? '#1C1C1F' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                  <div className="mt-2">
                    <h3 className="font-semibold text-base flex items-center gap-2">👤 {selectedDebt.spentByName}
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--status-danger)' }}>{selectedDebt.count} снятий</span>
                    </h3>
                    <div className={`text-xs ${sub} mt-1`}>Всего снято из копилки: <span className="font-bold" style={{ color: 'var(--status-danger)' }}>{total.toLocaleString('ru')} ₽</span></div>
                  </div>
                  <button onClick={() => setSelectedDebt(null)} className={`p-2 rounded-xl ${glass}`}><X size={16} strokeWidth={1.75} /></button>
                </div>
                <div className="p-4 space-y-3">
                  <div className={`${glass} rounded-xl p-3`}>
                    <div className={`text-[11px] ${sub} uppercase tracking-wider mb-2`}>Откуда эти данные</div>
                    <div className="text-sm leading-relaxed">
                      Каждое снятие из копилки — это <span className="font-medium" style={{ color: 'var(--status-danger)' }}>списание</span> из баланса (транзакция `material_withdrawal` / `other_withdrawal`) + зеркальный <span className="font-medium">расход</span> в бюджете. С зарплатой такие снятия <span className="font-medium">не связаны</span>. Покупка за личные деньги — это отдельный расход бюджета, который компенсируется начислением в ЗП (видно в ведомости у того, кто взял).
                    </div>
                  </div>
                  {debtTxs.length === 0 ? (
                    <div className={`text-center py-8 text-sm ${sub}`}>Нет операций</div>
                  ) : debtTxs.map(tx => {
                    const isOther = tx.transactionType === 'other_withdrawal';
                    return (
                      <div key={tx.id} className={`${glass} rounded-xl p-3`}>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${sub}`} style={{ background: isOther ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: isOther ? '#B45309' : 'var(--status-success)' }}>{isOther ? 'прочие' : 'материалы'}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${sub}`} style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>{tx.resourceGroup === 'detailing' ? '✨ детейлинг' : tx.resourceGroup === 'wash' ? '🚗 мойка' : 'общая'}</span>
                              <span className={`text-[11px] ${sub}`}>{tx.date}</span>
                            </div>
                            <div className="font-medium text-sm mt-1">{tx.materialName || tx.purpose || 'Без названия'}</div>
                            {tx.purpose && tx.materialName && <div className={`text-xs ${sub} mt-0.5`}>{tx.purpose}</div>}
                            {tx.bookingInfo && <div className={`text-[11px] ${sub} mt-1`}>Заказ: {tx.bookingInfo}</div>}
                          </div>
                          <div className="font-bold text-sm tabular-nums shrink-0" style={{ color: 'var(--status-danger)' }}>-{Math.abs(tx.amount).toLocaleString('ru')} ₽</div>
                        </div>
                        <div className={`text-[10px] ${sub} mt-2`}>ID: {tx.id.slice(0,8)} · {new Date(tx.createdAt).toLocaleString('ru-RU')}</div>
                      </div>
                    );
                  })}
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setSelectedDebt(null)} className={`flex-1 py-3 rounded-xl font-medium ${glass}`}>Закрыть</button>
                    <button onClick={() => { setSelectedDebt(null); setPiggyTxExpanded(true); }} className="flex-1 py-3 rounded-xl font-medium text-white" style={{ background: primary }}>Показать в истории</button>
                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* Transaction history */}
      <button onClick={() => setPiggyTxExpanded(v => !v)} className="w-full flex items-center justify-between mb-3">
        <h3 className={`text-xs font-medium ${sub} uppercase tracking-wider`}>История операций</h3>
        <div className="flex items-center gap-2">
          {!piggyTxExpanded && (
            <span className={`text-[11px] ${sub}`}>{piggyBankTxs.length} операций</span>
          )}
          <ChevronRight size={14} strokeWidth={1.75} aria-hidden className={`${sub} transition-transform ${piggyTxExpanded ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {piggyTxExpanded && (() => {
        const filteredTxs = piggyTab === 'all' ? piggyBankTxs
          : piggyTab === 'wash' ? piggyBankTxs.filter(tx => tx.resourceGroup === 'wash')
          : piggyBankTxs.filter(tx => tx.resourceGroup === 'detailing');
        if (filteredTxs.length === 0) {
          return <div className={`text-center py-8 text-sm ${sub}`}>Пока нет операций</div>;
        }
        let runningBalance = piggyBankBalance;
        return (
          <div className="space-y-2">
            {filteredTxs.map(tx => {
              const isDeposit = tx.amount > 0;
              const txLabel = tx.transactionType === 'deposit_24percent' ? '24% от заказа'
                : tx.transactionType === 'material_repayment' ? 'Возврат материалов'
                : tx.transactionType === 'material_withdrawal' ? 'Снятие на материалы'
                : tx.transactionType === 'other_withdrawal' ? 'Снятие · прочие расходы'
                : tx.transactionType === 'expense' ? 'Расход из копилки'
                : 'Корректировка';
              const booking = tx.bookingId ? bookings.find(b => b.id === tx.bookingId) : null;
              const handleClick = () => {
                if (booking) {
                  onSelectBooking(booking);
                } else if (tx.bookingId) {
                  toast({ type: 'error', title: 'Заказ не найден (возможно, удалён)' });
                }
              };
              const Wrapper = tx.bookingId ? 'button' : 'div';
              const txRunningBalance = runningBalance;
              runningBalance -= tx.amount;
              return (
                <Wrapper key={tx.id} onClick={handleClick}
                  id={archiveHighlight?.target === 'piggy' && archiveHighlight.txId === tx.id ? highlightId(archiveHighlight) : undefined}
                  className={`${glass} rounded-xl p-3 w-full text-left transition active:scale-[0.98] ${tx.bookingId ? 'cursor-pointer hover:brightness-110' : ''}`}
                  style={archiveHighlight?.target === 'piggy' && archiveHighlight.txId === tx.id ? { boxShadow: '0 0 0 2px var(--status-warning)' } : undefined}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className={`w-2 h-2 rounded-full ${isDeposit ? 'bg-[var(--status-success)]' : 'bg-[var(--status-danger)]'}`} />
                        <span className="text-sm font-medium">{txLabel}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${sub}`} style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                          {tx.resourceGroup === 'detailing' ? '✨' : '🚗'}
                        </span>
                        {booking && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${ownerStatusBadge(booking.status)}`}>
                            {booking.status === 'completed' ? 'Выполнен' : booking.status === 'cancelled' ? 'Отменён' : booking.status === 'no_show' ? 'Не пришёл' : booking.status === 'new' ? 'Новый' : booking.status === 'confirmed' ? 'Подтверждён' : booking.status === 'in_progress' ? 'В работе' : booking.status}
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] ${sub} mt-0.5`}>{tx.date}</div>
                      {booking && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs">
                          <span style={{ color: 'var(--status-success)' }}>{booking.clientName}</span>
                          <span className={sub}>{booking.service}</span>
                          <span className={sub}>{booking.date} {booking.time}</span>
                        </div>
                      )}
                      {!booking && tx.bookingInfo && (
                        <div className="text-xs mt-0.5"><span className={sub}>Заказ:</span> {tx.bookingInfo}</div>
                      )}
                      {booking && (booking.car || booking.plate) && (
                        <div className="text-[11px] mt-0.5">
                          <span className={sub}>{booking.car || ''}{booking.car && booking.plate ? ' · ' : ''}{booking.plate || ''}</span>
                        </div>
                      )}
                      {tx.materialName && (
                        <div className="flex items-center gap-1 text-[11px] mt-1">
                          <span className={sub}>🧴</span>
                          <span>{tx.materialName}</span>
                          <span className={sub}>({(tx.materialCost ?? 0).toLocaleString('ru')} ₽)</span>
                        </div>
                      )}
                      {tx.purpose && !tx.materialName && (
                        <div className="text-[11px] mt-0.5 opacity-70">{tx.purpose}</div>
                      )}
                      {tx.spentByName && (
                        <div className="flex items-center gap-1 text-[11px] mt-1">
                          <span className={sub}>👤</span>
                          <span>Взял: {tx.spentByName}</span>
                        </div>
                      )}
                      {tx.bookingId && !booking && (
                        <div className="text-[11px] mt-0.5 opacity-50 italic">Заказ удалён</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <div className={`font-bold text-sm tabular-nums ${isDeposit ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]'}`}>
                        {isDeposit ? '+' : ''}{tx.amount.toLocaleString('ru')} ₽
                      </div>
                      {booking && (
                        <div className={`text-[10px] tabular-nums ${sub}`}>
                          {booking.price.toLocaleString('ru')} ₽
                        </div>
                      )}
                      <div className={`text-[10px] mt-1 tabular-nums ${sub}`}>
                        = {txRunningBalance.toLocaleString('ru')} ₽
                      </div>
                      {tx.bookingId && (
                        <ChevronRight size={12} strokeWidth={1.75} aria-hidden className={`mt-0.5 ${sub}`} />
                      )}
                    </div>
                  </div>
                </Wrapper>
              );
            })}
          </div>
        );
      })()}

      {/* Archives — collapsed by default */}
      {piggyBank?.archives && piggyBank.archives.length > 0 && (
        <div className={`${glass} rounded-2xl p-4 mb-4 mt-4`}>
          <button onClick={onOpenArchives} className="w-full flex items-center justify-between">
            <div className={`text-xs font-medium ${sub} uppercase tracking-wider`}>Архив недель</div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] ${sub}`}>{piggyBank.archives.length} шт.</span>
              <ChevronRight size={14} strokeWidth={1.75} aria-hidden className={sub} />
            </div>
          </button>
        </div>
      )}
      </>
      )}
    </motion.div>
  );
}
