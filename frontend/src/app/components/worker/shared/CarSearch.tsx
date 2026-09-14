import { useEffect, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { apiRequest } from '../../../api';
import type { WorkerCalendarBooking } from '../WorkerCalendar';
import { EmptyState } from '../../shared/EmptyState';
import { SkeletonRows } from '../../shared/Skeleton';
import { SourceBadge } from '../../shared/SourceBadge';
import { StatusBadge } from '../../atmosfera';
import { cn } from '../../ui/utils';

export interface CarSearchProps {  /** Текущий мастер  -  для плашки «Заведена на вас». */
  workerId: string;
}

/**
 * CarSearch — поиск ТОЛЬКО по своим машинам мастера (госномер/марка/клиент) из «Сегодня» (§6.3).
 * Своя = участвовал в основной услуге ИЛИ делал доп. услугу.
 * Чужие авто не показываются никогда: бэкенд /api/worker/cars/search отдаёт
 * только записи мастера, клиент дополнительно отсекает чужие.
 * Пустой запрос = свои машины на сегодня. Debounce 300мс.
 */
export function CarSearch({ workerId }: CarSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WorkerCalendarBooking[]>([]);
  const [loading, setLoading] = useState(false);

  const isMainParticipant = (b: WorkerCalendarBooking) =>
    b.workers.some((w) => w.workerId === workerId);
  const myExtras = (b: WorkerCalendarBooking) =>
    (b.additionalServices || []).filter((as) => (as.workers || []).some((w) => w.workerId === workerId));
  const isMine = (b: WorkerCalendarBooking) => isMainParticipant(b) || myExtras(b).length > 0;
  const participationLabel = (b: WorkerCalendarBooking) => {
    const isMain = isMainParticipant(b);
    const hasExtras = myExtras(b).length > 0;
    if (isMain && hasExtras) return 'Осн. + доп';
    if (isMain) return 'Основная';
    return 'Доп';
  };

  // Бэкенд уже отдаёт только свои (основная ИЛИ доп), но на всякий случай
  // отсекаем чужие авто и на клиенте — показываем только те, где мастер участвовал.
  const myResults = results.filter(isMine);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      apiRequest<WorkerCalendarBooking[]>(`/api/worker/cars/search?${params.toString()}`)
        .then((items) => {
          if (!cancelled) setResults(items);
        })
        .catch((e) => {
          console.error('worker car search error:', e);
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  return (
    <section className="mb-4 rounded-2xl border border-border bg-[var(--card)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <span className="text-sm font-medium">Поиск по машинам</span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={cn('text-[var(--fg-secondary,#5A6072)] transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="relative">
            <Search
              size={16}
              strokeWidth={1.75}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted,#8A91A0)]"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Госномер или марка: а123вс777, BMW"
              className="w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-[var(--fg-muted,#8A91A0)] outline-none focus:border-[var(--ring)]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Очистить"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--fg-muted,#8A91A0)] hover:text-foreground"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>
          <div className="mt-2 text-xs text-[var(--fg-secondary,#5A6072)]">
            {query.trim()
              ? 'Только ваши авто — где вы основной мастер или делали доп. услуги'
              : 'Мои машины на сегодня'}
          </div>

          <div className="mt-3">
            {loading ? (
              <SkeletonRows count={3} />
            ) : myResults.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Ничего не найдено"
                subtitle={query.trim() ? 'Среди ваших записей ничего нет' : 'На сегодня ваших записей нет'}
              />
            ) : (
              <div className="space-y-3">
                {myResults.map((b) => {
                  const extras = myExtras(b);
                  const isMain = isMainParticipant(b);
                  return (
                    <div key={b.id} className="rounded-2xl border border-border bg-[var(--card-raised,var(--card))] p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">
                            {b.car || 'Машина не указана'}
                            {b.plate && (
                              <span className="ml-2 font-mono text-xs text-[var(--fg-secondary,#5A6072)]">{b.plate}</span>
                            )}
                          </div>
                          <div className="text-sm text-[var(--fg-secondary,#5A6072)]">
                            {b.clientName}
                            <SourceBadge source={b.source} className="ml-1.5 align-middle" />
                          </div>
                          <div className="text-xs text-[var(--fg-secondary,#5A6072)]">
                            {b.date} · {b.time} · {b.box} · {isMain ? b.service : extras.map((a) => `+ ${a.name}`).join(', ')}
                          </div>
                          {extras.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {extras.map((a) => (
                                <span
                                  key={a.id}
                                  className="rounded-full bg-[var(--primary-50)] px-2 py-0.5 text-[11px] text-[var(--primary-700)] dark:bg-[var(--primary-100)] dark:text-[var(--primary-300)]"
                                >
                                  + {a.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <StatusBadge status={b.status} className="shrink-0" />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-xs text-[var(--fg-secondary,#5A6072)]">
                          Мастера: {b.workers.map((w) => w.workerName).join(', ')}
                        </div>
                        <span className="shrink-0 rounded-full bg-[var(--status-success-soft)] px-2 py-1 text-xs text-[var(--status-success)]">
                          ✓ {participationLabel(b)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
