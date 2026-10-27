// Strict money-split previews mirroring backend/app/main.py.
//
// Backend is the source of truth for money movement (complete / pay-salary /
// withdraw all run server-side). These helpers keep booking-card and draft
// previews from diverging on cases the backend handles explicitly:
// fixed-amount clamps and the master pool (masterPayType). Materials,
// subtract-dops and complaint adjustments stay backend-only — the exact
// per-booking amounts come from salary-detail / money-split endpoints.

export interface SplitWorkerLink {
  workerId: string;
  percent?: number | string | null;
  payType?: string;
  fixedAmount?: number | null;
  overrideEarned?: number | null;
}

export interface SplitServiceSettings {
  masterPayType?: string | null;
  masterPayValue?: number | null;
}

function num(value: unknown): number {
  if (value === '' || value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Mirror of backend _asvc_link_earned: fixed is clamped to the dop price. */
export function dopWorkerEarned(asvcPrice: number, w: Pick<SplitWorkerLink, 'payType' | 'fixedAmount' | 'percent'>): number {
  const price = Math.max(0, Math.round(num(asvcPrice)));
  if (w.payType === 'fixed') {
    return Math.max(0, Math.min(Math.round(num(w.fixedAmount)), price));
  }
  return Math.round((price * num(w.percent)) / 100);
}

/**
 * Mirror of backend _compute_master for the classic order (no
 * complaints/materials — those are applied server-side).
 * - overrideEarned / fixed links are paid as-is (fixed unclamped: the main
 *   link fixed amount is an explicit agreement, same as backend);
 * - with a master pool (masterPayType fixed/percent, capped by base) the pool
 *   is shared by profile-percent weights, last worker gets the remainder;
 * - without a pool each percent link earns base * percent.
 */
export function mainWorkerEarned(
  base: number,
  service: SplitServiceSettings | undefined,
  workers: SplitWorkerLink[],
  workerId: string,
): number {
  const safeBase = Math.max(0, Math.round(num(base)));
  const link = workers.find((w) => w.workerId === workerId);
  if (!link) return 0;
  if (link.overrideEarned != null) return Math.round(num(link.overrideEarned));
  if (link.payType === 'fixed') return Math.round(num(link.fixedAmount));
  const poolType = service?.masterPayType || '';
  if (!poolType) {
    return Math.round((safeBase * num(link.percent)) / 100);
  }
  let pool = 0;
  if (poolType === 'fixed') {
    pool = Math.max(0, Math.min(Math.round(num(service?.masterPayValue)), safeBase));
  } else if (poolType === 'percent') {
    pool = Math.max(0, Math.min(Math.round((safeBase * num(service?.masterPayValue)) / 100), safeBase));
  } else {
    return 0;
  }
  if (pool <= 0) return 0;
  const weighted = workers.filter((w) => w.payType !== 'fixed' && w.overrideEarned == null);
  const idx = weighted.findIndex((w) => w.workerId === workerId);
  if (idx < 0) return 0;
  const weights = weighted.map((w) => Math.max(0, num(w.percent)));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    // Backend: even split, remainder roubles to the first workers in order.
    const share = Math.floor(pool / weighted.length);
    const remainder = pool - share * weighted.length;
    return share + (idx < remainder ? 1 : 0);
  }
  if (idx === weighted.length - 1) {
    let allocated = 0;
    for (let i = 0; i < weighted.length - 1; i += 1) {
      allocated += Math.round((pool * weights[i]) / sum);
    }
    return Math.max(0, pool - allocated);
  }
  return Math.round((pool * weights[idx]) / sum);
}

export interface SplitFormulaSettings {
  piggyPayType?: string | null;
  piggyPayValue?: number | null;
  ownerPayType?: string | null;
  ownerPayValue?: number | null;
  ownerSplitEnabled?: boolean | null;
}

/**
 * Mirror of backend money_formula.formula_tail_error: формула обязана иметь
 * шаг, забирающий весь остаток (владельцы без % / 100% или копилка «остаток»
 * / 100%). Иначе хвост никому не уходит — сохранение блокируется.
 */
export function formulaTailError(svc: SplitFormulaSettings): string | null {
  const ownersEnabled = svc.ownerSplitEnabled !== false;
  const ownerType = svc.ownerPayType || '';
  const ownerValue = Math.trunc(num(svc.ownerPayValue));
  const piggyType = svc.piggyPayType || '';
  if (ownersEnabled && (ownerType === '' || (ownerType === 'percent' && ownerValue >= 100))) return null;
  if (piggyType === 'rest' || (piggyType === 'percent' && Math.trunc(num(svc.piggyPayValue)) >= 100)) return null;
  if (!ownersEnabled) {
    return 'владельцы выключены, а копилка не забирает остаток — часть денег никому не уйдёт. Включите владельцев или поставьте копилке «Весь остаток».';
  }
  return `владельцам ${ownerValue}% остатка, а копилка не забирает остаток — ${100 - ownerValue}% остатка никому не уйдёт. Поставьте владельцам «Весь остаток» или копилке «Весь остаток».`;
}
