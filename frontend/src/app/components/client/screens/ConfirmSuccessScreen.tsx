import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Button, Card, Money, SummaryRows } from '../../atmosfera';

export interface ConfirmSuccessScreenProps {
  serviceName: string;
  date: string;
  time: string | null;
  price: number;
  durationMinutes: number;
  onGoHome: () => void;
  onMyBookings: () => void;
}

/**
 * ConfirmSuccessScreen — вырезка из ClientApp (§6.1).
 * Девиация по плану: декоративная «Добавить в календарь» удалена
 * (ничего не делала, CA:280–286) — вместо неё честная «Мои записи».
 */
export function ConfirmSuccessScreen({
  serviceName,
  date,
  time,
  price,
  durationMinutes,
  onGoHome,
  onMyBookings,
}: ConfirmSuccessScreenProps) {
  return (
    <motion.div
      key="confirm"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center px-4 py-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-6 flex size-20 items-center justify-center rounded-full bg-[var(--primary-50)] dark:bg-[var(--primary-100)]"
      >
        <Check size={36} strokeWidth={1.75} style={{ color: 'var(--primary-600)' }} aria-hidden />
      </motion.div>
      <h2 className="mb-2 text-center text-xl font-semibold">Заявка отправлена!</h2>
      <p className="mb-6 text-center text-sm text-[var(--fg-secondary,#5A6072)]">
        Администратор подтвердит время  -  уведомление придёт в Telegram и здесь
      </p>
      <Card className="mb-6 w-full p-4">
        <SummaryRows
          rows={[
            { label: 'Услуга', value: serviceName },
            { label: 'Дата', value: date },
            { label: 'Время', value: time || ' - ' },
            { label: 'Стоимость', value: <Money amount={price} /> },
            { label: 'Длительность', value: `${durationMinutes} мин` },
          ]}
        />
      </Card>
      <div className="w-full space-y-3">
        <Button size="lg" onClick={onMyBookings}>
          Мои записи
        </Button>
        <Button size="lg" variant="ghost" onClick={onGoHome}>
          На главную
        </Button>
      </div>
    </motion.div>
  );
}
