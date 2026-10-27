import { useState } from 'react';
import { apiRequest } from '../../api';

interface RecalcSummary {
  dryRun: boolean;
  bookings: number;
  piggy: Array<{ resourceGroup: string; before: number; after: number; delta: number }>;
  owners: { before: number; after: number; delta: number };
  paidMismatches: Array<{ bookingId: string; date: string; service: string; client: string; overpaid: number }>;
}

const GROUP_LABELS: Record<string, string> = { wash: 'Мойка', detailing: 'Детейлинг', general: 'Общая' };

function rub(n: number) {
  return `${n.toLocaleString('ru')} ₽`;
}

function signed(n: number) {
  return `${n > 0 ? '+' : ''}${rub(n)}`;
}

/** Пересчёт истории по текущим формулам услуг: сначала проверка, потом запуск. */
export function MoneyRecalcCard({ glass, sub, primary }: { glass: string; sub: string; primary: string }) {
  const [summary, setSummary] = useState<RecalcSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiRequest<RecalcSummary>(
        `/api/admin/maintenance/recalc-money?dryRun=${dryRun ? 'true' : 'false'}`,
        { method: 'POST' },
      );
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось пересчитать');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${glass} rounded-2xl p-4 mb-3 text-sm`}>
      <div className="font-medium mb-1">Пересчёт истории по формулам</div>
      <div className={`text-xs ${sub} mb-3`}>
        Вклады в копилки и невыплаченные доли владельцев по всем завершённым записям будут пересчитаны по текущим формулам услуг.
        Выплаченные доли и зарплаты не меняются. Сначала покажем, что изменится.
      </div>
      {error && <div className="text-xs text-red-500 whitespace-pre-line mb-2">{error}</div>}
      {summary && (
        <div className="text-xs space-y-1 mb-3">
          <div className={sub}>{summary.dryRun ? 'Проверка (ничего не записано)' : 'Готово, пересчитано'} · записей: {summary.bookings}</div>
          {summary.piggy.map((p) => (
            <div key={p.resourceGroup} className="flex justify-between">
              <span className={sub}>Копилка «{GROUP_LABELS[p.resourceGroup] ?? p.resourceGroup}»</span>
              <span>{rub(p.before)} → {rub(p.after)} ({signed(p.delta)})</span>
            </div>
          ))}
          <div className="flex justify-between">
            <span className={sub}>Доли владельцев</span>
            <span>{rub(summary.owners.before)} → {rub(summary.owners.after)} ({signed(summary.owners.delta)})</span>
          </div>
          {summary.paidMismatches.length > 0 && (
            <div className="text-amber-600">
              Уже выплачено больше, чем по формуле, в {summary.paidMismatches.length} зап.:{' '}
              {summary.paidMismatches.slice(0, 5).map((m) => `${m.date} ${m.service} (+${rub(m.overpaid)})`).join(', ')}
              {summary.paidMismatches.length > 5 ? '…' : ''}. Эти выплаты не откатываются.
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => void run(true)}
          disabled={busy}
          className="flex-1 py-2 rounded-xl text-sm font-medium disabled:opacity-60"
          style={{ background: `${primary}18`, color: primary }}
        >
          {busy ? 'Считаю…' : 'Проверить'}
        </button>
        {summary?.dryRun && (
          <button
            onClick={() => void run(false)}
            disabled={busy}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: primary }}
          >
            Пересчитать
          </button>
        )}
      </div>
    </div>
  );
}
