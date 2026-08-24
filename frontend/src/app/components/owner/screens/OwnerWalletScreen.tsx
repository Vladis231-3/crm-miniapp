import { motion } from 'motion/react';
import { ArrowLeft, Edit3, RefreshCw } from 'lucide-react';
import { useApp, type Expense, type Income } from '../../../context/AppContext';

/** Структурная копия локального интерфейса родителя (OwnerApp.tsx:254). */
interface WalletArchiveRow {
  id: number;
  weekStart: string; weekEnd: string;
  totalRevenue: number; totalIncome: number; totalExpense: number;
  bookingCount: number; incomeCount: number; expenseCount: number;
  piggyBankBalance: number;
}

/** Структурная копия WalletData (OwnerApp.tsx:267). */
interface WalletScreenData {
  weekStart: string; weekEnd: string;
  revenue: number; totalIncome: number; totalExpense: number; profit: number;
  bookingCount: number;
  incomes: Income[]; expenses: Expense[];
  archives: WalletArchiveRow[];
}

interface ArchiveHighlightShape {
  target: 'worker' | 'owner' | 'piggy' | 'income' | 'expense';
  workerId?: string; ownerId?: string; txId?: string; incomeId?: string; expenseId?: string;
}

/**
 * OwnerWalletScreen — вырезка из OwnerApp (§6.4, Фаза 5 / вырезка №3).
 * Кошелёк: сводка недели, доходы/расходы (edit-rights: доход — owner,
 * расход — owner+accountant), архив недель.
 * Данные и формы добавления/редактирования остаются в родителе (общие
 * триггеры с дашбордом и finance-panel) и приходят props.
 */
export function OwnerWalletScreen({
  walletData,
  walletLoading,
  onReload,
  dateFrom,
  onClearDates,
  isSettingsContext,
  onBack,
  onStartAddIncome,
  onStartAddExpense,
  archiveHighlight,
  highlightId,
  onEditIncome,
  onEditExpense,
  primary,
  accent,
  glass,
  sub,
  isDark,
}: {
  walletData: WalletScreenData | null;
  walletLoading: boolean;
  onReload: () => void;
  dateFrom: string;
  onClearDates: () => void;
  isSettingsContext: boolean;
  onBack: () => void;
  onStartAddIncome: () => void;
  onStartAddExpense: () => void;
  archiveHighlight: ArchiveHighlightShape | null;
  highlightId: (h: ArchiveHighlightShape) => string | undefined;
  onEditIncome: (income: Income) => void;
  onEditExpense: (expense: Expense) => void;
  primary: string;
  accent: string;
  glass: string;
  sub: string;
  isDark: boolean;
}) {
  const { session } = useApp();

  return (
    <motion.div key="wallet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isSettingsContext && (
            <button onClick={onBack} className={`flex items-center gap-2 ${sub} text-sm`}><ArrowLeft size={16} strokeWidth={1.75} aria-hidden /></button>
          )}
          <h2 className="font-semibold">Кошелёк</h2>
        </div>
        <button onClick={onReload} disabled={walletLoading} className={`p-2 rounded-xl ${glass}`}>
          <RefreshCw size={16} strokeWidth={1.75} aria-hidden className={walletLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {walletData && (
        <>
          {/* Week period */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className={`text-xs ${sub}`}>
              {walletData.weekStart.split('-').reverse().join('.')} – {walletData.weekEnd.split('-').reverse().join('.')}
            </div>
            {dateFrom && (
              <button onClick={onClearDates}
                className="text-xs font-medium px-2.5 py-1 rounded-xl shrink-0" style={{ background: `${primary}20`, color: primary }}>
                Текущая неделя
              </button>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={`${glass} rounded-2xl p-4`}>
              <div className={`text-xs ${sub} mb-1`}>Выручка</div>
              <div className="font-bold text-lg tabular-nums" style={{ color: 'var(--status-success)' }}>{walletData.revenue.toLocaleString('ru')} ₽</div>
              <div className={`text-[11px] ${sub} mt-1`}>{walletData.bookingCount} записей</div>
            </div>
            <div className={`${glass} rounded-2xl p-4`}>
              <div className={`text-xs ${sub} mb-1`}>Доп. доходы</div>
              <div className="font-bold text-lg tabular-nums" style={{ color: primary }}>+{walletData.totalIncome.toLocaleString('ru')} ₽</div>
            </div>
            <div className={`${glass} rounded-2xl p-4`}>
              <div className={`text-xs ${sub} mb-1`}>Расходы</div>
              <div className="font-bold text-lg tabular-nums" style={{ color: 'var(--status-danger)' }}>−{walletData.totalExpense.toLocaleString('ru')} ₽</div>
            </div>
            <div className={`${glass} rounded-2xl p-4`}>
              <div className={`text-xs ${sub} mb-1`}>Прибыль</div>
              <div className="font-bold text-lg tabular-nums" style={{ color: walletData.profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                {walletData.profit >= 0 ? '+' : ''}{walletData.profit.toLocaleString('ru')} ₽
              </div>
            </div>
          </div>

          {/* Incomes this week */}
          <div className={`${glass} rounded-2xl p-4 mb-4`}>
            <div className="flex justify-between items-center mb-3">
              <div className={`text-xs font-medium ${sub} uppercase tracking-wider`}>Доходы</div>
              <button onClick={onStartAddIncome} className="text-xs font-medium px-2.5 py-1.5 rounded-xl" style={{ background: `${primary}20`, color: primary }}>
                + Добавить
              </button>
            </div>
            {walletData.incomes.length === 0 ? (
              <p className={`text-sm ${sub} text-center py-4`}>Нет доходов за эту неделю</p>
            ) : (
              <div className="space-y-2">
                {walletData.incomes.map(i => (
                  <div key={i.id}
                    id={archiveHighlight?.target === 'income' && archiveHighlight.incomeId === i.id ? highlightId(archiveHighlight) : undefined}
                    className="flex justify-between items-center py-2 border-b last:border-0"
                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', ...(archiveHighlight?.target === 'income' && archiveHighlight.incomeId === i.id ? { boxShadow: '0 0 0 2px var(--status-success)', borderRadius: 8 } : {}) }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{i.source}</div>
                      <div className={`text-xs ${sub}`}>{i.date}{i.note ? ` · ${i.note}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <div className="font-semibold text-sm tabular-nums" style={{ color: primary }}>+{i.amount.toLocaleString('ru')} ₽</div>
                      {session?.role === 'owner' && (
                        <button onClick={() => onEditIncome(i)} className={`p-1.5 rounded-lg ${glass}`} title="Редактировать">
                          <Edit3 size={13} strokeWidth={1.75} aria-hidden className={sub} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expenses this week */}
          <div className={`${glass} rounded-2xl p-4 mb-4`}>
            <div className="flex justify-between items-center mb-3">
              <div className={`text-xs font-medium ${sub} uppercase tracking-wider`}>Расходы</div>
              <button onClick={onStartAddExpense} className="text-xs font-medium px-2.5 py-1.5 rounded-xl" style={{ background: `${primary}20`, color: primary }}>
                + Добавить
              </button>
            </div>
            {walletData.expenses.length === 0 ? (
              <p className={`text-sm ${sub} text-center py-4`}>Нет расходов за эту неделю</p>
            ) : (
              <div className="space-y-2">
                 {walletData.expenses.map(e => (
                   <div key={e.id}
                     id={archiveHighlight?.target === 'expense' && archiveHighlight.expenseId === e.id ? highlightId(archiveHighlight) : undefined}
                     className="flex justify-between items-center py-2 border-b last:border-0"
                     style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', ...(archiveHighlight?.target === 'expense' && archiveHighlight.expenseId === e.id ? { boxShadow: '0 0 0 2px var(--status-danger)', borderRadius: 8 } : {}) }}>
                     <div className="flex-1 min-w-0">
                       <div className="text-sm font-medium truncate">{e.title}</div>
                       <div className={`text-xs ${sub}`}>{e.category} · {e.date}{e.resourceGroup ? ` · ${e.resourceGroup === 'wash' ? '🚗 Мойка' : '✨ Детейлинг'}` : ''}</div>
                     </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <div className="font-semibold text-sm tabular-nums" style={{ color: 'var(--status-danger)' }}>−{e.amount.toLocaleString('ru')} ₽</div>
                      {(session?.role === 'owner' || session?.role === 'accountant') && (
                        <button onClick={() => onEditExpense(e)} className={`p-1.5 rounded-lg ${glass}`} title="Редактировать">
                          <Edit3 size={13} strokeWidth={1.75} aria-hidden className={sub} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Archives */}
          {walletData.archives.length > 0 && (
            <div className={`${glass} rounded-2xl p-4 mb-4`}>
              <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Архив недель</div>
              <div className="space-y-2">
                {walletData.archives.map(a => (
                  <div key={a.id} className={`${glass} rounded-xl p-3`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium">
                        {a.weekStart.split('-').reverse().join('.')} – {a.weekEnd.split('-').reverse().join('.')}
                      </div>
                      <div className="font-semibold text-sm tabular-nums" style={{ color: a.totalRevenue + a.totalIncome - a.totalExpense >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                        {a.totalRevenue + a.totalIncome - a.totalExpense >= 0 ? '+' : ''}{(a.totalRevenue + a.totalIncome - a.totalExpense).toLocaleString('ru')} ₽
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-[11px] tabular-nums" style={{ color: 'var(--status-success)' }}>+{a.totalRevenue.toLocaleString('ru')} ₽</div>
                        <div className={`text-[10px] ${sub}`}>Выручка</div>
                      </div>
                      <div>
                        <div className="text-[11px] tabular-nums" style={{ color: primary }}>+{a.totalIncome.toLocaleString('ru')} ₽</div>
                        <div className={`text-[10px] ${sub}`}>Доходы</div>
                      </div>
                      <div>
                        <div className="text-[11px] tabular-nums" style={{ color: 'var(--status-danger)' }}>−{a.totalExpense.toLocaleString('ru')} ₽</div>
                        <div className={`text-[10px] ${sub}`}>Расходы</div>
                      </div>
                    </div>
                    <div className={`text-[10px] ${sub} mt-2 text-center`}>
                      {a.bookingCount} записей · {a.incomeCount} доходов · {a.expenseCount} расходов · Копилка: {a.piggyBankBalance.toLocaleString('ru')} ₽
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!walletData && !walletLoading && (
        <div className="text-center py-12">
          <button onClick={onReload} className={`px-4 py-2 rounded-xl text-sm font-medium`} style={{ background: `${primary}20`, color: primary }}>
            Загрузить данные
          </button>
        </div>
      )}

      {walletLoading && !walletData && (
        <div className="text-center py-12">
          <div className={`text-sm ${sub}`}>Загрузка...</div>
        </div>
      )}
    </motion.div>
  );
}
