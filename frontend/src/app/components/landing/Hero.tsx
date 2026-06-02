import { ChevronDown, Star, Clock, Shield } from 'lucide-react';

const HERO_IMG = '/hero-bg.jpg';

const stats = [
  { icon: Star, value: '4.9', label: 'Средний рейтинг' },
  { icon: Clock, value: '15 мин', label: 'Экспресс-мойка' },
  { icon: Shield, value: '100%', label: 'Довольных клиентов' },
];

export function Hero({ content }: { content?: { about?: { text?: string; features?: string[] } } | null }) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={HERO_IMG} alt="Профессиональный детейлинг" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 w-full">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-400/30 text-blue-300 px-4 py-1.5 rounded-full mb-6"
            style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}>
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            ATMOSFERA ДЕТЕЙЛИНГ
          </div>

          <h1 className="text-white mb-5"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Ваш автомобиль заслуживает <span className="text-blue-400">лучшего</span> ухода
          </h1>

          <p className="text-white/70 mb-10" style={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
            Премиум мойка и детейлинг для безупречного блеска вашего авто.
          </p>

          <div className="flex flex-wrap gap-4 mb-16">
            <button onClick={() => document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer border-none"
              style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Наши услуги
            </button>
            <button onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/25 px-8 py-3.5 rounded-xl transition-all duration-200 cursor-pointer"
              style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              Записаться
            </button>
          </div>

          <div className="flex flex-wrap gap-8">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center">
                  <Icon size={18} className="text-blue-400" />
                </div>
                <div>
                  <div className="text-white" style={{ fontWeight: 700, fontSize: '1rem' }}>{value}</div>
                  <div className="text-white/50" style={{ fontSize: '0.75rem' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' })}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors animate-bounce cursor-pointer bg-transparent border-none"
        aria-label="Scroll down">
        <ChevronDown size={28} />
      </button>
    </section>
  );
}
