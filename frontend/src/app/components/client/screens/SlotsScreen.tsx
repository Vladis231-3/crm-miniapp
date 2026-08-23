import { motion } from 'motion/react';
import { useApp, type BookingSlotAvailability } from '../../../context/AppContext';
import { BoxRentPicker } from '../shared/BoxRentPicker';
import { Skeleton } from '../../shared/Skeleton';
import { StatTile } from '../../atmosfera';

export interface SlotsScreenProps {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  dateLabel: string;
  workingHoursLabel: string;
  isBoxRental: boolean;
  boxHours: number;
  onBoxHoursChange: (hours: number) => void;
  durationMinutes: number;
  price: number;
  availableCount: number;
  occupiedCount: number;
  isDetailing: boolean;
  slots: BookingSlotAvailability[];
  loading: boolean;
  loadingLabel?: string;
  emptyLabel?: string;
  selectedSlot: string | null;
  onSelectSlot: (time: string) => void;
}

/**
 * SlotsScreen — вырезка из ClientApp (§6.1, Фаза 2).
 * Данные availability грузятся в ClientApp (нужны флоу подтверждения и TG-кнопкам),
 * экран — презентационный. Слоты на токенах статусов вместо emerald/red-хардкодов.
 */
export function SlotsScreen({
  dates,
  selectedDate,
  onSelectDate,
  dateLabel,
  workingHoursLabel,
  isBoxRental,
  boxHours,
  onBoxHoursChange,
  durationMinutes,
  price,
  availableCount,
  occupiedCount,
  isDetailing,
  slots,
  loading,
  loadingLabel,
  emptyLabel,
  selectedSlot,
  onSelectSlot,
}: SlotsScreenProps) {
  const slotCards = slots.filter((slot) => slot.available || slot.occupiedBoxes > 0);

  return (
    <motion.div
      key="slots"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.22 }}
      className="px-4 py-4"
    >
      {/* Даты */}
      <div className="mb-4 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {dates.map((d) => {
          const active = selectedDate === d;
          return (
            <button
              key={d}
              onClick={() => onSelectDate(d)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] outline-none ${
                active
                  ? 'text-white'
                  : 'border border-border bg-[var(--card-raised,var(--card))] text-[var(--fg-secondary,#5A6072)]'
              }`}
              style={active ? { background: 'var(--primary-600)' } : undefined}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Аренда бокса */}
      {isBoxRental && (
        <div className="mb-4 rounded-2xl border border-border bg-[var(--card)] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Длительность аренды</div>
              <div className="mt-1 text-xs text-[var(--fg-secondary,#5A6072)]">
                Выберите, на сколько часов нужен бокс. Занятость ниже пересчитывается сразу.
              </div>
            </div>
            <div className="shrink-0 rounded-2xl bg-[var(--primary-50)] px-3 py-2 text-right text-[var(--primary-700)] dark:bg-[var(--primary-100)] dark:text-[var(--primary-300)]">
              <div className="text-base font-semibold">{boxHours} ч</div>
              <div className="text-[11px]">{price} ₽</div>
            </div>
          </div>
          <BoxRentPicker hours={boxHours} onChange={onBoxHoursChange} />
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Длительность" value={`${durationMinutes} мин`} />
            <StatTile label="Свободно" value={String(availableCount)} />
            <StatTile label="Занято" value={String(occupiedCount)} />
          </div>
        </div>
      )}

      {/* Часы работы */}
      <h3 className="mb-3 text-sm font-medium text-[var(--fg-secondary,#5A6072)]">Доступное время</h3>
      <div className="mb-4 rounded-2xl border border-border bg-[var(--card)] p-3">
        <div className="text-xs text-[var(--fg-secondary,#5A6072)]">Часы работы на {dateLabel}</div>
        <div className="mt-1 font-medium">{workingHoursLabel}</div>
      </div>

      {/* Сетка слотов */}
      {loading ? (
        <div className="mb-6 grid grid-cols-2 gap-3" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      ) : loadingLabel ? (
        <div className="mb-6 rounded-2xl border border-border bg-[var(--card)] p-4 text-sm text-[var(--fg-secondary,#5A6072)]">
          {loadingLabel}
        </div>
      ) : slotCards.length === 0 ? (
        <div className="mb-6 rounded-2xl border border-border bg-[var(--card)] p-4 text-sm text-[var(--fg-secondary,#5A6072)]">
          {emptyLabel ?? 'На выбранную дату подходящих слотов пока нет.'}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3">
          {slotCards.map((slot) => {
            const selected = selectedSlot === slot.time;
            const busy = !slot.available;
            return (
              <motion.button
                key={slot.time}
                onClick={() => {
                  if (busy) return;
                  onSelectSlot(slot.time);
                }}
                whileTap={!busy ? { scale: 0.96 } : undefined}
                animate={{ scale: selected ? 1.03 : 1 }}
                disabled={busy}
                className={`relative overflow-hidden rounded-2xl p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
                  busy ? 'cursor-not-allowed' : ''
                }`}
                style={
                  selected
                    ? { background: 'var(--primary-600)', color: '#fff' }
                    : undefined
                }
              >
                {!selected && (
                  <span
                    aria-hidden
                    className={`absolute inset-0 rounded-2xl border ${
                      busy
                        ? 'border-[color-mix(in_srgb,var(--status-danger)_45%,transparent)] bg-[color-mix(in_srgb,var(--status-danger)_8%,transparent)]'
                        : 'border-border bg-[var(--card-raised,var(--card))]'
                    }`}
                  />
                )}
                {busy && (
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-1 ${busy ? 'bg-[var(--status-danger)]' : ''}`}
                  />
                )}
                <span className={`relative flex items-start justify-between gap-3 ${selected ? 'text-white' : ''}`}>
                  <span>
                    <span className="block text-base font-semibold">{slot.time}</span>
                    <span className={`mt-1 block text-xs ${selected ? 'text-white/80' : 'text-[var(--fg-secondary,#5A6072)]'}`}>
                      {isDetailing
                        ? slot.available
                          ? 'Свободное окно детейлинга'
                          : 'Окно детейлинга занято'
                        : slot.available
                          ? `Свободно боксов: ${slot.freeBoxes}`
                          : `Занято боксов: ${slot.occupiedBoxes}`}
                    </span>
                    {busy && (
                      <span className="mt-2 block text-[11px] font-medium text-[var(--status-danger)]">
                        Это окно уже занято на выбранные {boxHours} ч
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                      selected
                        ? 'bg-white/20 text-white'
                        : busy
                          ? 'border border-[color-mix(in_srgb,var(--status-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--status-danger)_12%,transparent)] text-[var(--status-danger)]'
                          : 'bg-[var(--status-success-soft)] text-[var(--status-success)]'
                    }`}
                  >
                    {slot.available ? 'Свободно' : 'Занято'}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
