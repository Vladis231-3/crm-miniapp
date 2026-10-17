import { useState } from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { useApp, type Service } from '../../../context/AppContext';
import { ServiceSearchInput } from '../../shared/ServiceSearchInput';
import { Button, Money } from '../../atmosfera';

export interface CatalogScreenProps {
  onSelectService: (service: Service) => void;
}

/**
 * CatalogScreen — вырезка из ClientApp (§6.1, Фаза 2).
 * Отличие от исходника: карточка цены через Money; классы на токенах.
 * Услуги показываются все, включая неактивные (текущее поведение — см. комментарий в AppContext).
 */
export function CatalogScreen({ onSelectService }: CatalogScreenProps) {
  const { services } = useApp();

  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');

  const categories = ['Все', ...Array.from(new Set(services.map((service) => service.category)))];
  const normalizedSearchQuery = serviceSearchQuery.trim().toLowerCase();
  const filteredServices = services.filter((service) => {
    if (activeCategory !== 'Все' && service.category !== activeCategory) return false;
    if (!normalizedSearchQuery) return true;
    return [service.name, service.category, service.desc].some(
      (v) => v && v.toLowerCase().includes(normalizedSearchQuery),
    );
  });

  return (
    <motion.div
      key="catalog"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22 }}
    >
      {/* Поиск */}
      <div className="px-4 pt-4">
        <ServiceSearchInput
          value={serviceSearchQuery}
          onChange={(v) => {
            setServiceSearchQuery(v);
            if (v.trim()) setActiveCategory('Все');
          }}
          inputCls="w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3 py-2.5 text-sm text-foreground placeholder:text-[var(--fg-muted,#8A91A0)] outline-none focus:border-[var(--ring)]"
          iconCls="text-[var(--fg-muted,#8A91A0)]"
        />
      </div>

      {/* Категории */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: 'none' }}>
        {categories.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] outline-none ${
                active ? 'text-white' : 'border border-border bg-[var(--card-raised,var(--card))] text-[var(--fg-secondary,#5A6072)]'
              }`}
              style={active ? { background: 'var(--primary-600)' } : undefined}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Услуги */}
      <div className="grid grid-cols-1 gap-3 px-4">
        {filteredServices.map((service, i) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-[var(--card)] p-4"
          >
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{service.name}</h3>
                <span className="mt-1 inline-block rounded-full bg-[var(--primary-50)] px-2 py-0.5 text-xs text-[var(--primary-700)] dark:text-[var(--primary-300)]">
                  {service.category}
                </span>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  <Money amount={service.price} />
                </div>
                <div className="mt-0.5 flex items-center justify-end gap-1 text-xs text-[var(--fg-secondary,#5A6072)]">
                  <Clock size={11} strokeWidth={1.75} aria-hidden />
                  {service.duration} мин
                </div>
              </div>
            </div>
            <p className="mb-3 line-clamp-2 text-sm text-[var(--fg-secondary,#5A6072)]">{service.desc}</p>
            <Button className="w-full" onClick={() => onSelectService(service)}>
              Записаться
            </Button>
          </motion.div>
        ))}
      </div>
      {filteredServices.length === 0 && services.length > 0 && (
        <div className="px-4 py-6 text-center text-sm text-[var(--fg-secondary,#5A6072)]">
          По запросу «{serviceSearchQuery.trim()}» услуг не найдено
        </div>
      )}
    </motion.div>
  );
}
