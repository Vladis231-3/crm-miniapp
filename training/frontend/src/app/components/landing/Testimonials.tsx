import { Star, Quote } from 'lucide-react';

const reviews = [
  { id: 1, name: 'Дмитрий Соколов', role: 'BMW M3', avatar: 'ДС', rating: 5, text: 'Керамическое покрытие просто невероятное. Вода скатывается моментально.', color: '#2563eb' },
  { id: 2, name: 'Анна Кузнецова', role: 'Porsche 911', avatar: 'АК', rating: 5, text: 'Приехала на обычную мойку, а уехала в полном восторге.', color: '#7c3aed' },
  { id: 3, name: 'Артём Фёдоров', role: 'Range Rover', avatar: 'АФ', rating: 5, text: 'Полный пакет преобразил мой Range Rover. Каждая копейка оправдана.', color: '#059669' },
  { id: 4, name: 'Елена Морозова', role: 'Tesla Model S', avatar: 'ЕМ', rating: 5, text: 'Быстро, профессионально, качественно. Единственное место, которому доверяю свою Tesla.', color: '#d97706' },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full mb-4"
            style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>ОТЗЫВЫ</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Что говорят клиенты</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: review.color, fontWeight: 700, fontSize: '0.9rem' }}>{review.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{review.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{review.role}</div>
                  </div>
                </div>
                <Quote size={20} className="text-gray-200" />
              </div>
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-600" style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>"{review.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
