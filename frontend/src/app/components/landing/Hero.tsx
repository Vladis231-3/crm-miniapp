import { ChevronDown, Star, Clock, Shield } from 'lucide-react';
import type { ContentHero } from '../../context/AppContext';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/') && API_BASE) return `${API_BASE}${url}`;
  return url;
}

const FALLBACK_HERO: ContentHero = {
  backgroundImage: '/hero-bg.jpg',
  badgeText: 'ATMOSFERA ДЕТЕЙЛИНГ',
  title: 'Ваш автомобиль заслуживает лучшего ухода',
  titleHighlight: 'лучшего',
  subtitle: 'Премиум мойка и детейлинг для безупречного блеска вашего авто.',
  button1Text: 'Наши услуги',
  button1Action: 'services',
  button2Text: 'Записаться',
  button2Action: 'contact',
  stats: [
    { value: '4.9', label: 'Средний рейтинг' },
    { value: '15 мин', label: 'Экспресс-мойка' },
    { value: '100%', label: 'Довольных клиентов' },
  ],
};

const STAT_ICONS = [Star, Clock, Shield];

function scrollToSection(action: string) {
  const id = action || 'services';
  document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth' });
}

export function Hero({ content }: { content?: { hero?: ContentHero } | null }) {
  const h = content?.hero || FALLBACK_HERO;
  const bg = h.backgroundImage || FALLBACK_HERO.backgroundImage;
  const stats = h.stats.length >= 3 ? h.stats : FALLBACK_HERO.stats;

  const titleParts = h.titleHighlight
    ? h.title.split(h.titleHighlight)
    : [h.title];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={resolveImageUrl(bg)} alt="Профессиональный детейлинг" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 w-full">
        <div className="max-w-xl">
          {h.badgeText && (
            <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-400/30 text-blue-300 px-4 py-1.5 rounded-full mb-6"
              style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}>
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              {h.badgeText}
            </div>
          )}

          <h1 className="text-white mb-5"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            {h.titleHighlight && titleParts.length > 1 ? (
              <>{titleParts[0]}<span className="text-blue-400">{h.titleHighlight}</span>{titleParts.slice(1).join(h.titleHighlight)}</>
            ) : (
              h.title
            )}
          </h1>

          {h.subtitle && (
            <p className="text-white/70 mb-10" style={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
              {h.subtitle}
            </p>
          )}

          <div className="flex flex-wrap gap-4 mb-16">
            <button onClick={() => scrollToSection(h.button1Action)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer border-none"
              style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {h.button1Text || FALLBACK_HERO.button1Text}
            </button>
            <button onClick={() => scrollToSection(h.button2Action)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/25 px-8 py-3.5 rounded-xl transition-all duration-200 cursor-pointer"
              style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {h.button2Text || FALLBACK_HERO.button2Text}
            </button>
          </div>

          <div className="flex flex-wrap gap-8">
            {stats.map((stat, i) => {
              const Icon = STAT_ICONS[i] || Star;
              return (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center">
                    <Icon size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="text-white" style={{ fontWeight: 700, fontSize: '1rem' }}>{stat.value}</div>
                    <div className="text-white/50" style={{ fontSize: '0.75rem' }}>{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button onClick={() => scrollToSection(h.button1Action)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors animate-bounce cursor-pointer bg-transparent border-none"
        aria-label="Scroll down">
        <ChevronDown size={28} />
      </button>
    </section>
  );
}
