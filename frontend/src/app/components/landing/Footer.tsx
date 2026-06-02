import { Droplets, Instagram } from 'lucide-react';

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
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-blue-600 flex items-center justify-center transition-colors">
                <Instagram size={16} className="text-white" />
              </a>
              <a href="https://t.me/system_polish" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#229ED9] flex items-center justify-center transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="white"/></svg>
              </a>
              <a href="https://wa.me/7XXXXXXXXXX" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#25D366] flex items-center justify-center transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12.031 2C6.513 2 2 6.515 2 12.031c0 2.042.611 3.928 1.657 5.52L2 22l4.514-1.622A9.97 9.97 0 0 0 12.031 22C17.547 22 22 17.485 22 12.031S17.547 2 12.031 2Zm4.305 14.622a1.14 1.14 0 0 1-.826.585c-.352.031-.703.031-1.054-.063a3.59 3.59 0 0 1-.773-.36 5.637 5.637 0 0 1-3.027-2.719 3.776 3.776 0 0 1-.445-1.126c0-.156.039-.305.11-.446.101-.18.211-.36.305-.546.14-.201.195-.451.164-.688a4.96 4.96 0 0 0-.258-.813c-.06-.211-.153-.407-.273-.586l-.68-.96c-.204-.288-.489-.486-.805-.578-.36-.102-.727-.125-1.094-.078-.274.063-.535.165-.766.313-.546.344-1.015.79-1.367 1.332-.437.648-.585 1.383-.508 2.148.102.75.328 1.469.664 2.136a9.72 9.72 0 0 0 2.672 3.328c.758.579 1.602 1.031 2.5 1.336.406.141.825.242 1.25.305.48.078.97.063 1.446-.031.485-.11.934-.313 1.321-.618.414-.328.746-.719 1.117-1.078.367-.374.57-.774.617-1.246.04-.446-.087-.868-.399-1.204a2.68 2.68 0 0 0-.46-.414c-.195-.14-.36-.305-.523-.477"/></svg>
              </a>
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
