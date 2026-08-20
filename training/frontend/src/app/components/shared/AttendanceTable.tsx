import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '../../api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ShiftAttendanceItem {
  workerId: string;
  workerName: string;
  shiftCount: number;
  shiftDates: string[]; // DD.MM.YYYY, sorted descending
}

type Period = 'week' | 'month' | 'year';

export interface AttendanceTableProps {
  mode: 'admin' | 'worker';
  workerId?: string;
  primary: string;
}

// ── Period labels ──────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
};

const PERIODS: Period[] = ['week', 'month', 'year'];

// ── Component ──────────────────────────────────────────────────────────────

export function AttendanceTable({ mode, workerId, primary }: AttendanceTableProps) {
  // Requirement 4.9: default period is 'week'
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<ShiftAttendanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        mode === 'admin'
          ? `/api/owner/shift-attendance?period=${period}`
          : `/api/worker/shift-attendance?period=${period}`;

      if (mode === 'admin') {
        // Returns list[ShiftAttendancePayload]
        const result = await apiRequest<ShiftAttendanceItem[]>(endpoint);
        setData(result);
      } else {
        // Returns single ShiftAttendancePayload for the current worker
        const result = await apiRequest<ShiftAttendanceItem>(endpoint);
        setData([result]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [mode, period]);

  // Requirement 4.9: fetch on mount and on period change
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* Period filter buttons — Requirements 4.3, 4.4, 4.5 */}
      <div className="flex gap-2 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all"
            style={
              period === p
                ? { background: primary, color: 'white' }
                : { background: `${primary}18`, color: primary }
            }
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Requirement 4.6: loading spinner */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2
            size={28}
            className="animate-spin"
            style={{ color: primary }}
          />
        </div>
      )}

      {/* Requirement 4.10: error message + retry button */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => void fetchData()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: primary }}
          >
            <RefreshCw size={15} />
            Повторить
          </button>
        </div>
      )}

      {/* Table — Requirements 4.1, 4.2, 4.7, 4.8 */}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {/* Admin mode shows worker name column (Requirement 4.1) */}
                {mode === 'admin' && (
                  <th
                    className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                    style={{ color: primary, opacity: 0.8 }}
                  >
                    Имя мастера
                  </th>
                )}
                <th
                  className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                  style={{ color: primary, opacity: 0.8 }}
                >
                  Выходов
                </th>
                <th
                  className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide"
                  style={{ color: primary, opacity: 0.8 }}
                >
                  Даты выходов
                </th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={mode === 'admin' ? 3 : 2}
                    className="px-4 py-8 text-center text-sm opacity-50"
                  >
                    Нет данных за выбранный период
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr
                    key={item.workerId}
                    className={
                      index % 2 === 0
                        ? 'bg-black/[0.02] dark:bg-white/[0.02]'
                        : ''
                    }
                  >
                    {mode === 'admin' && (
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {item.workerName}
                      </td>
                    )}
                    {/* Requirement 4.7: show "0" when no shifts */}
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {item.shiftCount}
                    </td>
                    {/* Requirement 4.7: show empty when no shift dates */}
                    <td className="px-4 py-3 text-xs leading-relaxed">
                      {item.shiftDates.length > 0 ? (
                        <span className="opacity-80">
                          {item.shiftDates.join(', ')}
                        </span>
                      ) : (
                        <span className="opacity-30">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
