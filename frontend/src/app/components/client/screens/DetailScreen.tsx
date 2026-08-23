import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { BoxRentPicker } from '../shared/BoxRentPicker';
import { Button, Money, Textarea } from '../../atmosfera';

export interface DetailScreenProps {
  serviceName: string;
  serviceCategory: string;
  serviceDesc: string;
  durationMinutes: number;
  price: number;
  /** Автомобили для записи (из профиля). */
  vehicles: Array<{ car: string; plate: string }>;
  vehicleIndex: number;
  onVehicleIndexChange: (index: number) => void;
  isBoxRental: boolean;
  isDetailing: boolean;
  boxHours?: number;
  onBoxHoursChange?: (hours: number) => void;
  note?: string;
  onNoteChange?: (note: string) => void;
  onNext: () => void;
}

/**
 * ServiceDetailScreen — вырезка из ClientApp (§6.1, Фаза 2).
 * Состояния аренды/комментария живут в ClientApp (нужны флоу подтверждения) —
 * экран получает их через props. Пикер часов — общий BoxRentPicker.
 */
export function DetailScreen({
  serviceName,
  serviceCategory,
  serviceDesc,
  durationMinutes,
  price,
  vehicles,
  vehicleIndex,
  onVehicleIndexChange,
  isBoxRental,
  isDetailing,
  boxHours,
  onBoxHoursChange,
  note,
  onNoteChange,
  onNext,
}: DetailScreenProps) {
  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.22 }}
      className="px-4 py-4"
    >
      <div className="mb-4 rounded-2xl border border-border bg-[var(--card)] p-5">
        <div
          className="mb-4 flex h-32 w-full items-center justify-center rounded-xl bg-[var(--primary-50)] dark:bg-[var(--primary-100)]"
        >
          <Star size={40} strokeWidth={1.75} style={{ color: 'var(--primary-600)' }} aria-hidden />
        </div>
        <h2 className="mb-1 text-xl font-semibold">{serviceName}</h2>
        <span className="mb-3 inline-block rounded-full bg-[var(--primary-50)] px-2 py-0.5 text-xs text-[var(--primary-700)] dark:text-[var(--primary-300)]">
          {serviceCategory}
        </span>
        <p className="mb-4 text-sm text-[var(--fg-secondary,#5A6072)]">{serviceDesc}</p>
        <div className="flex gap-4">
          <div className="flex-1 rounded-xl bg-[var(--sunken,#EEEFF3)] p-3 text-center dark:bg-white/5">
            <div className="font-semibold">
              <Money amount={price} />
            </div>
            <div className="text-xs text-[var(--fg-secondary,#5A6072)]">Стоимость</div>
          </div>
          <div className="flex-1 rounded-xl bg-[var(--sunken,#EEEFF3)] p-3 text-center dark:bg-white/5">
            <div className="font-semibold">{durationMinutes} мин</div>
            <div className="text-xs text-[var(--fg-secondary,#5A6072)]">Длительность</div>
          </div>
        </div>
      </div>

      {vehicles.length > 0 && (
        <div className="mb-4 rounded-2xl border border-border bg-[var(--card)] p-4">
          <div className="mb-2 text-sm font-medium">Автомобиль для записи</div>
          <select
            value={vehicleIndex}
            onChange={(event) => onVehicleIndexChange(Number(event.target.value))}
            className="w-full rounded-2xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3 py-3 text-sm text-foreground outline-none focus:border-[var(--ring)] dark:bg-white/[.06]"
          >
            {vehicles.map((vehicle, index) => (
              <option key={`booking-vehicle-${index}`} value={index}>
                {vehicle.car || 'Автомобиль'}
                {vehicle.plate ? ` - ${vehicle.plate}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {isBoxRental && boxHours !== undefined && onBoxHoursChange && (
        <div className="mb-4 rounded-2xl border border-border bg-[var(--card)] p-4">
          <div className="mb-3 text-sm font-medium">Сколько часов нужен бокс</div>
          <BoxRentPicker
            hours={boxHours}
            onChange={onBoxHoursChange}
            totalMinutes={durationMinutes}
            totalPrice={price}
            className="mb-0"
          />
        </div>
      )}

      {isDetailing && onNoteChange && (
        <div className="mb-4 rounded-2xl border border-border bg-[var(--card)] p-4">
          <div className="mb-2 text-sm font-medium">Комментарий к детейлингу</div>
          <p className="mb-3 text-sm text-[var(--fg-secondary,#5A6072)]">
            Можно сразу описать состояние авто, пожелания или важные детали по работе.
          </p>
          <Textarea
            value={note ?? ''}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Опишите задачу, состояние авто или удобный способ связи"
            className="min-h-[104px] rounded-2xl"
          />
        </div>
      )}

      <Button size="lg" onClick={onNext}>
        Выбрать время
      </Button>
    </motion.div>
  );
}
