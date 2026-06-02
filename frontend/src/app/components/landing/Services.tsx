import { Check, ArrowRight } from 'lucide-react';
import type { ContentService } from '../../context/AppContext';

const FALLBACK_SERVICES: ContentService[] = [
  { title: 'Экспресс-мойка', subtitle: 'Быстро и качественно', description: 'Тщательная наружная мойка и ручная сушка.', price: 'от 1 900 ₽', category: '', accent: '#2563eb', image: '', features: ['Пенная обработка', 'Мойка высоким давлением', 'Ручная сушка', 'Чистка стёкол'] },
  { title: 'Полный детейлинг салона', subtitle: 'Глубокая очистка', description: 'Комплексное восстановление салона.', price: 'от 8 900 ₽', category: '', accent: '#7c3aed', image: '', features: ['Полная пылесос', 'Паровая санизация', 'Обработка кожи', 'Удаление запахов'] },
  { title: 'Полировка и воск', subtitle: 'Восстановление и защита', description: 'Многоэтапная машинная полировка.', price: 'от 14 900 ₽', category: '', accent: '#059669', image: '', features: ['Удаление паутинки', 'Машинная полировка', 'Воск Carnauba', 'Защита ЛКП'] },
  { title: 'Керамическое покрытие', subtitle: 'Долговременная защита', description: 'Профессиональное 9H керамическое покрытие.', price: 'от 59 900 ₽', category: '', accent: '#d97706', image: '', features: ['Твёрдость 9H', 'Гарантия 5 лет', 'UV-защита', 'Эффект самоочистки'] },
  { title: 'Детейлинг колёс', subtitle: 'Полный уход за колёсами', description: 'Удаление железных включений и покрытие шин.', price: 'от 4 900 ₽', category: '', accent: '#dc2626', image: '', features: ['Удаление ж/в', 'Бескислотная чистка', 'Покрытие шин', 'Чистка суппортов'] },
  { title: 'Полный пакет', subtitle: 'Максимальный уход', description: 'Полный комплекс детейлинга.', price: 'от 29 900 ₽', category: '', accent: '#0284c7', image: '', features: ['Полный экстерьер', 'Детейлинг салона', 'Коррекция ЛКП', 'Защита на 12 мес'] },
];

export function Services({ onBook, apiServices }: { onBook: (service: string) => void; apiServices: ContentService[] }) {
  const services = apiServices.length > 0 ? apiServices : FALLBACK_SERVICES;

  return (
    <section id="services" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full mb-4"
            style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>НАШИ УСЛУГИ</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Всё для вашего автомобиля</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto" style={{ fontSize: '1rem', lineHeight: 1.7 }}>
            От быстрой мойки до полного восстановления.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {services.map((svc, i) => <ServiceCard key={i} {...svc} onBook={onBook} />)}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ title, subtitle, description, price, features, accent, onBook }: ContentService & { onBook: (service: string) => void }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col group border border-gray-100">
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-1" style={{ color: accent, fontSize: '0.75rem', fontWeight: 700 }}>{subtitle}</div>
        <h3 className="text-gray-900 mb-2" style={{ fontWeight: 700, fontSize: '1.15rem' }}>{title}</h3>
        <p className="text-gray-500 mb-5 flex-1" style={{ fontSize: '0.875rem', lineHeight: 1.65 }}>{description}</p>
        <div className="mb-4"><span className="text-2xl font-bold">{price}</span></div>
        {features.length > 0 && (
          <ul className="space-y-1.5 mb-6">
            {features.map((f, fi) => (
              <li key={fi} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}18` }}>
                  <Check size={10} style={{ color: accent }} strokeWidth={3} />
                </div>
                <span className="text-gray-600" style={{ fontSize: '0.8rem', fontWeight: 500 }}>{f}</span>
              </li>
            ))}
          </ul>
        )}
        <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border transition-colors duration-200 cursor-pointer"
          style={{ borderColor: accent, color: accent, fontWeight: 600, fontSize: '0.875rem' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = accent; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = accent; }}
          onClick={() => onBook(title)}>
          Записаться <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
