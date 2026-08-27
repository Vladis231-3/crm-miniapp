import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../../../context/AppContext';
import { formatDate, getLastNDates, parseFlexibleDate } from '../../../utils/date';
import { isFixedMasterService, FIXED_MASTER_EARNED } from '../../ui/utils';
import { Money, StatTile } from '../../atmosfera';

type Period = 'day' | 'week' | 'month' | 'all';

const STATUS_COLORS: Record<string, string> = {
  new: 'var(--primary-500)',
  confirmed: 'var(--status-info)',
  scheduled: 'var(--primary-300)',
  in_progress: 'var(--status-warning)',
  completed: 'var(--status-success)',
  admin_review: 'var(--chart-5)',
  no_show: 'var(--chart-2)',
  cancelled: 'var(--status-danger)',
};

const STATUS_LABELS_SHORT: Record<string, string> = {
  new: 'Новые',
  confirmed: 'Подтверждены',
  scheduled: 'Запланировано',
  in_progress: 'В работе',
  completed: 'Завершено',
  admin_review: 'На уточнении',
  no_show: 'Не приехал',
  cancelled: 'Отменено',
};

function periodStart(period: Period): Date | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (period === 'day') return now;
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d;
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return d;
  }
  return null;
}

/**
 * AdminStatsPage — вырезка из AdminApp (§6.2).
 * Периоды (день/неделя/месяц/всё) + реанимированные «мёртвые» вычисления
 * (byService/byStatus/byPayment/workerStats/revenueData/hourData — считались,
 * но никогда не рендерились). Графики recharts на токенах DS.
 */
export function AdminStatsPage() {
  const { bookings, services, workers } = useApp();
  const [period, setPeriod] = useState<Period>('month');

  const filtered = useMemo(() => {
    const start = periodStart(period);
    if (!start) return bookings;
    return bookings.filter((b) => {
      const parsed = parseFlexibleDate(b.date);
      return parsed !== null && parsed >= start;
    });
  }, [bookings, period]);

  const completedAll = useMemo(() => filtered.filter((b) => b.status === 'completed'), [filtered]);
  const todayLabel = formatDate(new Date());
  const todayBookings = useMemo(
    () => bookings.filter((b) => b.date === todayLabel),
    [bookings, todayLabel],
  );
  const totalRevenue = completedAll.reduce((s, b) => s + b.price, 0);
  const avgCheck = completedAll.length > 0 ? Math.round(totalRevenue / completedAll.length) : 0;
  const conversionRate = filtered.length > 0 ? Math.round((completedAll.length / filtered.length) * 100) : 0;

  const byService = useMemo(
    () =>
      services
        .map((s) => ({
          name: s.name.split(' ')[0],
          count: filtered.filter((b) => b.serviceId === s.id).length,
          revenue: filtered
            .filter((b) => b.serviceId === s.id && b.status === 'completed')
            .reduce((acc, b) => acc + b.price, 0),
        }))
        .filter((s) => s.count > 0)
        .sort((a, b) => b.revenue - a.revenue),
    [services, filtered],
  );

  const byStatus = useMemo(
    () =>
      (
        [
          ['new', 'Новые'],
          ['confirmed', 'Подтверждены'],
          ['scheduled', 'Запланировано'],
          ['in_progress', 'В работе'],
          ['completed', 'Завершено'],
          ['admin_review', 'На уточнении'],
          ['no_show', 'Не приехал'],
          ['cancelled', 'Отменено'],
        ] as const
      )
        .map(([key, name]) => ({ name, key, value: filtered.filter((b) => b.status === key).length }))
        .filter((s) => s.value > 0),
    [filtered],
  );

  const byPayment = useMemo(
    () =>
      (
        [
          ['Наличные', true, 'cash', 'var(--status-success)'],
          ['Перевод', true, 'transfer', 'var(--primary-600)'],
          ['По счёту', true, 'invoice', 'var(--primary-800)'],
        ] as const
      )
        .map(([name, settled, type, color]) => ({
          name,
          value: filtered.filter((b) => b.paymentSettled && b.paymentType === type).length,
          color,
        }))
        .concat([
          {
            name: 'Не оплачено',
            value: filtered.filter((b) => !b.paymentSettled).length,
            color: 'var(--status-danger)',
          },
        ])
        .filter((p) => p.value > 0),
    [filtered],
  );

  const workerStats = useMemo(
    () =>
      workers
        .filter((w) => w.role === 'worker' || w.role === 'owner')
        .map((w) => ({
          ...w,
          tasks: completedAll.filter((b) => b.workers.some((bw) => bw.workerId === w.id)).length,
          earned: completedAll
            .filter((b) => b.workers.some((bw) => bw.workerId === w.id))
            .reduce((s, b) => {
              const bw = b.workers.find((bwk) => bwk.workerId === w.id);
              if (bw?.payType === 'fixed') return s + (bw.fixedAmount || 0);
              if (isFixedMasterService(services, b.serviceId, b.service)) return s + FIXED_MASTER_EARNED;
              return s + Math.round(b.price * (bw?.percent || 0) / 100);
            }, 0),
        }))
        .sort((a, b) => b.earned - a.earned),
    [workers, completedAll, services],
  );

  const revenueData = useMemo(() => {
    const days = period === 'day' ? getLastNDates(1) : getLastNDates(period === 'week' ? 7 : 30);
    return days.map((date) => {
      const formatted = formatDate(date);
      return {
        day: date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        revenue: filtered
          .filter((booking) => booking.date === formatted && booking.status === 'completed')
          .reduce((sum, booking) => sum + booking.price, 0),
      };
    });
  }, [filtered, period]);

  const hourData = useMemo(() => {
    const source = period === 'day' ? todayBookings : filtered;
    return Array.from(new Set(source.map((b) => b.time.slice(0, 2))))
      .sort()
      .map((hour) => ({
        hour: `${hour}:00`,
        count: source.filter((b) => b.time.startsWith(hour)).length,
      }));
  }, [filtered, todayBookings, period]);

  const referralStats = useMemo(() => {
    const map = new Map<string, { name: string; value: number; revenue: number }>();
    filtered.forEach((b) => {
      const src = (b.referralSource?.trim() || 'Не указано');
      const cur = map.get(src) || { name: src, value: 0, revenue: 0 };
      cur.value += 1;
      if (b.status === 'completed') cur.revenue += b.price;
      map.set(src, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const glass = 'border border-border bg-[var(--card)]';
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  const tooltipStyle = {
    background: 'var(--card-raised,var(--card))',
    border: '1px solid var(--border)',
    borderRadius: 12,
    color: 'var(--foreground)',
    fontSize: 12,
  };

  return (
    <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 px-4 py-4">
      {/* Периоды */}
      <div className="flex gap-1 rounded-xl border border-border bg-[var(--sunken,#EEEFF3)] p-1 dark:bg-white/5">
        {(['day', 'week', 'month', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              period === p ? 'bg-[var(--card-raised,var(--card))] text-foreground shadow-sm' : sub
            }`}
          >
            {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Всё'}
          </button>
        ))}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Всего записей" value={<span className="text-[var(--primary-600)]">{filtered.length}</span>} />
        <StatTile label="Выручка" value={<Money amount={totalRevenue} />} />
        <StatTile label="Средний чек" value={<Money amount={avgCheck} />} />
        <StatTile label="Конверсия" value={`${conversionRate}%`} />
        <StatTile label="Завершено" value={String(completedAll.length)} />
        <StatTile label="Отменено" value={String(filtered.filter((b) => b.status === 'cancelled').length)} />
        <StatTile label="На сегодня" value={String(todayBookings.length)} />
        <StatTile label="В работе" value={String(filtered.filter((b) => b.status === 'in_progress').length)} />
      </div>

      {/* Выручка по дням */}
      {period !== 'day' && (
        <div className={`${glass} rounded-2xl p-3`}>
          <div className={`section-kicker mb-2`}>Выручка по дням</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} width={44} />
              <RTooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${Number(v).toLocaleString('ru')} ₽`, 'Выручка']} />
              <Bar dataKey="revenue" fill="var(--primary-600)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Статусы */}
      {byStatus.length > 0 && (
        <div className={`${glass} rounded-2xl p-3`}>
          <div className={`section-kicker mb-2`}>Статусы записей</div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="45%" height={150}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={2} strokeWidth={0}>
                  {byStatus.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? 'var(--primary-500)'} />
                  ))}
                </Pie>
                <RTooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="min-w-0 flex-1 space-y-1">
              {byStatus.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_COLORS[entry.key] }} aria-hidden />
                    <span className={`truncate ${sub}`}>{STATUS_LABELS_SHORT[entry.key]}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Топ услуг */}
      {byService.length > 0 && (
        <div className={`${glass} rounded-2xl p-3`}>
          <div className={`section-kicker mb-2`}>Топ услуг</div>
          <div className="space-y-1.5">
            {byService.slice(0, 5).map((service, i) => {
              const maxRevenue = byService[0]?.revenue || 1;
              return (
                <div key={service.name} className="text-xs">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{i + 1}. {service.name}</span>
                    <span className="shrink-0 tabular-nums"><Money amount={service.revenue} /></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--sunken,#EEEFF3)] dark:bg-white/5">
                    <div
                      className="h-1.5 rounded-full bg-[var(--primary-600)]"
                      style={{ width: `${Math.max(6, Math.round((service.revenue / maxRevenue) * 100))}%` }}
                    />
                  </div>
                  <div className={`mt-0.5 ${sub}`}>{service.count} записей</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Способы оплаты */}
      {byPayment.length > 0 && (
        <div className={`${glass} rounded-2xl p-3`}>
          <div className={`section-kicker mb-2`}>Оплаты</div>
          <div className="grid grid-cols-2 gap-2">
            {byPayment.map((p) => (
              <div key={p.name} className="rounded-xl bg-[var(--sunken,#EEEFF3)] p-2.5 text-center dark:bg-white/5">
                <div className="text-sm font-bold tabular-nums" style={{ color: p.color }}>{p.value}</div>
                <div className={`text-[11px] ${sub}`}>{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Откуда узнали */}
      {referralStats.length > 0 && (
        <div className={`${glass} rounded-2xl p-3`}>
          <div className={`section-kicker mb-2`}>Откуда узнали</div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="45%" height={150}>
              <PieChart>
                <Pie data={referralStats} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={2} strokeWidth={0}>
                  {referralStats.map((entry, idx) => {
                    const palette = ['#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#71717A'];
                    return <Cell key={entry.name} fill={palette[idx % palette.length]} />;
                  })}
                </Pie>
                <RTooltip contentStyle={tooltipStyle} formatter={(v: any, _n: any, p: any) => [`${v} зап. · ${Number(p.payload.revenue).toLocaleString('ru')} ₽`, p.payload.name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="min-w-0 flex-1 space-y-1">
              {referralStats.map((entry, idx) => {
                const palette = ['#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#71717A'];
                const total = referralStats.reduce((s, r) => s + r.value, 0);
                const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                return (
                  <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: palette[idx % palette.length] }} aria-hidden />
                      <span className={`truncate ${sub}`}>{entry.name}</span>
                      <span className="shrink-0 tabular-nums">· {pct}%</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{entry.value} · {entry.revenue.toLocaleString('ru')} ₽</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`mt-2 text-[11px] ${sub}`}>Считаются все записи за выбранный период. Выручка — только по завершённым.</div>
        </div>
      )}

      {/* Загрузка по часам (день) */}
      {hourData.length > 0 && (
        <div className={`${glass} rounded-2xl p-3`}>
          <div className={`section-kicker mb-2`}>Записи по часам</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={hourData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
              <RTooltip contentStyle={tooltipStyle} formatter={(v: any) => [String(v), 'Записей']} />
              <Bar dataKey="count" fill="var(--chart-2)" radius={[6, 6, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Мастера */}
      {workerStats.length > 0 && (
        <div className={`${glass} rounded-2xl p-3`}>
          <div className={`section-kicker mb-2`}>Эффективность мастеров</div>
          <div className="space-y-1.5">
            {workerStats.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-2 rounded-xl px-1 py-1 text-xs">
                <span className="min-w-0 truncate font-medium">{w.name}</span>
                <span className={`shrink-0 ${sub}`}>{w.tasks} задач ·</span>
                <span className="shrink-0 font-semibold tabular-nums" style={{ color: 'var(--status-success)' }}>
                  <Money amount={w.earned} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
