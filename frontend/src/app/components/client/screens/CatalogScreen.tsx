import { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, Search } from 'lucide-react';
import { useApp, type Service, type Booking } from '../../../context/AppContext';
import { Money } from '../../atmosfera';

export interface CatalogScreenProps {
  onSelectService: (service: Service) => void;
  /** Ближайшая предстоящая запись клиента — панель next-booking из макета. */
  nextBooking?: Booking | null;
}

const SERVICE_SYMBOL = ['💧', '✨', '🧼', '🅿', '🛞', '🔧'];

function symbolFor(service: Service, index: number): string {
  if (service.category === 'Аренда бокса') return '🅿';
  return SERVICE_SYMBOL[index % SERVICE_SYMBOL.length];
}

/**
 * CatalogScreen — «Главная» клиента в стиле дизайн-макета (fa/):
 * hero (client-hero) + ближайшая запись (next-booking) + сетка услуг (.service-grid).
 * Услуги показываются все, включая неактивные (текущее поведение — см. комментарий в AppContext).
 */
export function CatalogScreen({ onSelectService, nextBooking }: CatalogScreenProps) {
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

  const manualScheduling = nextBooking ? nextBooking.status === 'admin_review' && (!nextBooking.time || nextBooking.time === '00:00') : false;

  return (
    <motion.div
      key="catalog"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="page-content px-4"
    >
      {/* HERO */}
      <div className="client-hero">
        <div className="hero-orbit" aria-hidden />
        <h2>Время для Вашего авто</h2>
        <p>Выберите услугу и удобное время — запись займёт минуту, остальное возьмём на себя.</p>
      </div>

      {/* Ближайшая запись */}
      {nextBooking && (
        <button type="button" className="panel next-booking" style={{ marginTop: 18 }} onClick={() => {}} aria-label="Мои записи">
          <span className="service-symbol" style={{ width: 46, height: 46, fontSize: 18 }} aria-hidden>🗓</span>
          <span>
            <strong style={{ fontSize: 13 }}>
              {manualScheduling ? 'Ожидайте подтверждения' : `${nextBooking.date} · ${nextBooking.time}`}
            </strong>
            <p>{nextBooking.service}</p>
          </span>
        </button>
      )}

      {/* ЗАГОЛОВОК + ПОИСК */}
      <div className="section-title" style={{ marginTop: 24 }}>
        <h2>
          Услуги
          <span className="count">{filteredServices.length}</span>
        </h2>
      </div>

      <div className="relative" style={{ marginBottom: 10 }}>
        <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#98a19a]" aria-hidden />
        <input
          value={serviceSearchQuery}
          onChange={(event) => setServiceSearchQuery(event.target.value)}
          placeholder="Поиск услуги"
          aria-label="Поиск услуги"
        />
      </div>

      {/* КАТЕГОРИИ */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {categories.map((category) => {
          const active = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className="shrink-0 rounded-[6px] border px-3 py-2 text-[12px] transition-colors outline-none"
              style={
                active
                  ? { background: '#315f45', borderColor: '#315f45', color: '#fff' }
                  : { background: '#fff', borderColor: '#e1e7e1', color: '#6a7b6e' }
              }
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* СЕТКА УСЛУГ */}
      <div className="personal-app service-grid" style={{ marginTop: 16 }}>
        {filteredServices.map((service, index) => (
          <motion.button
            key={service.id}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.3) }}
            onClick={() => onSelectService(service)}
            className="panel service-card"
          >
            <span className="service-symbol" aria-hidden>{symbolFor(service, index)}</span>
            <small style={{ textTransform: 'uppercase' }}>{service.category}</small>
            <strong style={{ marginTop: 0 }}>{service.name}</strong>
            <p>{service.desc}</p>
            <strong>
              <Money amount={service.price} /> <span>· {service.duration} мин</span>
            </strong>
            <Clock size={15} strokeWidth={1.75} color="#92ab79" aria-hidden />
          </motion.button>
        ))}
      </div>

      {filteredServices.length === 0 && services.length > 0 && (
        <div className="empty">
          <span aria-hidden>🔍</span>
          <p>По запросу «{serviceSearchQuery.trim()}» ничего не найдено</p>
        </div>
      )}
      {services.length === 0 && (
        <div className="empty">
          <span aria-hidden>📅</span>
          <p>Каталог услуг появится совсем скоро</p>
        </div>
      )}
    </motion.div>
  );
}
