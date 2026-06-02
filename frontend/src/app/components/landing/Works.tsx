import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn } from 'lucide-react';
import type { ContentWorks } from '../../context/AppContext';

const FALLBACK_WORKS: (ContentWorks & { span?: string })[] = [
  { title: 'Полный детейлинг купе', description: 'Чёрный BMW M4 — восстановление ЛКП, керамика 9H', image_url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', span: 'col-span-2 row-span-2' },
  { title: 'Пенная обработка', description: 'Наружная мойка премиум-класса', image_url: 'https://images.unsplash.com/photo-1608506375591-b90e1f955e4b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', span: '' },
  { title: 'Детейлинг колёс', description: 'Полная чистка и покрытие шин', image_url: 'https://images.unsplash.com/photo-1565689876697-e467b6c54da2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', span: '' },
  { title: 'Кожаный салон', description: 'Химчистка и кондиционирование кожи', image_url: 'https://images.unsplash.com/photo-1605437241278-c1806d14a4d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', span: '' },
  { title: 'Руль после реставрации', description: 'Восстановление и защита', image_url: 'https://images.unsplash.com/photo-1533630217389-3a5e4dff5683?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', span: '' },
  { title: 'Mustang — после детейлинга', description: 'Белый Ford Mustang, полный пакет услуг', image_url: 'https://images.unsplash.com/photo-1575844611398-2a68400b437c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', span: 'col-span-2' },
];

export function Works({ apiWorks }: { apiWorks: ContentWorks[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const items = apiWorks.length > 0 ? apiWorks.map(w => ({ ...w, span: '' })) : FALLBACK_WORKS;

  return (
    <section id="gallery" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full mb-4"
            style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>ПОРТФОЛИО</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Наши работы</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto" style={{ fontSize: '1rem', lineHeight: 1.7 }}>
            Каждый автомобиль, покидающий нашу студию, выглядит как с конвейера премиум-бренда.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] md:auto-rows-[220px] gap-3">
          {items.map((item, i) => (
            <motion.div
              key={i}
              className={`relative overflow-hidden rounded-xl cursor-pointer group ${(item as any).span || ''}`}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              onClick={() => setLightbox(i)}
            >
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-sm font-medium">{item.title}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors z-10 cursor-pointer bg-transparent border-none"
              onClick={() => setLightbox(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img
              src={items[lightbox].image_url}
              alt={items[lightbox].title}
              className="max-w-full max-h-full object-contain rounded-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-8 left-0 right-0 text-center text-white/60 text-sm px-6">
              {items[lightbox].title}{items[lightbox].description ? ` — ${items[lightbox].description}` : ''}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
