import { Droplets, Instagram, Facebook, Twitter } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ backgroundColor: '#030213' }} className="text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Droplets size={17} className="text-white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>ATMOSFERA</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, maxWidth: '22rem' }}>
              Профессиональный детейлинг-центр в Казани.</p>
            <div className="flex gap-3 mt-5">
              {[Instagram, Facebook, Twitter].map((Icon, i) => (
                <button key={i}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-blue-600 flex items-center justify-center transition-colors cursor-pointer border-none">
                  <Icon size={16} className="text-white" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem' }}>Услуги</h4>
            <ul className="space-y-2.5">
              {['Экспресс-мойка', 'Детейлинг салона', 'Полировка', 'Керамика'].map((item) => (
                <li key={item}>
                  <button onClick={() => document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-transparent border-none p-0 cursor-pointer text-left hover:text-blue-400 transition-colors"
                    style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{item}</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem' }}>Компания</h4>
            <ul className="space-y-2.5">
              {['О нас', 'Контакты'].map((item) => (
                <li key={item}>
                  <button onClick={() => item === 'О нас' ? window.location.href = window.location.origin + '/about' : document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-transparent border-none p-0 cursor-pointer text-left hover:text-blue-400 transition-colors"
                    style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{item}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' }}>© {year} ATMOSFERA. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
